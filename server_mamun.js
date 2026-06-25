const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'mamun_socks_secret_key_default';

// Express Middleware
app.use(cors());
app.use(express.json());

// Create Uploads Folder in Backend
const uploadDir = path.join(__dirname, 'uploads-mamun-socks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Serve static uploads
app.use('/uploads-mamun-socks', express.static(uploadDir));

// Database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mamun_socks',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection and initialize tables
db.getConnection()
  .then(async (conn) => {
    console.log('Database connected successfully!');
    try {
      // Auto-create settings table if not exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`settings\` (
          \`key\` VARCHAR(50) PRIMARY KEY,
          \`value\` TEXT NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      // Seed default WhatsApp number and contact info if empty
      await conn.query(`
        INSERT IGNORE INTO \`settings\` (\`key\`, \`value\`) VALUES 
        ('whatsapp_number', '6281234567890'),
        ('contact_address', 'Sukawangi kaler no 126 jelegong kutawaringin kabupaten bandung'),
        ('contact_email', ''),
        ('contact_phone', '');
      `);
      console.log('Settings table and seed checked/initialized successfully.');

      // Auto-create payment_methods table if not exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`payment_methods\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL,
          \`type\` ENUM('bank', 'qris') NOT NULL,
          \`account_number\` VARCHAR(50) DEFAULT NULL,
          \`account_name\` VARCHAR(100) DEFAULT NULL,
          \`qr_code_image\` VARCHAR(255) DEFAULT NULL,
          \`is_active\` TINYINT DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      // Seed default payment methods if empty
      const [pmCount] = await conn.query('SELECT COUNT(*) as count FROM payment_methods');
      if (pmCount[0].count === 0) {
        await conn.query(`
          INSERT INTO \`payment_methods\` (\`name\`, \`type\`, \`account_number\`, \`account_name\`, \`qr_code_image\`) VALUES
          ('Transfer Bank BCA', 'bank', '1234567890', 'Mamun Socks', NULL),
          ('QRIS ShopeePay', 'qris', NULL, NULL, '/uploads-mamun-socks/qris-dummy.png')
        `);
        console.log('Default payment methods seeded.');
      }

      // Check if price column exists in product_variants table
      const [columns] = await conn.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'product_variants' 
          AND COLUMN_NAME = 'price'
      `);
      if (columns.length === 0) {
        console.log('Migrating product_variants table to support specific pricing...');
        await conn.query(`
          ALTER TABLE \`product_variants\` ADD COLUMN \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00;
        `);
        await conn.query(`
          UPDATE \`product_variants\` pv 
          JOIN \`products\` p ON pv.product_id = p.id 
          SET pv.price = p.price;
        `);
        console.log('Migration of product_variants completed successfully.');
      }

      // Check if shipping_cost column exists in orders table
      const [orderCols] = await conn.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'orders' 
          AND COLUMN_NAME = 'shipping_cost'
      `);
      if (orderCols.length === 0) {
        console.log('Migrating orders table to support shipping and payment...');
        await conn.query(`
          ALTER TABLE \`orders\` 
          ADD COLUMN \`shipping_cost\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          ADD COLUMN \`shipping_courier\` VARCHAR(50) DEFAULT NULL,
          ADD COLUMN \`shipping_service\` VARCHAR(50) DEFAULT NULL,
          ADD COLUMN \`shipping_etd\` VARCHAR(50) DEFAULT NULL,
          ADD COLUMN \`payment_method_id\` INT DEFAULT NULL,
          ADD COLUMN \`payment_method_name\` VARCHAR(100) DEFAULT NULL,
          ADD COLUMN \`payment_receipt\` VARCHAR(255) DEFAULT NULL;
        `);
        console.log('Migration of orders table completed successfully.');
      }

      // Client features migration: weight, SKU, cost_price, variant image, tiers, recipient, COD
      const migrateColumn = async (table, column, definition) => {
        const [cols] = await conn.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
        `, [table, column]);
        if (cols.length === 0) {
          await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
          console.log(`Migrated ${table}: added ${column}`);
        }
      };

      await migrateColumn('products', 'weight', '`weight` DECIMAL(10,2) NOT NULL DEFAULT 100.00 AFTER `price`');
      await migrateColumn('products', 'length', '`length` DECIMAL(10,2) DEFAULT NULL AFTER `weight`');
      await migrateColumn('products', 'width', '`width` DECIMAL(10,2) DEFAULT NULL AFTER `length`');
      await migrateColumn('products', 'height', '`height` DECIMAL(10,2) DEFAULT NULL AFTER `width`');
      await migrateColumn('product_variants', 'sku', '`sku` VARCHAR(50) DEFAULT NULL AFTER `product_id`');
      await migrateColumn('product_variants', 'cost_price', '`cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `price`');
      await migrateColumn('product_variants', 'image', '`image` VARCHAR(255) DEFAULT NULL AFTER `cost_price`');
      await migrateColumn('product_variants', 'weight', '`weight` DECIMAL(10,2) DEFAULT NULL AFTER `image`');
      await migrateColumn('product_variants', 'length', '`length` DECIMAL(10,2) DEFAULT NULL AFTER `weight`');
      await migrateColumn('product_variants', 'width', '`width` DECIMAL(10,2) DEFAULT NULL AFTER `length`');
      await migrateColumn('product_variants', 'height', '`height` DECIMAL(10,2) DEFAULT NULL AFTER `width`');
      await migrateColumn('orders', 'recipient_name', '`recipient_name` VARCHAR(100) DEFAULT NULL AFTER `shipping_address`');
      await migrateColumn('orders', 'recipient_phone', '`recipient_phone` VARCHAR(20) DEFAULT NULL AFTER `recipient_name`');
      await migrateColumn('orders', 'shipping_cod', '`shipping_cod` TINYINT NOT NULL DEFAULT 0 AFTER `shipping_etd`');
      await migrateColumn('orders', 'product_total', '`product_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `total_amount`');
      await migrateColumn('orders', 'shipping_cost_original', '`shipping_cost_original` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `shipping_cost`');
      await migrateColumn('order_items', 'sku', '`sku` VARCHAR(50) DEFAULT NULL AFTER `variant_id`');
      await migrateColumn('order_items', 'cost_price', '`cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `price`');
      await migrateColumn('orders', 'shipping_receipt', '`shipping_receipt` VARCHAR(255) DEFAULT NULL AFTER `payment_receipt`');

      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`pricing_tiers\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`variant_id\` INT NOT NULL,
          \`min_qty\` INT NOT NULL DEFAULT 1,
          \`max_qty\` INT NOT NULL DEFAULT 999999,
          \`price\` DECIMAL(10,2) NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Backfill SKU for existing variants
      await conn.query(`
        UPDATE product_variants SET sku = CONCAT('MSK-', LPAD(product_id, 3, '0'), '-', LPAD(id, 4, '0'))
        WHERE sku IS NULL OR sku = ''
      `);
      console.log('Client features migration checked.');
    } catch (dbErr) {
      console.error('Failed to initialize database tables:', dbErr.message);
    } finally {
      conn.release();
    }
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

// Setup multer for multiple image & single video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and video files are allowed!'));
  }
});

// ==========================================
// MIDDLEWARES
// ==========================================

// Authenticate JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Authorize Roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
};

// Generate SKU for variant
const generateSku = (productId, variantId) => {
  return `MSK-${String(productId).padStart(3, '0')}-${String(variantId).padStart(4, '0')}`;
};

// Validate custom SKU uniqueness
const resolveVariantSku = async (customSku, variantId, productId, conn) => {
  const trimmed = (customSku || '').trim();
  if (trimmed) {
    const [existing] = await conn.query(
      'SELECT id FROM product_variants WHERE sku = ? AND id != ?',
      [trimmed, variantId || 0]
    );
    if (existing.length > 0) {
      throw new Error(`SKU "${trimmed}" sudah digunakan oleh variasi lain.`);
    }
    return trimmed;
  }
  if (variantId) {
    return generateSku(productId, variantId);
  }
  return null;
};

// Resolve sell price by quantity (wholesale tiers)
const resolveVariantPrice = async (variant, quantity, conn) => {
  const [tiers] = await conn.query(
    `SELECT price FROM pricing_tiers 
     WHERE variant_id = ? AND min_qty <= ? AND max_qty >= ? 
     ORDER BY min_qty DESC LIMIT 1`,
    [variant.id, quantity, quantity]
  );
  if (tiers.length > 0) {
    return parseFloat(tiers[0].price);
  }
  const variantPrice = parseFloat(variant.price);
  if (variantPrice > 0) return variantPrice;
  return parseFloat(variant.base_price || 0);
};

// Fetch pricing tiers for variants
const attachPricingTiers = async (variants, conn = db) => {
  for (let variant of variants) {
    const [tiers] = await conn.query(
      'SELECT id, min_qty, max_qty, price FROM pricing_tiers WHERE variant_id = ? ORDER BY min_qty ASC',
      [variant.id]
    );
    variant.pricing_tiers = tiers;
  }
  return variants;
};

// Helper: Validate Date Sync Constraint (Cannot go backwards in date)
// "pastikan tanggal sinkron gaboleh ada yang mundur 1 tanggal."
const validateDateSync = async (targetDateString, connection = db) => {
  if (!targetDateString) return { valid: false, message: 'Date is required.' };

  const targetDate = new Date(targetDateString);
  if (isNaN(targetDate.getTime())) {
    return { valid: false, message: 'Invalid date format.' };
  }

  // Get max date from orders and stock_logs
  const [rows] = await connection.query(`
    SELECT MAX(max_date) as last_date FROM (
      SELECT MAX(order_date) as max_date FROM orders
      UNION ALL
      SELECT MAX(log_date) as max_date FROM stock_logs
    ) as combined
  `);

  const lastDateStr = rows[0]?.last_date;
  if (!lastDateStr) return { valid: true }; // Empty database, date is valid

  const lastDate = new Date(lastDateStr);

  // Extract date component (YYYY-MM-DD)
  const lastDateOnly = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (targetDateOnly < lastDateOnly) {
    const lastDateFormatted = lastDateStr.split('T')[0] || lastDate.toISOString().split('T')[0];
    return {
      valid: false,
      message: `Tanggal tidak boleh mundur! Tanggal transaksi terakhir di sistem adalah ${lastDateFormatted}. Silakan pilih tanggal hari ini atau setelahnya.`
    };
  }

  return { valid: true };
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Register Customer
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: 'Username, password, and name are required.' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, "customer")',
      [username, hashedPassword, name]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
      data: { id: result.insertId, username, name, role: 'customer' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      data: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Get Profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: users[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ==========================================

app.get('/api/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT id, username, name, role, created_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' AND (username LIKE ? OR name LIKE ?)';
      countQuery += ' AND (username LIKE ? OR name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
      countParams.push(searchParam, searchParam);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [totalRows] = await db.query(countQuery, countParams);
    const [users] = await db.query(query, params);

    const total = totalRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.put('/api/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { role } = req.body;
  if (!role || !['admin', 'customer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }

  try {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ success: true, message: 'User role updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete yourself.' });
  }

  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ==========================================
// UPLOADS FILE ENDPOINT
// ==========================================

app.post('/api/upload', authenticateToken, authorizeRoles('admin'), upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files;
    const response = { images: [], video: null };

    if (files.images) {
      response.images = files.images.map(file => `/uploads-mamun-socks/${file.filename}`);
    }
    if (files.video) {
      response.video = `/uploads-mamun-socks/${files.video[0].filename}`;
    }

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// PRODUCT MANAGEMENT ENDPOINTS
// ==========================================

// Get All Products (with variants)
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM products WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
      countParams.push(searchParam, searchParam);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [totalRows] = await db.query(countQuery, countParams);
    const [products] = await db.query(query, params);

    // Fetch variants for each product
    for (let product of products) {
      const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [product.id]);
      await attachPricingTiers(variants);
      product.variants = variants;

      // Parse images safely
      try {
        product.images = JSON.parse(product.images);
      } catch (e) {
        product.images = product.images ? [product.images] : [];
      }
    }

    const total = totalRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = products[0];
    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [product.id]);
    await attachPricingTiers(variants);
    product.variants = variants;

    try {
      product.images = JSON.parse(product.images);
    } catch (e) {
      product.images = product.images ? [product.images] : [];
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Create Product with Variants
app.post('/api/products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, description, price, weight, length, width, height, images, video, variants } = req.body;

  if (!name || !price || !variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ success: false, message: 'Product name, price, and at least one variant are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const imagesJson = JSON.stringify(images || []);
    const productWeight = parseFloat(weight) || 100;
    const productLength = length ? parseFloat(length) : null;
    const productWidth = width ? parseFloat(width) : null;
    const productHeight = height ? parseFloat(height) : null;

    // 1. Insert product
    const [prodResult] = await conn.query(
      'INSERT INTO products (name, description, price, weight, length, width, height, images, video) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, productWeight, productLength, productWidth, productHeight, imagesJson, video || null]
    );
    const productId = prodResult.insertId;

    // 2. Insert variants and log initial stocks
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    for (let variant of variants) {
      const stock = parseInt(variant.stock) || 0;
      const variantPrice = parseFloat(variant.price) || parseFloat(price) || 0;
      const costPrice = parseFloat(variant.cost_price) || 0;
      const variantWeight = variant.weight ? parseFloat(variant.weight) : null;
      const variantLength = variant.length ? parseFloat(variant.length) : null;
      const variantWidth = variant.width ? parseFloat(variant.width) : null;
      const variantHeight = variant.height ? parseFloat(variant.height) : null;
      const [varResult] = await conn.query(
        'INSERT INTO product_variants (product_id, model, color, stock, price, cost_price, image, weight, length, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, variant.model, variant.color, stock, variantPrice, costPrice, variant.image || null, variantWeight, variantLength, variantWidth, variantHeight]
      );

      const variantId = varResult.insertId;
      const sku = await resolveVariantSku(variant.sku, variantId, productId, conn);
      await conn.query('UPDATE product_variants SET sku = ? WHERE id = ?', [sku || generateSku(productId, variantId), variantId]);

      // Pricing tiers
      if (variant.pricing_tiers && Array.isArray(variant.pricing_tiers)) {
        for (let tier of variant.pricing_tiers) {
          await conn.query(
            'INSERT INTO pricing_tiers (variant_id, min_qty, max_qty, price) VALUES (?, ?, ?, ?)',
            [variantId, parseInt(tier.min_qty) || 1, parseInt(tier.max_qty) || 999999, parseFloat(tier.price)]
          );
        }
      }

      // Log initial stock movement
      if (stock > 0) {
        await conn.query(
          'INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) VALUES (?, "in", ?, "Initial Product Seed", ?)',
          [variantId, stock, now]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Product and variants created successfully.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create product. Check if variant combinations are unique.' });
  } finally {
    conn.release();
  }
});

// Update Product and its Variants
app.put('/api/products/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const productId = req.params.id;
  const { name, description, price, weight, length, width, height, images, video, variants } = req.body;

  if (!name || !price || !variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ success: false, message: 'Product name, price, and variants are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const imagesJson = JSON.stringify(images || []);
    const productWeight = parseFloat(weight) || 100;
    const productLength = length ? parseFloat(length) : null;
    const productWidth = width ? parseFloat(width) : null;
    const productHeight = height ? parseFloat(height) : null;

    // 1. Update core product info
    await conn.query(
      'UPDATE products SET name = ?, description = ?, price = ?, weight = ?, length = ?, width = ?, height = ?, images = ?, video = ? WHERE id = ?',
      [name, description, price, productWeight, productLength, productWidth, productHeight, imagesJson, video || null, productId]
    );

    // 2. We manage variants carefully. We check existing variants
    const [existingVariants] = await conn.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
    const existingIds = existingVariants.map(v => v.id);
    const inputIds = variants.map(v => v.id).filter(id => !!id);

    // Delete variants that are no longer in the list
    const toDelete = existingIds.filter(id => !inputIds.includes(id));
    if (toDelete.length > 0) {
      await conn.query('DELETE FROM product_variants WHERE id IN (?)', [toDelete]);
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Add or Update variants
    for (let variant of variants) {
      const variantPrice = parseFloat(variant.price) || parseFloat(price) || 0;
      const costPrice = parseFloat(variant.cost_price) || 0;
      const variantWeight = variant.weight ? parseFloat(variant.weight) : null;
      const variantLength = variant.length ? parseFloat(variant.length) : null;
      const variantWidth = variant.width ? parseFloat(variant.width) : null;
      const variantHeight = variant.height ? parseFloat(variant.height) : null;
      if (variant.id) {
        // Update existing variant: check stock difference and record log if changed
        const existing = existingVariants.find(v => v.id === variant.id);
        const newStock = parseInt(variant.stock) || 0;
        const diff = newStock - existing.stock;

        const sku = await resolveVariantSku(variant.sku, variant.id, productId, conn);
        await conn.query(
          'UPDATE product_variants SET sku = ?, model = ?, color = ?, stock = ?, price = ?, cost_price = ?, image = ?, weight = ?, length = ?, width = ?, height = ? WHERE id = ?',
          [sku || generateSku(productId, variant.id), variant.model, variant.color, newStock, variantPrice, costPrice, variant.image || null, variantWeight, variantLength, variantWidth, variantHeight, variant.id]
        );

        // Replace pricing tiers
        await conn.query('DELETE FROM pricing_tiers WHERE variant_id = ?', [variant.id]);
        if (variant.pricing_tiers && Array.isArray(variant.pricing_tiers)) {
          for (let tier of variant.pricing_tiers) {
            await conn.query(
              'INSERT INTO pricing_tiers (variant_id, min_qty, max_qty, price) VALUES (?, ?, ?, ?)',
              [variant.id, parseInt(tier.min_qty) || 1, parseInt(tier.max_qty) || 999999, parseFloat(tier.price)]
            );
          }
        }

        if (diff !== 0) {
          const logType = diff > 0 ? 'in' : 'out';
          await conn.query(
            'INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) VALUES (?, ?, ?, "Product Update Stock Adjustment", ?)',
            [variant.id, logType, Math.abs(diff), now]
          );
        }
      } else {
        // Create new variant
        const stock = parseInt(variant.stock) || 0;
        const [varResult] = await conn.query(
          'INSERT INTO product_variants (product_id, model, color, stock, price, cost_price, image, weight, length, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, variant.model, variant.color, stock, variantPrice, costPrice, variant.image || null, variantWeight, variantLength, variantWidth, variantHeight]
        );
        const variantId = varResult.insertId;
        const sku = await resolveVariantSku(variant.sku, variantId, productId, conn);
        await conn.query('UPDATE product_variants SET sku = ? WHERE id = ?', [sku || generateSku(productId, variantId), variantId]);

        if (variant.pricing_tiers && Array.isArray(variant.pricing_tiers)) {
          for (let tier of variant.pricing_tiers) {
            await conn.query(
              'INSERT INTO pricing_tiers (variant_id, min_qty, max_qty, price) VALUES (?, ?, ?, ?)',
              [variantId, parseInt(tier.min_qty) || 1, parseInt(tier.max_qty) || 999999, parseFloat(tier.price)]
            );
          }
        }

        if (stock > 0) {
          await conn.query(
            'INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) VALUES (?, "in", ?, "Initial Variant Add", ?)',
            [variantId, stock, now]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Product and variants updated successfully.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update product. Variant combinations must be unique.' });
  } finally {
    conn.release();
  }
});

// Delete Product
app.delete('/api/products/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // Delete query will cascade to product_variants. But order_items cannot cascade delete due to RESTRICT.
    // Let's check if there are orders referencing this product.
    const [items] = await db.query('SELECT id FROM order_items WHERE product_id = ? LIMIT 1', [req.params.id]);
    if (items.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus produk. Produk ini sudah pernah dipesan dalam transaksi histori.'
      });
    }

    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ==========================================
// ORDER MANAGEMENT ENDPOINTS
// ==========================================

// Create Order (Customer)
app.post('/api/orders', authenticateToken, async (req, res) => {
  const {
    items,
    shipping_address,
    recipient_name,
    recipient_phone,
    notes,
    order_date,
    shipping_cost,
    shipping_cost_original,
    shipping_courier,
    shipping_service,
    shipping_etd,
    shipping_cod,
    payment_method_id,
    payment_method_name,
    payment_receipt
  } = req.body;
  const userId = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0 || !shipping_address) {
    return res.status(400).json({ success: false, message: 'Items and shipping address are required.' });
  }
  if (!recipient_name || !recipient_phone) {
    return res.status(400).json({ success: false, message: 'Nama dan nomor penerima wajib diisi.' });
  }

  // Use selected order date or current server date
  const selectedDateStr = order_date || new Date().toISOString();

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Validate Date Sync Constraint (prevents backdating)
    const dateCheck = await validateDateSync(selectedDateStr, conn);
    if (!dateCheck.valid) {
      return res.status(400).json({ success: false, message: dateCheck.message });
    }

    const orderDateFormatted = new Date(selectedDateStr).toISOString().slice(0, 19).replace('T', ' ');

    // 2. Calculate totals & validate stock before creating order
    let productTotal = 0;
    const validatedItems = [];

    for (let item of items) {
      const { product_id, variant_id, quantity } = item;

      // Get current price of product and stock of variant
      const [variants] = await conn.query(
        `SELECT pv.*, p.price as base_price, p.name as product_name, p.weight as product_weight, pv.stock 
         FROM product_variants pv 
         JOIN products p ON pv.product_id = p.id 
         WHERE pv.id = ? AND pv.product_id = ?`,
        [variant_id, product_id]
      );

      if (variants.length === 0) {
        throw new Error(`Variant or product not found.`);
      }

      const variant = variants[0];
      const parsedQuantity = parseInt(quantity);
      if (parsedQuantity <= 0 || isNaN(parsedQuantity)) {
        throw new Error('Quantity must be greater than 0.');
      }

      // Check stock availability
      if (variant.stock < parsedQuantity) {
        throw new Error(`Stok tidak mencukupi untuk ${variant.product_name} (${variant.model} - ${variant.color}). Tersisa: ${variant.stock}.`);
      }

      const itemPrice = await resolveVariantPrice(variant, parsedQuantity, conn);
      const itemCost = parseFloat(variant.cost_price) || 0;
      const itemTotal = itemPrice * parsedQuantity;
      productTotal += itemTotal;

      validatedItems.push({
        product_id,
        variant_id,
        quantity: parsedQuantity,
        price: itemPrice,
        cost_price: itemCost,
        sku: variant.sku || generateSku(product_id, variant_id)
      });
    }

    const isCod = !!shipping_cod;
    const shipCostOriginal = parseFloat(shipping_cost_original) || parseFloat(shipping_cost) || 0;
    const shipCost = isCod ? 0 : (parseFloat(shipping_cost) || 0);
    const totalAmount = productTotal + shipCost;

    // 3. Generate Unique Order ID: ORD-YYYYMMDD-XXXX (random code)
    const todayStr = new Date(selectedDateStr).toISOString().slice(0, 10).replace(/-/g, '');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${todayStr}-${randomCode}`;

    // 4. Insert Order (starts as 'pending')
    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_number, user_id, total_amount, product_total, status, shipping_address, recipient_name, recipient_phone, notes, order_date, shipping_cost, shipping_cost_original, shipping_courier, shipping_service, shipping_etd, shipping_cod, payment_method_id, payment_method_name, payment_receipt) 
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        userId,
        totalAmount,
        productTotal,
        shipping_address,
        recipient_name,
        recipient_phone,
        notes || null,
        orderDateFormatted,
        shipCost,
        shipCostOriginal,
        shipping_courier || null,
        shipping_service || null,
        shipping_etd || null,
        isCod ? 1 : 0,
        payment_method_id || null,
        payment_method_name || null,
        payment_receipt || null
      ]
    );
    const orderId = orderResult.insertId;

    // 5. Insert Order Items
    for (let item of validatedItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, sku, quantity, price, cost_price) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.variant_id, item.sku, item.quantity, item.price, item.cost_price]
      );
    }

    // Get WhatsApp number for redirect
    const [waRows] = await conn.query("SELECT value FROM settings WHERE `key` = 'whatsapp_number'");
    const whatsappNumber = waRows[0]?.value || '6281234567890';

    await conn.commit();
    res.status(201).json({
      success: true,
      message: `Pesanan berhasil dibuat. Order ID: ${orderNumber}`,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        product_total: productTotal,
        total_amount: totalAmount,
        shipping_cod: isCod,
        whatsapp_number: whatsappNumber
      }
    });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Gagal memproses pesanan.' });
  } finally {
    conn.release();
  }
});

