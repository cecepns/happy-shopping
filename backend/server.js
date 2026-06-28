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
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'happy_shopping_secret';
const RAJAONGKIR_KEY = process.env.RAJAONGKIR_KEY || 'QZR3cIdu8046b26601fa4f7cWRdrxfV5';
const SHIPPING_ORIGIN = process.env.SHIPPING_ORIGIN || '5242';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadDir = path.join(__dirname, 'uploads-happy-shopping');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads-happy-shopping', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname));
    cb(ok ? null : new Error('Hanya file gambar yang diperbolehkan'), ok);
  }
});

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'happy_shopping',
  waitForConnections: true,
  connectionLimit: 10
});

// ============ HELPERS ============

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ditemukan.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Token tidak valid.' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }
  next();
};

const MEMBER_ROLES = ['pembeli', 'seller'];
const isMember = (role) => MEMBER_ROLES.includes(role);
const isStoreOwner = (user, sellerId) => user.role === 'admin' || user.id === sellerId;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getMailTransporter = () => {
  // if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: true,
    auth: { user:"infohepishopping@gmail.com", pass: "pueb yvlg lvsj xsts"}
  });
};

const sendOtpEmail = async (email, name, code) => {
  const subject = 'Kode OTP Login - Happy Shopping';
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
    <h2>Happy Shopping</h2>
    <p>Halo ${name},</p>
    <p>Kode OTP login Anda:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#4f46e5">${code}</p>
    <p>Kode berlaku 10 menit. Jangan bagikan kode ini kepada siapapun.</p>
  </div>`;
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`[OTP DEV] ${email}: ${code}`);
    return;
  }
  await transporter.sendMail({
    from: "infohepishopping@gmail.com",
    to: email,
    subject,
    html
  });
};

const createAndSendOtp = async (userId, email, name) => {
  const code = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await db.query('UPDATE otp_codes SET used = 1 WHERE user_id = ? AND used = 0', [userId]);
  await db.query('INSERT INTO otp_codes (user_id, code, expires_at) VALUES (?, ?, ?)', [userId, code, expires]);
  await sendOtpEmail(email, name, code);
};

const maskEmail = (email = '') => {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
};

const hasStoreSetup = (user) => !!(user.store_address && user.store_origin_id);

const paginate = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit, search: (req.query.search || '').trim() };
};

const paginationResponse = (data, page, limit, total) => ({
  success: true,
  data,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
});

const slugify = (text = '') =>
  String(text).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'produk';

const generateSku = (productId, variantId) =>
  `HSP-${String(productId).padStart(3, '0')}-${String(variantId).padStart(4, '0')}`;

const generateOrderNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `HS-${date}-${rand}`;
};

const resolveVariantSku = async (customSku, variantId, productId, conn) => {
  const trimmed = (customSku || '').trim();
  if (trimmed) {
    const [existing] = await conn.query('SELECT id FROM product_variants WHERE sku = ? AND id != ?', [trimmed, variantId || 0]);
    if (existing.length) throw new Error(`SKU "${trimmed}" sudah digunakan.`);
    return trimmed;
  }
  return variantId ? generateSku(productId, variantId) : null;
};

const attachPricingTiers = async (variants, conn = db) => {
  for (const variant of variants) {
    const [tiers] = await conn.query('SELECT id, min_qty, max_qty, price FROM pricing_tiers WHERE variant_id = ? ORDER BY min_qty', [variant.id]);
    variant.pricing_tiers = tiers;
  }
  return variants;
};

const parseImages = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

const recordBalance = async (conn, userId, type, amount, reference, note) => {
  const [users] = await conn.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
  if (!users.length) throw new Error('User tidak ditemukan.');
  const before = parseFloat(users[0].balance);
  const after = before + amount;
  if (after < 0) throw new Error('Saldo tidak mencukupi.');
  await conn.query('UPDATE users SET balance = ? WHERE id = ?', [after, userId]);
  await conn.query(
    'INSERT INTO balance_transactions (user_id, type, amount, balance_before, balance_after, reference, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, type, amount, before, after, reference, note]
  );
  return after;
};

// Chat phone filter
const PHONE_PATTERNS = [
  /\b(?:\+62|62|0)\s*8[1-9]\d{7,10}\b/gi,
  /\b0\d{2,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b/g,
  /\b\d{3,4}[\s\-]\d{3,4}[\s\-]\d{3,4}\b/g,
  /(?:wa\.me|whatsapp|tel:|phone)/gi
];

const sanitizeChatMessage = (text) => {
  const original = String(text || '').trim();
  if (!original) return { allowed: false, message: 'Pesan tidak boleh kosong.' };

  let filtered = original;
  let hasPhone = false;
  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(original)) hasPhone = true;
    filtered = filtered.replace(pattern, '[***]');
  }

  const digits = original.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length >= original.replace(/\s/g, '').length * 0.6) {
    return { allowed: false, message: 'Nomor telepon tidak diperbolehkan di chat. Silakan transaksi melalui website.' };
  }

  if (hasPhone && filtered.replace(/\[(\*\*\*)\]/g, '').replace(/\s/g, '').length < 3) {
    return { allowed: false, message: 'Nomor telepon tidak diperbolehkan di chat. Silakan transaksi melalui website.' };
  }

  return { allowed: true, message: filtered, isFiltered: filtered !== original };
};

// Raja Ongkir Komerce
const komerceGet = (search) => new Promise((resolve, reject) => {
  const url = `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=10&offset=0`;
  https.get(url, { headers: { key: RAJAONGKIR_KEY } }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
  }).on('error', reject);
});

const komercePost = (body) => new Promise((resolve, reject) => {
  const postData = new URLSearchParams(body).toString();
  const req = https.request('https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', key: RAJAONGKIR_KEY, 'Content-Length': Buffer.byteLength(postData) }
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
  });
  req.on('error', reject);
  req.write(postData);
  req.end();
});

const releaseSellerPayout = async (conn, order) => {
  if (order.seller_payout_status === 'released' || order.payment_type === 'cod') return;
  const payout = parseFloat(order.product_total);
  if (payout <= 0) return;
  await recordBalance(conn, order.seller_id, 'payout', payout, order.order_number, `Pencairan penjualan order ${order.order_number}`);
  await conn.query('UPDATE orders SET seller_payout_status = ? WHERE id = ?', ['released', order.id]);
};

// ============ AUTH ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, email, phone } = req.body;
    if (!username || !password || !name || !email) {
      return res.status(400).json({ success: false, message: 'Username, password, nama, dan email wajib diisi.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
    }
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length) return res.status(400).json({ success: false, message: 'Username atau email sudah digunakan.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password, name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hash, name, email, phone || null, 'pembeli']
    );
    res.status(201).json({ success: true, message: 'Registrasi berhasil.', data: { id: result.insertId, username, name, role: 'pembeli' } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Gagal registrasi.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!users.length || !(await bcrypt.compare(password, users[0].password))) {
      return res.status(400).json({ success: false, message: 'Username atau password salah.' });
    }
    const u = users[0];
    if (!u.email) return res.status(400).json({ success: false, message: 'Akun belum memiliki email. Hubungi admin.' });
    await createAndSendOtp(u.id, u.email, u.name);
    res.json({
      success: true,
      requires_otp: true,
      message: 'Kode OTP telah dikirim ke email Anda.',
      data: { email_hint: maskEmail(u.email), username: u.username }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Gagal login.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { username, code } = req.body;
    if (!username || !code) return res.status(400).json({ success: false, message: 'Username dan kode OTP wajib.' });
    const [users] = await db.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!users.length) return res.status(400).json({ success: false, message: 'User tidak ditemukan.' });
    const u = users[0];
    const [otps] = await db.query(
      'SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [u.id, String(code).trim()]
    );
    if (!otps.length) return res.status(400).json({ success: false, message: 'Kode OTP tidak valid atau sudah kadaluarsa.' });
    await db.query('UPDATE otp_codes SET used = 1 WHERE id = ?', [otps[0].id]);
    const token = jwt.sign({ id: u.id, username: u.username, name: u.name, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true, token,
      data: {
        id: u.id, username: u.username, name: u.name, role: u.role,
        balance: parseFloat(u.balance), store_name: u.store_name,
        store_setup_complete: hasStoreSetup(u)
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Gagal verifikasi OTP.' });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!users.length || !(await bcrypt.compare(password, users[0].password))) {
      return res.status(400).json({ success: false, message: 'Username atau password salah.' });
    }
    const u = users[0];
    await createAndSendOtp(u.id, u.email, u.name);
    res.json({ success: true, message: 'Kode OTP baru telah dikirim.', data: { email_hint: maskEmail(u.email) } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengirim ulang OTP.' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, name, email, phone, role, balance, store_name, store_description, store_address, store_origin_id, store_origin_label, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    const u = users[0];
    u.balance = parseFloat(u.balance);
    u.store_setup_complete = hasStoreSetup(u);
    res.json({ success: true, data: u });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil profil.' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, store_name, store_description, store_address, store_origin_id, store_origin_label } = req.body;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
    }
    if (store_origin_id !== undefined || store_address !== undefined) {
      if (!store_address?.trim() || !store_origin_id) {
        return res.status(400).json({ success: false, message: 'Alamat toko dan lokasi pengiriman wajib diisi.' });
      }
    }
    const [current] = await db.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
    const finalEmail = email || current[0]?.email;
    await db.query(
      'UPDATE users SET name=?, email=?, phone=?, store_name=?, store_description=?, store_address=?, store_origin_id=?, store_origin_label=? WHERE id=?',
      [name, finalEmail, phone, store_name, store_description, store_address, store_origin_id || null, store_origin_label || null, req.user.id]
    );
    res.json({ success: true, message: 'Profil diperbarui.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
  }
});

// ============ UPLOAD ============

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
  res.json({ success: true, data: { url: `/uploads-happy-shopping/${req.file.filename}` } });
});

app.post('/api/upload/multiple', authenticateToken, upload.array('files', 10), (req, res) => {
  const urls = (req.files || []).map(f => `/uploads-happy-shopping/${f.filename}`);
  res.json({ success: true, data: urls });
});

// ============ BANNERS (PUBLIC + ADMIN) ============

app.get('/api/banners', async (req, res) => {
  try {
    const activeOnly = req.query.all !== '1';
    const [rows] = await db.query(
      `SELECT * FROM banners ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY sort_order ASC, id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil banner.' });
  }
});

