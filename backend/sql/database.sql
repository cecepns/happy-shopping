CREATE DATABASE IF NOT EXISTS `happy_shopping`;
USE `happy_shopping`;

DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_conversations`;
DROP TABLE IF EXISTS `balance_transactions`;
DROP TABLE IF EXISTS `topup_requests`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `stock_logs`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `pricing_tiers`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `payment_methods`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('admin', 'seller', 'pembeli') NOT NULL DEFAULT 'pembeli',
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `store_name` VARCHAR(150) DEFAULT NULL,
  `store_description` TEXT DEFAULT NULL,
  `store_address` TEXT DEFAULT NULL,
  `store_origin_id` VARCHAR(20) DEFAULT '5242',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `settings` (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `payment_methods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('bank', 'qris') NOT NULL,
  `account_number` VARCHAR(50) DEFAULT NULL,
  `account_name` VARCHAR(100) DEFAULT NULL,
  `qr_code_image` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL UNIQUE,
  `icon` VARCHAR(50) DEFAULT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_id` INT NOT NULL,
  `category_id` INT DEFAULT NULL,
  `name` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL,
  `description` LONGTEXT,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `weight` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  `images` TEXT,
  `status` ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
  `sold_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_seller_slug` (`seller_id`, `slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product_variants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `sku` VARCHAR(50) DEFAULT NULL,
  `model` VARCHAR(100) NOT NULL,
  `variant_name` VARCHAR(100) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cost_price` DECIMAL(10,2) DEFAULT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `weight` DECIMAL(10,2) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_product_variant` (`product_id`, `model`, `variant_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `pricing_tiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `variant_id` INT NOT NULL,
  `min_qty` INT NOT NULL DEFAULT 1,
  `max_qty` INT NOT NULL DEFAULT 999999,
  `price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) UNIQUE NOT NULL,
  `buyer_id` INT NOT NULL,
  `seller_id` INT NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `product_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `payment_type` ENUM('balance', 'cod', 'transfer') NOT NULL DEFAULT 'balance',
  `balance_used` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `seller_payout_status` ENUM('pending', 'released') NOT NULL DEFAULT 'pending',
  `shipping_address` TEXT NOT NULL,
  `recipient_name` VARCHAR(100) DEFAULT NULL,
  `recipient_phone` VARCHAR(20) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `order_date` DATETIME NOT NULL,
  `shipping_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `shipping_courier` VARCHAR(50) DEFAULT NULL,
  `shipping_service` VARCHAR(50) DEFAULT NULL,
  `shipping_etd` VARCHAR(50) DEFAULT NULL,
  `shipping_cod` TINYINT NOT NULL DEFAULT 0,
  `destination_id` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `variant_id` INT NOT NULL,
  `sku` VARCHAR(50) DEFAULT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `model` VARCHAR(100) DEFAULT NULL,
  `variant_name` VARCHAR(100) DEFAULT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `cost_price` DECIMAL(10,2) DEFAULT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `stock_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `variant_id` INT NOT NULL,
  `type` ENUM('in', 'out', 'adjustment') NOT NULL,
  `quantity` INT NOT NULL,
  `reference` VARCHAR(150) DEFAULT NULL,
  `log_date` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `banners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `image` VARCHAR(255) NOT NULL,
  `link_url` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `topup_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `proof_image` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `balance_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('topup', 'purchase', 'payout', 'refund', 'adjustment') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balance_before` DECIMAL(12,2) NOT NULL,
  `balance_after` DECIMAL(12,2) NOT NULL,
  `reference` VARCHAR(150) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `chat_conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `buyer_id` INT NOT NULL,
  `seller_id` INT NOT NULL,
  `product_id` INT DEFAULT NULL,
  `last_message` TEXT DEFAULT NULL,
  `last_message_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_chat` (`buyer_id`, `seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `chat_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT NOT NULL,
  `sender_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `original_message` TEXT DEFAULT NULL,
  `is_filtered` TINYINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed users: admin/admin123, pembeli/pembeli123
-- Seller apotek (3): jalankan seeder-produk-obat.sql
INSERT INTO `users` (`username`, `password`, `name`, `email`, `phone`, `role`, `balance`, `store_name`, `store_description`, `store_address`) VALUES
('admin', '$2b$10$m8XRCfJd282ttwrxT1QL4uwVvg35fVYweO4CjBZhGXvQbK6rKExSi', 'Admin Happy Shopping', 'admin@happyshopping.id', '081234567890', 'admin', 0, NULL, NULL, NULL),
('pembeli', '$2b$10$oW1VBj.ZG13b4jpI8fUh2O2eYibBrn/CmrJIXPYvghM.iMbGSASbC', 'Budi Pembeli', 'pembeli@happyshopping.id', '081998877665', 'pembeli', 500000, NULL, NULL, NULL);

INSERT INTO `settings` (`key`, `value`) VALUES
('site_name', 'Happy Shopping'),
('site_tagline', 'Marketplace Multi Seller Terpercaya'),
('contact_email', 'support@happyshopping.id'),
('contact_phone', '081234567890'),
('shipping_origin', '5242');

INSERT INTO `payment_methods` (`name`, `type`, `account_number`, `account_name`) VALUES
('Transfer Bank BCA', 'bank', '1234567890', 'Happy Shopping Admin'),
('Transfer Bank Mandiri', 'bank', '9876543210', 'Happy Shopping Admin');

INSERT INTO `categories` (`name`, `slug`, `icon`) VALUES
('Kesehatan & Obat', 'kesehatan-obat', 'HeartPulse'),
('Obat Batuk & Flu', 'obat-batuk-flu', 'Thermometer'),
('Obat Demam & Nyeri', 'obat-demam-nyeri', 'Pill'),
('Obat Pencernaan', 'obat-pencernaan', 'Stethoscope');

INSERT INTO `banners` (`title`, `subtitle`, `image`, `link_url`, `sort_order`) VALUES
('Belanja Obat & Kesehatan', 'Produk original dari apotek terpercaya', 'https://images.tokopedia.net/img/jbZAUJ/2024/12/13/fda11b59-552f-466f-ad1a-fb7d745b49bb.png', '/products', 1),
('Samcodin & Seledryl Ready Stock', 'Obat batuk dan flu dari berbagai apotek seller', 'https://img.mbizmarket.co.id/products/thumbs/800x800/2022/08/30/fe144a396ea3dcfd30e43c9f56360894.jpg', '/products', 2);

-- Produk & seller apotek: jalankan seeder terpisah
-- mysql -u root -p happy_shopping < backend/sql/seeder-produk-obat.sql