// Get Orders (Customer sees own, Admin sees all)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, u.name as customer_name, u.username as customer_username 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    // Filter by User role (Customer only sees their own)
    if (req.user.role === 'customer') {
      query += ' AND o.user_id = ?';
      countQuery += ' AND o.user_id = ?';
      params.push(req.user.id);
      countParams.push(req.user.id);
    }

    // Filter by Status
    if (status) {
      query += ' AND o.status = ?';
      countQuery += ' AND o.status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Search by Order ID or customer name
    if (search) {
      query += ' AND (o.order_number LIKE ? OR u.name LIKE ?)';
      countQuery += ' AND (o.order_number LIKE ? OR u.name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
      countParams.push(searchParam, searchParam);
    }

    query += ' ORDER BY o.order_date DESC, o.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [totalRows] = await db.query(countQuery, countParams);
    const [orders] = await db.query(query, params);

    // Fetch items for each order
    for (let order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.name as product_name, p.images as product_images, pv.model, pv.color, pv.sku as variant_sku
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN product_variants pv ON oi.variant_id = pv.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      for (let item of items) {
        try {
          item.product_images = JSON.parse(item.product_images);
        } catch (e) {
          item.product_images = [];
        }
      }

      order.items = items;
    }

    const total = totalRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Public order view by order number (shareable link)
app.get('/api/orders/view/:orderNumber', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name as customer_name, u.username as customer_username 
       FROM orders o JOIN users u ON o.user_id = u.id 
       WHERE o.order_number = ?`,
      [req.params.orderNumber]
    );
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }
    const order = orders[0];
    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.images as product_images, pv.model, pv.color
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN product_variants pv ON oi.variant_id = pv.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    for (let item of items) {
      try { item.product_images = JSON.parse(item.product_images); } catch (e) { item.product_images = []; }
    }
    order.items = items;
    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// SKU / order lookup for scan & check
app.get('/api/lookup', async (req, res) => {
  try {
    const { sku, order_number } = req.query;

    if (order_number) {
      const [orders] = await db.query(
        `SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_number = ?`,
        [order_number]
      );
      if (orders.length > 0) {
        const order = orders[0];
        const [items] = await db.query(
          `SELECT oi.*, p.name as product_name, pv.model, pv.color, pv.sku
           FROM order_items oi JOIN products p ON oi.product_id = p.id
           JOIN product_variants pv ON oi.variant_id = pv.id WHERE oi.order_id = ?`,
          [order.id]
        );
        order.items = items;
        return res.json({ success: true, type: 'order', data: order });
      }
    }

    if (sku) {
      const [variants] = await db.query(
        `SELECT pv.*, p.name as product_name, p.weight as product_weight
         FROM product_variants pv JOIN products p ON pv.product_id = p.id
         WHERE pv.sku = ? OR pv.sku LIKE ?`,
        [sku, `%${sku}%`]
      );
      if (variants.length > 0) {
        await attachPricingTiers(variants);
        const [orderItems] = await db.query(
          `SELECT oi.*, o.order_number, o.status, o.order_date, o.recipient_name
           FROM order_items oi JOIN orders o ON oi.order_id = o.id
           WHERE oi.sku = ? OR oi.variant_id = ?
           ORDER BY o.order_date DESC LIMIT 10`,
          [variants[0].sku, variants[0].id]
        );
        return res.json({ success: true, type: 'sku', data: { variant: variants[0], recent_orders: orderItems } });
      }
    }

    res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Update Order Status (Admin processes & ACCs order -> reduces inventory)
app.put('/api/orders/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body; // status: 'pending', 'processing', 'completed', 'cancelled'

  if (!status || !['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get current order details
    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];
    const prevStatus = order.status;

    if (prevStatus === status) {
      return res.status(400).json({ success: false, message: 'Order status is already set to this value.' });
    }

    // 2. Fetch order items
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    // Let's decide when stock deduction happens:
    // Deduct stock when moving from pending -> processing OR pending -> completed
    // Restore stock when cancelled AFTER being processing or completed
    const stockAffectingStatuses = ['processing', 'completed'];
    const isNowDeducted = stockAffectingStatuses.includes(status);
    const wasDeducted = stockAffectingStatuses.includes(prevStatus);

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (isNowDeducted && !wasDeducted) {
      // Deduct stock for all items
      for (let item of items) {
        // Validate stock again
        const [variants] = await conn.query('SELECT stock, model, color FROM product_variants WHERE id = ?', [item.variant_id]);
        const variant = variants[0];

        if (variant.stock < item.quantity) {
          throw new Error(`Stok tidak cukup untuk memproses pesanan. Varian (${variant.model} - ${variant.color}) tersisa: ${variant.stock}.`);
        }

        // Deduct
        await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variant_id]);

        // Log stock output
        await conn.query(
          `INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) 
           VALUES (?, 'out', ?, ?, ?)`,
          [item.variant_id, item.quantity, `Deduction for order: ${order.order_number}`, now]
        );
      }
    } else if (!isNowDeducted && wasDeducted) {
      // Cancelled or pending: Restore stock
      for (let item of items) {
        await conn.query('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [item.quantity, item.variant_id]);

        // Log stock restoration
        await conn.query(
          `INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) 
           VALUES (?, 'in', ?, ?, ?)`,
          [item.variant_id, item.quantity, `Restoration for order change/cancellation: ${order.order_number}`, now]
        );
      }
    }

    // 3. Update status
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    await conn.commit();
    res.json({ success: true, message: `Status pesanan berhasil diubah menjadi ${status}.` });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Gagal mengubah status pesanan.' });
  } finally {
    conn.release();
  }
});

// ==========================================
// STOCK & INVENTORY LOGS ENDPOINTS
// ==========================================

// Get Stock Movement Logs (Admin)
app.get('/api/stock/logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT sl.*, pv.model, pv.color, p.name as product_name 
      FROM stock_logs sl
      JOIN product_variants pv ON sl.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM stock_logs sl
      JOIN product_variants pv ON sl.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR pv.model LIKE ? OR sl.reference LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR pv.model LIKE ? OR sl.reference LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY sl.log_date DESC, sl.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [totalRows] = await db.query(countQuery, countParams);
    const [logs] = await db.query(query, params);

    const total = totalRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Manual Stock Adjustment / Opname (Admin)
app.post('/api/stock/adjust', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { variant_id, new_stock, notes, adjustment_date } = req.body;

  if (!variant_id || new_stock === undefined || isNaN(parseInt(new_stock))) {
    return res.status(400).json({ success: false, message: 'Variant ID and valid new stock amount are required.' });
  }

  const selectedDateStr = adjustment_date || new Date().toISOString();

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Date sync validation
    const dateCheck = await validateDateSync(selectedDateStr, conn);
    if (!dateCheck.valid) {
      return res.status(400).json({ success: false, message: dateCheck.message });
    }

    const logDateFormatted = new Date(selectedDateStr).toISOString().slice(0, 19).replace('T', ' ');

    // 2. Get current variant stock
    const [variants] = await conn.query('SELECT stock FROM product_variants WHERE id = ?', [variant_id]);
    if (variants.length === 0) {
      return res.status(404).json({ success: false, message: 'Variant not found.' });
    }

    const currentStock = variants[0].stock;
    const targetStock = parseInt(new_stock);
    const diff = targetStock - currentStock;

    if (diff === 0) {
      return res.status(400).json({ success: false, message: 'New stock matches current stock level.' });
    }

    // 3. Update variant stock
    await conn.query('UPDATE product_variants SET stock = ? WHERE id = ?', [targetStock, variant_id]);

    // 4. Create stock log
    const type = diff > 0 ? 'in' : 'out';
    const quantity = Math.abs(diff);
    const reference = notes || `Stock Opname (Adjustment from ${currentStock} to ${targetStock})`;

    await conn.query(
      `INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [variant_id, type, quantity, reference, logDateFormatted]
    );

    await conn.commit();
    res.json({
      success: true,
      message: `Stok berhasil di-opname menjadi ${targetStock}. Log tercatat pada tanggal ${logDateFormatted.split(' ')[0]}.`
    });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    conn.release();
  }
});