app.post('/api/banners', authenticateToken, authorizeRoles('admin'), upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, link_url, sort_order, is_active } = req.body;
    const image = req.file ? `/uploads-happy-shopping/${req.file.filename}` : req.body.image;
    if (!title || !image) return res.status(400).json({ success: false, message: 'Title dan gambar wajib.' });
    const [r] = await db.query(
      'INSERT INTO banners (title, subtitle, image, link_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [title, subtitle || null, image, link_url || null, parseInt(sort_order) || 0, is_active === '0' ? 0 : 1]
    );
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal membuat banner.' });
  }
});

app.put('/api/banners/:id', authenticateToken, authorizeRoles('admin'), upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, link_url, sort_order, is_active } = req.body;
    const image = req.file ? `/uploads-happy-shopping/${req.file.filename}` : req.body.image;
    await db.query(
      'UPDATE banners SET title=?, subtitle=?, image=COALESCE(?, image), link_url=?, sort_order=?, is_active=? WHERE id=?',
      [title, subtitle, image, link_url, parseInt(sort_order) || 0, is_active === '0' ? 0 : 1, req.params.id]
    );
    res.json({ success: true, message: 'Banner diperbarui.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui banner.' });
  }
});

app.delete('/api/banners/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  await db.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Banner dihapus.' });
});