// ==========================================
// REPORTS & DASHBOARD ENDPOINTS
// ==========================================

// Dashboard Stats (Admin)
app.get('/api/reports/dashboard', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // 1. Total revenue (completed/processing orders)
    const [revenueRes] = await db.query(
      "SELECT SUM(total_amount) as total FROM orders WHERE status IN ('processing', 'completed')"
    );
    const totalRevenue = revenueRes[0].total || 0;

    // 2. Total orders count
    const [ordersCountRes] = await db.query("SELECT COUNT(*) as count FROM orders");
    const totalOrders = ordersCountRes[0].count || 0;

    // 3. Low stock variants count (stock < 10)
    const [lowStockRes] = await db.query(
      `SELECT pv.*, p.name as product_name 
       FROM product_variants pv 
       JOIN products p ON pv.product_id = p.id 
       WHERE pv.stock < 10`
    );

    // 4. Recent orders list (limit 5)
    const [recentOrders] = await db.query(
      `SELECT o.*, u.name as customer_name 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.order_date DESC, o.id DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue),
        totalOrders,
        lowStockCount: lowStockRes.length,
        lowStockItems: lowStockRes,
        recentOrders
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Sales Report (grouped by date)
app.get('/api/reports/sales', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const range = req.query.range || '7days'; // 7days, 30days, all
    let sql = `
      SELECT DATE(order_date) as date, COUNT(id) as total_orders, SUM(total_amount) as revenue 
      FROM orders 
      WHERE status IN ('processing', 'completed')
    `;

    const params = [];
    if (range === '7days') {
      sql += ' AND order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (range === '30days') {
      sql += ' AND order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    sql += ' GROUP BY DATE(order_date) ORDER BY DATE(order_date) ASC';
    const [rows] = await db.query(sql, params);

    // Also get product-specific sales ranking
    const [productSales] = await db.query(`
      SELECT p.name as product_name, pv.model, pv.color, SUM(oi.quantity) as quantity_sold, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE o.status IN ('processing', 'completed')
      GROUP BY p.id, pv.id
      ORDER BY quantity_sold DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        chartData: rows,
        topProducts: productSales
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ==========================================
// CUSTOMER RECEIPT UPLOAD ENDPOINT
// ==========================================
app.post('/api/orders/upload-receipt', authenticateToken, upload.single('receipt'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File bukti transfer wajib diunggah.' });
    }
    const filePath = `/uploads-mamun-socks/${req.file.filename}`;
    res.json({ success: true, data: { file_path: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/orders/upload-shipping-receipt', authenticateToken, authorizeRoles('admin'), upload.single('receipt'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File bukti resi wajib diunggah.' });
    }
    const filePath = `/uploads-mamun-socks/${req.file.filename}`;
    res.json({ success: true, data: { file_path: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/orders/:id/shipping-receipt', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const orderId = req.params.id;
  const { shipping_receipt } = req.body;
  if (!shipping_receipt) {
    return res.status(400).json({ success: false, message: 'Path bukti resi wajib diisi.' });
  }
  try {
    const [result] = await db.query('UPDATE orders SET shipping_receipt = ? WHERE id = ?', [shipping_receipt, orderId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Bukti resi pengiriman berhasil disimpan.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan bukti resi.' });
  }
});

// ==========================================
// PAYMENT METHODS MANAGEMENT ENDPOINTS
// ==========================================

// Get Active Payment Methods (Public)
app.get('/api/payment-methods', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payment_methods WHERE is_active = 1');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment methods.' });
  }
});

// Get All Payment Methods (Admin Only)
app.get('/api/admin/payment-methods', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payment_methods ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment methods.' });
  }
});

// Create Payment Method (Admin Only)
app.post('/api/admin/payment-methods', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, type, account_number, account_name, qr_code_image } = req.body;
  if (!name || !type || !['bank', 'qris'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Name and valid type are required.' });
  }

  try {
    await db.query(
      'INSERT INTO payment_methods (name, type, account_number, account_name, qr_code_image) VALUES (?, ?, ?, ?, ?)',
      [name, type, account_number || null, account_name || null, qr_code_image || null]
    );
    res.status(201).json({ success: true, message: 'Payment method created successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create payment method.' });
  }
});

// Update Payment Method (Admin Only)
app.put('/api/admin/payment-methods/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, type, account_number, account_name, qr_code_image, is_active } = req.body;
  if (!name || !type || !['bank', 'qris'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Name and valid type are required.' });
  }

  try {
    await db.query(
      'UPDATE payment_methods SET name = ?, type = ?, account_number = ?, account_name = ?, qr_code_image = ?, is_active = ? WHERE id = ?',
      [name, type, account_number || null, account_name || null, qr_code_image || null, is_active !== undefined ? is_active : 1, req.params.id]
    );
    res.json({ success: true, message: 'Payment method updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update payment method.' });
  }
});

// Delete Payment Method (Admin Only)
app.delete('/api/admin/payment-methods/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM payment_methods WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Payment method deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete payment method.' });
  }
});