// ============ CATEGORIES ============

app.get('/api/categories', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY name');
  res.json({ success: true, data: rows });
});

app.get('/api/admin/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { page, limit, offset, search } = paginate(req);
  let q = 'SELECT * FROM categories WHERE 1=1';
  let cq = 'SELECT COUNT(*) as total FROM categories WHERE 1=1';
  const p = [];
  if (search) { q += ' AND name LIKE ?'; cq += ' AND name LIKE ?'; p.push(`%${search}%`); }
  q += ' ORDER BY name LIMIT ? OFFSET ?';
  const [rows] = await db.query(q, [...p, limit, offset]);
  const [[{ total }]] = await db.query(cq, p);
  res.json(paginationResponse(rows, page, limit, total));
});

app.post('/api/admin/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, icon } = req.body;
  const slug = slugify(name);
  await db.query('INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)', [name, slug, icon]);
  res.status(201).json({ success: true, message: 'Kategori ditambahkan.' });
});

app.put('/api/admin/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, icon, is_active } = req.body;
  await db.query('UPDATE categories SET name=?, slug=?, icon=?, is_active=? WHERE id=?', [name, slugify(name), icon, is_active ? 1 : 0, req.params.id]);
  res.json({ success: true, message: 'Kategori diperbarui.' });
});

app.delete('/api/admin/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Kategori dihapus.' });
});

// ============ PRODUCTS (PUBLIC) ============

app.get('/api/products', async (req, res) => {
  try {
    const { page, limit, offset, search } = paginate(req);
    const { category_id, seller_id, sort = 'newest' } = req.query;
    let q = `SELECT p.*, u.store_name as seller_name, c.name as category_name
      FROM products p JOIN users u ON p.seller_id = u.id LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND u.is_active = 1`;
    let cq = `SELECT COUNT(*) as total FROM products p JOIN users u ON p.seller_id = u.id WHERE p.status = 'active' AND u.is_active = 1`;
    const p = [];
    if (search) { q += ' AND (p.name LIKE ? OR u.store_name LIKE ?)'; cq += ' AND (p.name LIKE ? OR u.store_name LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
    if (category_id) { q += ' AND p.category_id = ?'; cq += ' AND p.category_id = ?'; p.push(category_id); }
    if (seller_id) { q += ' AND p.seller_id = ?'; cq += ' AND p.seller_id = ?'; p.push(seller_id); }
    const sortMap = { newest: 'p.created_at DESC', price_asc: 'p.price ASC', price_desc: 'p.price DESC', popular: 'p.sold_count DESC' };
    q += ` ORDER BY ${sortMap[sort] || sortMap.newest} LIMIT ? OFFSET ?`;
    const [rows] = await db.query(q, [...p, limit, offset]);
    rows.forEach(r => { r.images = parseImages(r.images); });
    const [[{ total }]] = await db.query(cq, p);
    res.json(paginationResponse(rows, page, limit, total));
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil produk.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT p.*, u.store_name as seller_name, u.id as seller_user_id, c.name as category_name
       FROM products p JOIN users u ON p.seller_id = u.id LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (!products.length) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    const product = products[0];
    product.images = parseImages(product.images);
    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [product.id]);
    await attachPricingTiers(variants);
    product.variants = variants;
    product.models = [...new Set(variants.map(v => v.model))];
    res.json({ success: true, data: product });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail produk.' });
  }
});

// ============ SELLER / ADMIN PRODUCTS ============