// ==========================================
// KOMERCE RAJAONGKIR PROXY ENDPOINTS
// ==========================================

const komerceGet = (search) => {
  return new Promise((resolve, reject) => {
    const url = `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=10&offset=0`;
    const options = {
      headers: {
        'key': 'QZR3cIdu8046b26601fa4f7cWRdrxfV5'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response from Rajaongkir Komerce'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

const komercePost = (body) => {
  return new Promise((resolve, reject) => {
    const url = 'https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost';
    const postData = new URLSearchParams(body).toString();
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'key': 'QZR3cIdu8046b26601fa4f7cWRdrxfV5',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response from Rajaongkir Komerce Calculate'));
        }
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.write(postData);
    req.end();
  });
};

app.get('/api/shipping/destination', async (req, res) => {
  try {
    const search = req.query.search || '';
    if (!search) {
      return res.json({ success: true, data: [] });
    }
    const result = await komerceGet(search);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Failed to proxy Komerce Destination:', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve shipping destination.' });
  }
});

app.post('/api/shipping/cost', async (req, res) => {
  try {
    const { destination, weight } = req.body;
    if (!destination) {
      return res.status(400).json({ success: false, message: 'Destination is required.' });
    }
    const payload = {
      origin: '5242', // Bandung Kutawaringin origin
      destination: String(destination),
      weight: Math.max(1, Math.ceil(parseFloat(weight) || 1)),
      courier: 'jne:sicepat:ide:sap:jnt:ninja:tiki:lion:anteraja:pos:ncs:rex:rpx:sentral:star:wahana:dse',
      price: 'lowest'
    };
    const result = await komercePost(payload);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Failed to proxy Komerce Cost Calculate:', error.message);
    res.status(500).json({ success: false, message: 'Failed to calculate shipping cost.' });
  }
});

// ==========================================
// SETTINGS ENDPOINTS
// ==========================================

// Get All Settings (Public)
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to retrieve settings.' });
  }
});