const saveProduct = async (req, res, isUpdate = false) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, price, weight, category_id, status, variants, images } = req.body;
    const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    const parsedImages = typeof images === 'string' ? JSON.parse(images) : (images || []);

    if (!name || !parsedVariants?.length) {
      return res.status(400).json({ success: false, message: 'Nama produk dan minimal 1 variant wajib.' });
    }

    if (!isUpdate && req.user.role !== 'admin') {
      const [seller] = await conn.query('SELECT store_address, store_origin_id FROM users WHERE id = ?', [req.user.id]);
      if (!seller.length || !seller[0].store_address || !seller[0].store_origin_id) {
        return res.status(400).json({
          success: false,
          message: 'Lengkapi alamat toko di Pengaturan Toko terlebih dahulu.',
          code: 'STORE_SETUP_REQUIRED'
        });
      }
    }

    const sellerId = req.user.role === 'admin' && req.body.seller_id ? req.body.seller_id : req.user.id;
    const slug = slugify(name);
    let productId = req.params.id;

    if (isUpdate) {
      const [existing] = await conn.query('SELECT seller_id FROM products WHERE id = ?', [productId]);
      if (!existing.length) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      if (req.user.role !== 'admin' && existing[0].seller_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Bukan produk Anda.' });
      }
      await conn.query(
        'UPDATE products SET name=?, slug=?, description=?, price=?, weight=?, category_id=?, status=?, images=? WHERE id=?',
        [name, slug, description, parseFloat(price) || 0, parseFloat(weight) || 100, category_id || null, status || 'active', JSON.stringify(parsedImages), productId]
      );
    } else {
      const [r] = await conn.query(
        'INSERT INTO products (seller_id, category_id, name, slug, description, price, weight, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [sellerId, category_id || null, name, slug, description, parseFloat(price) || 0, parseFloat(weight) || 100, JSON.stringify(parsedImages), status || 'active']
      );
      productId = r.insertId;
    }

    const [existingVariants] = await conn.query('SELECT id FROM product_variants WHERE product_id = ?', [productId]);
    const inputIds = parsedVariants.map(v => v.id).filter(Boolean);
    const toDelete = existingVariants.map(v => v.id).filter(id => !inputIds.includes(id));
    if (toDelete.length) await conn.query('DELETE FROM product_variants WHERE id IN (?)', [toDelete]);

    for (const variant of parsedVariants) {
      const vPrice = parseFloat(variant.price) || parseFloat(price) || 0;
      const costPrice = variant.cost_price !== undefined && variant.cost_price !== '' ? parseFloat(variant.cost_price) : null;
      const stock = parseInt(variant.stock) || 0;

      if (variant.id) {
        const sku = await resolveVariantSku(variant.sku, variant.id, productId, conn);
        await conn.query(
          'UPDATE product_variants SET sku=?, model=?, variant_name=?, stock=?, price=?, cost_price=?, image=?, weight=? WHERE id=?',
          [sku, variant.model, variant.variant_name, stock, vPrice, costPrice, variant.image || null, variant.weight || null, variant.id]
        );
        await conn.query('DELETE FROM pricing_tiers WHERE variant_id = ?', [variant.id]);
        if (variant.pricing_tiers?.length) {
          for (const tier of variant.pricing_tiers) {
            await conn.query('INSERT INTO pricing_tiers (variant_id, min_qty, max_qty, price) VALUES (?, ?, ?, ?)',
              [variant.id, tier.min_qty || 1, tier.max_qty || 999999, tier.price]);
          }
        }
      } else {
        const [vr] = await conn.query(
          'INSERT INTO product_variants (product_id, model, variant_name, stock, price, cost_price, image, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, variant.model, variant.variant_name, stock, vPrice, costPrice, variant.image || null, variant.weight || null]
        );
        const variantId = vr.insertId;
        const sku = await resolveVariantSku(variant.sku, variantId, productId, conn);
        await conn.query('UPDATE product_variants SET sku = ? WHERE id = ?', [sku || generateSku(productId, variantId), variantId]);
        if (stock > 0) {
          await conn.query('INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) VALUES (?, "in", ?, "Initial Stock", NOW())', [variantId, stock]);
        }
      }
    }

    await conn.commit();
    res.json({ success: true, message: isUpdate ? 'Produk diperbarui.' : 'Produk ditambahkan.', data: { id: productId } });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message || 'Gagal menyimpan produk.' });
  } finally {
    conn.release();
  }
};

app.get('/api/seller/products', authenticateToken, authorizeRoles(...MEMBER_ROLES, 'admin'), async (req, res) => {
  const { page, limit, offset, search } = paginate(req);
  const sellerId = req.user.role === 'admin' && req.query.seller_id ? req.query.seller_id : req.user.id;
  let q = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.seller_id = ?';
  let cq = 'SELECT COUNT(*) as total FROM products WHERE seller_id = ?';
  const p = [sellerId];
  if (search) { q += ' AND p.name LIKE ?'; cq += ' AND name LIKE ?'; p.push(`%${search}%`); }
  q += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  const [rows] = await db.query(q, [...p, limit, offset]);
  rows.forEach(r => { r.images = parseImages(r.images); });
  const [[{ total }]] = await db.query(cq, p);
  res.json(paginationResponse(rows, page, limit, total));
});

app.get('/api/seller/products/:id', authenticateToken, authorizeRoles(...MEMBER_ROLES, 'admin'), async (req, res) => {
  const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!products.length) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
  if (req.user.role !== 'admin' && products[0].seller_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Bukan produk Anda.' });
  }
  const product = products[0];
  product.images = parseImages(product.images);
  const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [product.id]);
  await attachPricingTiers(variants);
  product.variants = variants;
  res.json({ success: true, data: product });
});

app.post('/api/seller/products', authenticateToken, authorizeRoles(...MEMBER_ROLES, 'admin'), saveProduct);
app.put('/api/seller/products/:id', authenticateToken, authorizeRoles(...MEMBER_ROLES, 'admin'), (req, res) => saveProduct(req, res, true));

app.delete('/api/seller/products/:id', authenticateToken, authorizeRoles(...MEMBER_ROLES, 'admin'), async (req, res) => {
  const [p] = await db.query('SELECT seller_id FROM products WHERE id = ?', [req.params.id]);
  if (!p.length) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
  if (req.user.role !== 'admin' && p[0].seller_id !== req.user.id) return res.status(403).json({ success: false, message: 'Bukan produk Anda.' });
  await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Produk dihapus.' });
});

// ============ SHIPPING ============

app.get('/api/shipping/destination', async (req, res) => {
  try {
    const search = req.query.search || '';
    if (!search) return res.json({ success: true, data: [] });
    const result = await komerceGet(search);
    res.json({ success: true, data: result.data || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil destinasi.' });
  }
});

app.get('/api/shipping/sellers-info', async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').map(id => parseInt(id)).filter(Boolean);
    if (!ids.length) return res.json({ success: true, data: {} });
    const [rows] = await db.query(
      `SELECT id, store_name, store_origin_id, store_origin_label FROM users WHERE id IN (?)`,
      [ids]
    );
    const data = {};
    rows.forEach(r => {
      data[r.id] = {
        store_name: r.store_name,
        has_origin: !!r.store_origin_id,
        store_origin_label: r.store_origin_label
      };
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil info seller.' });
  }
});

app.post('/api/shipping/cost', async (req, res) => {
  try {
    const { destination, weight, origin, seller_id } = req.body;
    if (!destination) return res.status(400).json({ success: false, message: 'Destinasi wajib.' });
    let originId = origin || null;
    if (seller_id) {
      const [s] = await db.query('SELECT store_origin_id FROM users WHERE id = ?', [seller_id]);
      if (!s.length || !s[0].store_origin_id) {
        return res.json({ success: true, shipping_available: false, data: [] });
      }
      originId = s[0].store_origin_id;
    }
    if (!originId) originId = SHIPPING_ORIGIN;
    const result = await komercePost({
      origin: String(originId),
      destination: String(destination),
      weight: Math.max(1, Math.ceil(parseFloat(weight) || 1)),
      courier: 'jne:sicepat:ide:sap:jnt:ninja:tiki:lion:anteraja:pos',
      price: 'lowest'
    });
    res.json({ success: true, shipping_available: true, data: result.data || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal hitung ongkir.' });
  }
});

// ============ ORDERS ============

app.post('/api/orders', authenticateToken, authorizeRoles(...MEMBER_ROLES), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      items, shipping_address, recipient_name, recipient_phone, notes,
      payment_type, shipping_cost, shipping_courier, shipping_service, shipping_etd,
      shipping_cod, destination_id, shipping_options
    } = req.body;

    if (!items?.length || !shipping_address || !recipient_name || !recipient_phone) {
      return res.status(400).json({ success: false, message: 'Data pesanan tidak lengkap.' });
    }

    const payType = ['balance', 'cod', 'transfer'].includes(payment_type) ? payment_type : 'balance';
    const groups = {};

    for (const item of items) {
      const [variants] = await conn.query(
        `SELECT pv.*, p.name as product_name, p.seller_id, p.weight as product_weight
         FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ? AND p.id = ?`,
        [item.variant_id, item.product_id]
      );
      if (!variants.length) throw new Error('Variant tidak ditemukan.');
      const v = variants[0];
      const qty = parseInt(item.quantity) || 1;
      if (v.stock < qty) throw new Error(`Stok ${v.product_name} (${v.model} - ${v.variant_name}) tidak cukup.`);

      if (!groups[v.seller_id]) groups[v.seller_id] = { items: [], productTotal: 0, weight: 0 };
      const price = parseFloat(v.price) || 0;
      groups[v.seller_id].items.push({ ...item, variant: v, quantity: qty, price, cost_price: v.cost_price });
      groups[v.seller_id].productTotal += price * qty;
      groups[v.seller_id].weight += (parseFloat(v.weight) || parseFloat(v.product_weight) || 100) * qty;
    }

    const orderIds = [];
    let totalAll = 0;

    for (const [sellerId, group] of Object.entries(groups)) {
      const [sellerRows] = await conn.query('SELECT store_origin_id FROM users WHERE id = ?', [sellerId]);
      const sellerHasOrigin = !!(sellerRows[0]?.store_origin_id);
      const shipOpt = shipping_options?.[sellerId] || {};
      const shipCost = sellerHasOrigin ? (parseFloat(shipOpt.cost ?? shipping_cost) || 0) : 0;
      const isCod = payType === 'cod' || shipping_cod || !sellerHasOrigin;

      if (!sellerHasOrigin && payType === 'balance') {
        throw new Error(`Toko tidak mendukung pengiriman dengan saldo. Gunakan COD untuk produk dari toko ini.`);
      }
      if (sellerHasOrigin && payType !== 'cod' && !shipping_cod && !shipOpt.cost && shipOpt.cost !== 0) {
        throw new Error('Ongkir belum dihitung untuk semua toko.');
      }
      const orderTotal = group.productTotal + shipCost;
      totalAll += orderTotal;

      const orderNumber = generateOrderNumber();
      const [or] = await conn.query(
        `INSERT INTO orders (order_number, buyer_id, seller_id, total_amount, product_total, status, payment_type,
          shipping_address, recipient_name, recipient_phone, notes, order_date, shipping_cost, shipping_courier,
          shipping_service, shipping_etd, shipping_cod, destination_id) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [orderNumber, req.user.id, sellerId, orderTotal, group.productTotal, payType,
          shipping_address, recipient_name, recipient_phone, notes || null, shipCost,
          shipOpt.courier || shipping_courier, shipOpt.service || shipping_service, shipOpt.etd || shipping_etd,
          isCod ? 1 : 0, destination_id || null]
      );

      for (const item of group.items) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, sku, product_name, model, variant_name, quantity, price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [or.insertId, item.product_id, item.variant_id, item.variant.sku, item.variant.product_name,
            item.variant.model, item.variant.variant_name, item.quantity, item.price, item.variant.cost_price]
        );
        await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variant_id]);
        await conn.query('INSERT INTO stock_logs (variant_id, type, quantity, reference, log_date) VALUES (?, "out", ?, ?, NOW())',
          [item.variant_id, item.quantity, `Order ${orderNumber}`]);
        await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      if (payType === 'balance') {
        await recordBalance(conn, req.user.id, 'purchase', -orderTotal, orderNumber, `Pembelian ${orderNumber}`);
        await conn.query('UPDATE orders SET balance_used = ? WHERE id = ?', [orderTotal, or.insertId]);
      }

      orderIds.push({ id: or.insertId, order_number: orderNumber, seller_id: sellerId, total: orderTotal });
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Pesanan berhasil dibuat.', data: { orders: orderIds, total: totalAll } });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ success: false, message: e.message || 'Gagal membuat pesanan.' });
  } finally {
    conn.release();
  }
});

const getOrdersHandler = async (req, res, roleFilter) => {
  const { page, limit, offset, search } = paginate(req);
  const { status } = req.query;
  let q = `SELECT o.*, buyer.name as buyer_name, seller.store_name as seller_name
    FROM orders o JOIN users buyer ON o.buyer_id = buyer.id JOIN users seller ON o.seller_id = seller.id WHERE 1=1`;
  let cq = `SELECT COUNT(*) as total FROM orders o
    JOIN users buyer ON o.buyer_id = buyer.id JOIN users seller ON o.seller_id = seller.id WHERE 1=1`;
  const p = [];
  if (roleFilter === 'pembeli') { q += ' AND o.buyer_id = ?'; cq += ' AND o.buyer_id = ?'; p.push(req.user.id); }
  if (roleFilter === 'seller') { q += ' AND o.seller_id = ?'; cq += ' AND o.seller_id = ?'; p.push(req.user.id); }
  if (status) { q += ' AND o.status = ?'; cq += ' AND o.status = ?'; p.push(status); }
  if (search) {
    q += ' AND (o.order_number LIKE ? OR buyer.name LIKE ? OR seller.store_name LIKE ?)';
    cq += ' AND (o.order_number LIKE ? OR buyer.name LIKE ? OR seller.store_name LIKE ?)';
    p.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  q += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  const [rows] = await db.query(q, [...p, limit, offset]);
  const [[{ total }]] = await db.query(cq, p);
  res.json(paginationResponse(rows, page, limit, total));
};

app.get('/api/orders', authenticateToken, authorizeRoles(...MEMBER_ROLES), (req, res) => getOrdersHandler(req, res, 'pembeli'));
app.get('/api/seller/orders', authenticateToken, authorizeRoles(...MEMBER_ROLES), (req, res) => getOrdersHandler(req, res, 'seller'));
app.get('/api/admin/orders', authenticateToken, authorizeRoles('admin'), (req, res) => getOrdersHandler(req, res, 'admin'));

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  const [orders] = await db.query(
    `SELECT o.*, buyer.name as buyer_name, seller.store_name as seller_name
     FROM orders o JOIN users buyer ON o.buyer_id = buyer.id JOIN users seller ON o.seller_id = seller.id WHERE o.id = ?`,
    [req.params.id]
  );
  if (!orders.length) return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });
  const order = orders[0];
  if (isMember(req.user.role) && order.buyer_id !== req.user.id && order.seller_id !== req.user.id) return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  order.items = items;
  res.json({ success: true, data: order });
});

app.patch('/api/orders/:id/status', authenticateToken, authorizeRoles(...MEMBER_ROLES, 'admin'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status } = req.body;
    const valid = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid.' });

    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });
    const order = orders[0];
    if (req.user.role !== 'admin' && order.seller_id !== req.user.id) return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    if (status === 'cancelled' && !['delivered', 'completed', 'cancelled'].includes(order.status)) {
      const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        await conn.query('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [item.quantity, item.variant_id]);
      }
      if (order.payment_type === 'balance' && parseFloat(order.balance_used) > 0) {
        await recordBalance(conn, order.buyer_id, 'refund', parseFloat(order.balance_used), order.order_number, `Refund ${order.order_number}`);
      }
    }

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);

    if (['delivered', 'completed'].includes(status)) {
      await releaseSellerPayout(conn, { ...order, status });
    }

    await conn.commit();
    res.json({ success: true, message: 'Status order diperbarui.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    conn.release();
  }
});

// Seller dashboard stats
app.get('/api/seller/dashboard', authenticateToken, authorizeRoles(...MEMBER_ROLES), async (req, res) => {
  const sellerId = req.user.id;
  const [[rev]] = await db.query(
    `SELECT COALESCE(SUM(product_total),0) as total_revenue, COUNT(*) as total_orders
     FROM orders WHERE seller_id = ? AND status NOT IN ('cancelled')`, [sellerId]
  );
  const [[pending]] = await db.query('SELECT COUNT(*) as c FROM orders WHERE seller_id = ? AND status = "pending"', [sellerId]);
  const [[products]] = await db.query('SELECT COUNT(*) as c FROM products WHERE seller_id = ?', [sellerId]);
  const [[balance]] = await db.query('SELECT balance FROM users WHERE id = ?', [sellerId]);
  const [recent] = await db.query(
    `SELECT DATE(order_date) as date, SUM(product_total) as revenue, COUNT(*) as orders
     FROM orders WHERE seller_id = ? AND status NOT IN ('cancelled') AND order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(order_date) ORDER BY date`, [sellerId]
  );
  res.json({
    success: true,
    data: {
      total_revenue: parseFloat(rev.total_revenue),
      total_orders: rev.total_orders,
      pending_orders: pending.c,
      total_products: products.c,
      balance: parseFloat(balance.balance),
      chart: recent
    }
  });
});

// ============ BALANCE & TOPUP ============

app.get('/api/balance', authenticateToken, async (req, res) => {
  const [users] = await db.query('SELECT balance FROM users WHERE id = ?', [req.user.id]);
  const { page, limit, offset } = paginate(req);
  const [tx] = await db.query('SELECT * FROM balance_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.user.id, limit, offset]);
  const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM balance_transactions WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, data: { balance: parseFloat(users[0]?.balance || 0), transactions: tx }, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
});

app.get('/api/payment-methods', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM payment_methods WHERE is_active = 1');
  res.json({ success: true, data: rows });
});

app.post('/api/topup', authenticateToken, authorizeRoles(...MEMBER_ROLES), upload.single('proof'), async (req, res) => {
  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt < 10000) return res.status(400).json({ success: false, message: 'Minimum topup Rp 10.000.' });
  const proof = req.file ? `/uploads-happy-shopping/${req.file.filename}` : null;
  await db.query('INSERT INTO topup_requests (user_id, amount, proof_image) VALUES (?, ?, ?)', [req.user.id, amt, proof]);
  res.status(201).json({ success: true, message: 'Permintaan topup dikirim. Menunggu konfirmasi admin.' });
});

app.get('/api/topup', authenticateToken, authorizeRoles(...MEMBER_ROLES), async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const [rows] = await db.query('SELECT * FROM topup_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.user.id, limit, offset]);
  const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM topup_requests WHERE user_id = ?', [req.user.id]);
  res.json(paginationResponse(rows, page, limit, total));
});

app.get('/api/admin/topup', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { page, limit, offset, search } = paginate(req);
  const { status } = req.query;
  let q = `SELECT t.*, u.name as user_name, u.username FROM topup_requests t JOIN users u ON t.user_id = u.id WHERE 1=1`;
  let cq = 'SELECT COUNT(*) as total FROM topup_requests t JOIN users u ON t.user_id = u.id WHERE 1=1';
  const p = [];
  if (status) { q += ' AND t.status = ?'; cq += ' AND t.status = ?'; p.push(status); }
  if (search) { q += ' AND (u.name LIKE ? OR u.username LIKE ?)'; cq += ' AND (u.name LIKE ? OR u.username LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
  q += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  const [rows] = await db.query(q, [...p, limit, offset]);
  const [[{ total }]] = await db.query(cq, p);
  res.json(paginationResponse(rows, page, limit, total));
});

app.patch('/api/admin/topup/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status, admin_note } = req.body;
    const [rows] = await conn.query('SELECT * FROM topup_requests WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Topup tidak ditemukan.' });
    const topup = rows[0];
    if (topup.status !== 'pending') return res.status(400).json({ success: false, message: 'Topup sudah diproses.' });

    if (status === 'approved') {
      await recordBalance(conn, topup.user_id, 'topup', parseFloat(topup.amount), `TOPUP-${topup.id}`, 'Topup saldo disetujui admin');
    }
    await conn.query('UPDATE topup_requests SET status = ?, admin_note = ? WHERE id = ?', [status, admin_note || null, topup.id]);
    await conn.commit();
    res.json({ success: true, message: `Topup ${status === 'approved' ? 'disetujui' : 'ditolak'}.` });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    conn.release();
  }
});

app.get('/api/admin/balance/search', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { search } = req.query;
  if (!search) return res.status(400).json({ success: false, message: 'Keyword wajib.' });
  const [users] = await db.query(
    `SELECT id, username, name, role, balance, store_name FROM users
     WHERE role IN ('seller','pembeli') AND (username LIKE ? OR name LIKE ? OR store_name LIKE ?) LIMIT 20`,
    [`%${search}%`, `%${search}%`, `%${search}%`]
  );
  users.forEach(u => { u.balance = parseFloat(u.balance); });
  res.json({ success: true, data: users });
});

app.post('/api/admin/balance/adjust', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { user_id, amount, note } = req.body;
    const amt = parseFloat(amount);
    if (!user_id || !amt) return res.status(400).json({ success: false, message: 'User dan amount wajib.' });
    const newBalance = await recordBalance(conn, user_id, 'adjustment', amt, 'ADMIN-ADJ', note || 'Penyesuaian saldo admin');
    await conn.commit();
    res.json({ success: true, message: 'Saldo disesuaikan.', data: { balance: newBalance } });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    conn.release();
  }
});

app.get('/api/admin/balance/transactions', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { page, limit, offset, search } = paginate(req);
  let q = `SELECT bt.*, u.name as user_name, u.username, u.role FROM balance_transactions bt JOIN users u ON bt.user_id = u.id WHERE 1=1`;
  let cq = 'SELECT COUNT(*) as total FROM balance_transactions bt JOIN users u ON bt.user_id = u.id WHERE 1=1';
  const p = [];
  if (search) { q += ' AND (u.name LIKE ? OR u.username LIKE ? OR bt.reference LIKE ?)'; cq += ' AND (u.name LIKE ? OR u.username LIKE ? OR bt.reference LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  q += ' ORDER BY bt.created_at DESC LIMIT ? OFFSET ?';
  const [rows] = await db.query(q, [...p, limit, offset]);
  const [[{ total }]] = await db.query(cq, p);
  res.json(paginationResponse(rows, page, limit, total));
});

// ============ ADMIN USERS ============

app.get('/api/admin/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { page, limit, offset, search } = paginate(req);
  const { role } = req.query;
  let q = 'SELECT id, username, name, email, phone, role, balance, store_name, is_active, created_at FROM users WHERE 1=1';
  let cq = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
  const p = [];
  if (role) { q += ' AND role = ?'; cq += ' AND role = ?'; p.push(role); }
  if (search) { q += ' AND (username LIKE ? OR name LIKE ? OR store_name LIKE ?)'; cq += ' AND (username LIKE ? OR name LIKE ? OR store_name LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const [rows] = await db.query(q, [...p, limit, offset]);
  rows.forEach(r => { r.balance = parseFloat(r.balance); });
  const [[{ total }]] = await db.query(cq, p);
  res.json(paginationResponse(rows, page, limit, total));
});

app.patch('/api/admin/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { is_active, role, name, email, phone } = req.body;
  await db.query('UPDATE users SET is_active=?, role=?, name=?, email=?, phone=? WHERE id=?', [is_active ? 1 : 0, role, name, email, phone, req.params.id]);
  res.json({ success: true, message: 'User diperbarui.' });
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const [[users]] = await db.query('SELECT COUNT(*) as total, SUM(role="seller") as sellers, SUM(role="pembeli") as buyers FROM users');
  const [[orders]] = await db.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as revenue FROM orders WHERE status NOT IN ("cancelled")');
  const [[products]] = await db.query('SELECT COUNT(*) as total FROM products');
  const [[pendingTopup]] = await db.query('SELECT COUNT(*) as c FROM topup_requests WHERE status = "pending"');
  res.json({ success: true, data: { users, orders, products: products.total, pending_topup: pendingTopup.c } });
});

// ============ CHAT ============

app.get('/api/chat/conversations', authenticateToken, async (req, res) => {
  const asSeller = req.query.as === 'seller';
  const q = asSeller
    ? `SELECT c.*, u.name as partner_name, u.avatar as partner_avatar FROM chat_conversations c JOIN users u ON c.buyer_id = u.id WHERE c.seller_id = ? ORDER BY c.last_message_at DESC`
    : `SELECT c.*, u.store_name as partner_name, u.avatar as partner_avatar FROM chat_conversations c JOIN users u ON c.seller_id = u.id WHERE c.buyer_id = ? ORDER BY c.last_message_at DESC`;
  const [rows] = await db.query(q, [req.user.id]);
  res.json({ success: true, data: rows });
});

app.post('/api/chat/conversations', authenticateToken, authorizeRoles(...MEMBER_ROLES), async (req, res) => {
  const { seller_id, product_id } = req.body;
  if (!seller_id) return res.status(400).json({ success: false, message: 'Seller wajib.' });
  const [existing] = await db.query('SELECT * FROM chat_conversations WHERE buyer_id = ? AND seller_id = ?', [req.user.id, seller_id]);
  if (existing.length) return res.json({ success: true, data: existing[0] });
  const [r] = await db.query('INSERT INTO chat_conversations (buyer_id, seller_id, product_id) VALUES (?, ?, ?)', [req.user.id, seller_id, product_id || null]);
  const [conv] = await db.query('SELECT * FROM chat_conversations WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, data: conv[0] });
});

app.get('/api/chat/conversations/:id/messages', authenticateToken, async (req, res) => {
  const [conv] = await db.query('SELECT * FROM chat_conversations WHERE id = ?', [req.params.id]);
  if (!conv.length) return res.status(404).json({ success: false, message: 'Conversation tidak ditemukan.' });
  const c = conv[0];
  if (req.user.id !== c.buyer_id && req.user.id !== c.seller_id) return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  const [messages] = await db.query(
    `SELECT m.*, u.name as sender_name FROM chat_messages m JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = ? ORDER BY m.created_at ASC`, [req.params.id]
  );
  res.json({ success: true, data: messages });
});

app.post('/api/chat/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const [conv] = await db.query('SELECT * FROM chat_conversations WHERE id = ?', [req.params.id]);
    if (!conv.length) return res.status(404).json({ success: false, message: 'Conversation tidak ditemukan.' });
    const c = conv[0];
    if (req.user.id !== c.buyer_id && req.user.id !== c.seller_id) return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    const sanitized = sanitizeChatMessage(message);
    if (!sanitized.allowed) return res.status(400).json({ success: false, message: sanitized.message });

    const [r] = await db.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, message, original_message, is_filtered) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, sanitized.message, message, sanitized.isFiltered ? 1 : 0]
    );
    await db.query('UPDATE chat_conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?', [sanitized.message, req.params.id]);
    res.status(201).json({ success: true, data: { id: r.insertId, message: sanitized.message, is_filtered: sanitized.isFiltered } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan.' });
  }
});

// ============ SETTINGS & PAYMENT METHODS ADMIN ============

app.get('/api/settings', async (req, res) => {
  const [rows] = await db.query('SELECT `key`, `value` FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({ success: true, data: settings });
});

app.put('/api/admin/settings', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await db.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, value, value]);
  }
  res.json({ success: true, message: 'Settings diperbarui.' });
});

app.get('/api/admin/payment-methods', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM payment_methods ORDER BY id');
  res.json({ success: true, data: rows });
});

app.post('/api/admin/payment-methods', authenticateToken, authorizeRoles('admin'), upload.single('qr_code_image'), async (req, res) => {
  const { name, type, account_number, account_name, is_active } = req.body;
  const qr = req.file ? `/uploads-happy-shopping/${req.file.filename}` : null;
  await db.query('INSERT INTO payment_methods (name, type, account_number, account_name, qr_code_image, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [name, type, account_number, account_name, qr, is_active === '0' ? 0 : 1]);
  res.status(201).json({ success: true, message: 'Metode pembayaran ditambahkan.' });
});

app.put('/api/admin/payment-methods/:id', authenticateToken, authorizeRoles('admin'), upload.single('qr_code_image'), async (req, res) => {
  const { name, type, account_number, account_name, is_active } = req.body;
  const qr = req.file ? `/uploads-happy-shopping/${req.file.filename}` : req.body.qr_code_image;
  await db.query('UPDATE payment_methods SET name=?, type=?, account_number=?, account_name=?, qr_code_image=COALESCE(?, qr_code_image), is_active=? WHERE id=?',
    [name, type, account_number, account_name, qr, is_active === '0' ? 0 : 1, req.params.id]);
  res.json({ success: true, message: 'Metode pembayaran diperbarui.' });
});

app.delete('/api/admin/payment-methods/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  await db.query('DELETE FROM payment_methods WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Metode pembayaran dihapus.' });
});

app.get('/api/health', (_, res) => res.json({ success: true, message: 'Happy Shopping API is running.' }));

app.listen(PORT, () => console.log(`Happy Shopping API running on port ${PORT}`));