// Update Settings (Admin Only)
app.put('/api/settings', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (let key of Object.keys(settings)) {
      await conn.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, String(settings[key]), String(settings[key])]
      );
    }
    await conn.commit();
    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  } finally {
    conn.release();
  }
});

// Helper for HTTPS GET requests (used to proxy wilayah.id regional API to bypass CORS)
const httpsGet = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Regional API Proxy Routes
app.get('/api/regions/provinces', async (req, res) => {
  try {
    const data = await httpsGet('https://wilayah.id/api/provinces.json');
    res.json({ success: true, data: data.data || [] });
  } catch (error) {
    console.error('Failed to proxy provinces:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch provinces.' });
  }
});

app.get('/api/regions/regencies/:provinceCode', async (req, res) => {
  try {
    const data = await httpsGet(`https://wilayah.id/api/regencies/${req.params.provinceCode}.json`);
    res.json({ success: true, data: data.data || [] });
  } catch (error) {
    console.error('Failed to proxy regencies:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch regencies.' });
  }
});

app.get('/api/regions/districts/:regencyCode', async (req, res) => {
  try {
    const data = await httpsGet(`https://wilayah.id/api/districts/${req.params.regencyCode}.json`);
    res.json({ success: true, data: data.data || [] });
  } catch (error) {
    console.error('Failed to proxy districts:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch districts.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
