-- ============================================================
-- Happy Shopping - Seeder Produk Obat & 3 Seller Apotek
-- Jalankan setelah database.sql atau pada DB yang sudah ada
-- mysql -u root -p happy_shopping < backend/sql/seeder-produk-obat.sql
-- ============================================================

USE `happy_shopping`;

-- Password semua seller: seller123
-- Hash: $2b$10$5F2mIjXQYWAROfyevibHS.gCFSsJ4qqoRtDDSCMnToE9yk2oY0wJS

SET FOREIGN_KEY_CHECKS = 0;

-- Bersihkan data demo lama (fashion)
DELETE FROM `chat_messages`;
DELETE FROM `chat_conversations`;
DELETE FROM `order_items`;
DELETE FROM `orders`;
DELETE FROM `stock_logs`;
DELETE FROM `pricing_tiers`;
DELETE FROM `product_variants`;
DELETE FROM `products`;
DELETE FROM `users` WHERE `role` = 'seller';

SET FOREIGN_KEY_CHECKS = 1;

-- Kategori Kesehatan & Obat
INSERT INTO `categories` (`name`, `slug`, `icon`) VALUES
('Kesehatan & Obat', 'kesehatan-obat', 'HeartPulse'),
('Obat Batuk & Flu', 'obat-batuk-flu', 'Thermometer'),
('Obat Demam & Nyeri', 'obat-demam-nyeri', 'Pill'),
('Obat Pencernaan', 'obat-pencernaan', 'Stethoscope')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET @cat_obat = (SELECT id FROM categories WHERE slug = 'kesehatan-obat' LIMIT 1);
SET @cat_batuk = (SELECT id FROM categories WHERE slug = 'obat-batuk-flu' LIMIT 1);
SET @cat_demam = (SELECT id FROM categories WHERE slug = 'obat-demam-nyeri' LIMIT 1);
SET @cat_pencernaan = (SELECT id FROM categories WHERE slug = 'obat-pencernaan' LIMIT 1);

-- ============================================================
-- 3 SELLER APOTEK
-- ============================================================
INSERT INTO `users` (`username`, `password`, `name`, `email`, `phone`, `role`, `balance`, `store_name`, `store_description`, `store_address`, `store_origin_id`) VALUES
('apotek_sehat', '$2b$10$5F2mIjXQYWAROfyevibHS.gCFSsJ4qqoRtDDSCMnToE9yk2oY0wJS', 'Apotek Sehat Farma', 'sehat@happyshopping.id', '081210001001', 'seller', 0, 'Apotek Sehat Farma', 'Apotek terpercaya menjual obat batuk, flu, dan produk kesehatan original.', 'Jl. Merdeka No. 12, Bandung', '5242'),
('apotek_mitra', '$2b$10$5F2mIjXQYWAROfyevibHS.gCFSsJ4qqoRtDDSCMnToE9yk2oY0wJS', 'Apotek Mitra Sejahtera', 'mitra@happyshopping.id', '081210002002', 'seller', 0, 'Apotek Mitra Sejahtera', 'Menyediakan obat demam, nyeri, dan vitamin dengan harga kompetitif.', 'Jl. Sudirman No. 45, Jakarta Selatan', '5242'),
('apotek_cita', '$2b$10$5F2mIjXQYWAROfyevibHS.gCFSsJ4qqoRtDDSCMnToE9yk2oY0wJS', 'Apotek Cita Medika', 'cita@happyshopping.id', '081210003003', 'seller', 0, 'Apotek Cita Medika', 'Spesialis obat pencernaan, vitamin, dan produk kesehatan keluarga.', 'Jl. Diponegoro No. 88, Surabaya', '5242');

SET @seller1 = (SELECT id FROM users WHERE username = 'apotek_sehat');
SET @seller2 = (SELECT id FROM users WHERE username = 'apotek_mitra');
SET @seller3 = (SELECT id FROM users WHERE username = 'apotek_cita');

-- ============================================================
-- PRODUK OBAT (gambar = URL eksternal)
-- ============================================================

INSERT INTO `products` (`seller_id`, `category_id`, `name`, `slug`, `description`, `price`, `weight`, `images`, `status`, `sold_count`) VALUES
-- Seller 1: Apotek Sehat Farma
(@seller1, @cat_batuk, 'Samcodin 1 Box (100 Tablet)', 'samcodin-1-box',
 '<p><strong>Samcodin</strong> obat batuk produksi Samco Farma. Mengandung Dextromethorphan HBr, Chlorpheniramine Maleate, dan Guaifenesin.</p><p>Indikasi: batuk berdahak, flu, pilek, alergi. Kemasan 1 box isi 10 strip @ 10 tablet.</p><p>Obat bebas terbatas. Baca aturan pakai sebelum digunakan.</p>',
 102000, 120, '["https://img.mbizmarket.co.id/products/thumbs/800x800/2022/08/30/fe144a396ea3dcfd30e43c9f56360894.jpg"]', 'active', 45),

(@seller1, @cat_batuk, 'Seledryl 1 Box (120 Kaplet)', 'seledryl-1-box',
 '<p><strong>Seledryl</strong> obat batuk dari PT Sejahtera Lestari Farma. Mengandung Guaifenesin, Dextromethorphan HBr, dan Chlorpheniramine Maleate.</p><p>Merupakan obat batuk dan pilek untuk meredakan batuk berdahak dan gejala alergi. Kemasan 1 box isi 12 strip @ 10 kaplet.</p>',
 122200, 130, '["https://images.tokopedia.net/img/jbZAUJ/2024/12/13/fda11b59-552f-466f-ad1a-fb7d745b49bb.png"]', 'active', 38),

(@seller1, @cat_batuk, 'OBH Combi Batuk Flu', 'obh-combi-batuk-flu',
 '<p><strong>OBH Combi</strong> untuk meredakan batuk tidak berdahak, pilek, dan demam ringan. Mengandung Paracetamol, Dextromethorphan, dan Pseudoephedrine.</p>',
 18500, 100, '["https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_c4a7238b-7462-4163-92b7-6f662da73fca.png"]', 'active', 92),

(@seller1, @cat_batuk, 'Woods Peppermint Antiseptic', 'woods-peppermint',
 '<p><strong>Woods Peppermint</strong> lozenges/permen hisap antiseptik untuk meredakan sakit tenggorokan dan batuk ringan. Rasa mint segar.</p>',
 22000, 80, '["https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/16c215e6-2017-4dfc-9b25-403508b01343.png"]', 'active', 67),

-- Seller 2: Apotek Mitra Sejahtera
(@seller2, @cat_demam, 'Panadol Extra', 'panadol-extra',
 '<p><strong>Panadol Extra</strong> tablet untuk meredakan sakit kepala, demam, dan nyeri ringan. Mengandung Paracetamol 500mg dan Caffeine.</p>',
 15000, 50, '["https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/af25f92f-403c-4705-9849-d3faeb628ed8.png"]', 'active', 156),

(@seller2, @cat_demam, 'Bodrex Tablet', 'bodrex-tablet',
 '<p><strong>Bodrex</strong> obat pereda nyeri dan penurun demam. Mengandung Paracetamol untuk sakit kepala, gigi, dan demam.</p>',
 8000, 40, '["https://images.tokopedia.net/img/cache/700/attachment/2017/4/27/707/707_8cd32fca-31c5-47a5-b8d2-ba5a77bb5910.jpg"]', 'active', 203),

(@seller2, @cat_demam, 'Mixagrip Flu', 'mixagrip-flu',
 '<p><strong>Mixagrip Flu</strong> untuk meredakan gejala flu seperti demam, sakit kepala, hidung tersumbat, dan bersin. Obat bebas terbatas.</p>',
 12000, 60, '["https://images.tokopedia.net/img/cache/700/attachment/2020/3/16/77305583/77305583_05a9e001-e041-49cc-b7ce-c5cebd79d308.png"]', 'active', 88),

(@seller2, @cat_demam, 'Oskadon Tablet', 'oskadon-tablet',
 '<p><strong>Oskadon</strong> obat penurun demam dan pereda nyeri. Mengandung Paracetamol, cocok untuk demam dan sakit kepala.</p>',
 6000, 40, '["https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_aeea9ace-0604-4051-beab-c1ed5ef070dd.png"]', 'active', 134),

-- Seller 3: Apotek Cita Medika
(@seller3, @cat_pencernaan, 'Promag Tablet', 'promag-tablet',
 '<p><strong>Promag</strong> obat maag dan gangguan pencernaan. Mengandung Aluminium Hydroxide, Magnesium Hydroxide, dan Simethicone.</p>',
 14000, 70, '["https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_5acc68fd-38d6-4d7f-a4e4-b29737d5f59c.png"]', 'active', 175),

(@seller3, @cat_pencernaan, 'Polysilane Obat Kembung', 'polysilane-kembung',
 '<p><strong>Polysilane</strong> untuk mengatasi kembung, perut kembung, dan gangguan pencernaan akibat gas berlebih.</p>',
 28000, 90, '["https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/82120085/82120085_5761ad57-1669-42a8-8cec-a89057709131.png"]', 'active', 54),

(@seller3, @cat_obat, 'Vitamin C IPI 50 Tablet', 'vitamin-c-ipi',
 '<p><strong>Vitamin C IPI</strong> suplemen vitamin C 1000mg untuk daya tahan tubuh. Kemasan botol 50 tablet.</p>',
 35000, 100, '["https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/1cd9656f-3a5d-4ac5-992c-1d0ee9bc7929.png"]', 'active', 41),

(@seller3, @cat_batuk, 'Komix Herbal Batuk', 'komix-herbal-batuk',
 '<p><strong>Komix</strong> sirup batuk herbal tradisional untuk meredakan batuk dan throat irritation. Rasa jahe madu.</p>',
 16000, 200, '["https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/303e697b-5e60-4367-bfb2-31be809fb710.png"]', 'active', 73);

-- ============================================================
-- VARIANT PRODUK
-- ============================================================

-- Samcodin (product id auto, use variables via slug lookup)
SET @p_samcodin = (SELECT id FROM products WHERE slug = 'samcodin-1-box');
SET @p_seledryl = (SELECT id FROM products WHERE slug = 'seledryl-1-box');
SET @p_obh = (SELECT id FROM products WHERE slug = 'obh-combi-batuk-flu');
SET @p_woods = (SELECT id FROM products WHERE slug = 'woods-peppermint');
SET @p_panadol = (SELECT id FROM products WHERE slug = 'panadol-extra');
SET @p_bodrex = (SELECT id FROM products WHERE slug = 'bodrex-tablet');
SET @p_mixagrip = (SELECT id FROM products WHERE slug = 'mixagrip-flu');
SET @p_oskadon = (SELECT id FROM products WHERE slug = 'oskadon-tablet');
SET @p_promag = (SELECT id FROM products WHERE slug = 'promag-tablet');
SET @p_polysilane = (SELECT id FROM products WHERE slug = 'polysilane-kembung');
SET @p_vitc = (SELECT id FROM products WHERE slug = 'vitamin-c-ipi');
SET @p_komix = (SELECT id FROM products WHERE slug = 'komix-herbal-batuk');

INSERT INTO `product_variants` (`product_id`, `sku`, `model`, `variant_name`, `stock`, `price`, `cost_price`, `image`, `weight`) VALUES
-- Samcodin variants
(@p_samcodin, 'HSP-SAM-0001', 'Kemasan', '1 Box (100 Tablet)', 50, 102000, 85000, 'https://img.mbizmarket.co.id/products/thumbs/800x800/2022/08/30/fe144a396ea3dcfd30e43c9f56360894.jpg', 120),
(@p_samcodin, 'HSP-SAM-0002', 'Kemasan', '1 Strip (10 Tablet)', 120, 11000, 7500, 'https://img.mbizmarket.co.id/products/thumbs/800x800/2022/08/30/fe144a396ea3dcfd30e43c9f56360894.jpg', 15),

-- Seledryl variants
(@p_seledryl, 'HSP-SEL-0003', 'Kemasan', '1 Box (120 Kaplet)', 40, 122200, 98000, 'https://images.tokopedia.net/img/jbZAUJ/2024/12/13/fda11b59-552f-466f-ad1a-fb7d745b49bb.png', 130),
(@p_seledryl, 'HSP-SEL-0004', 'Kemasan', '1 Strip (10 Kaplet)', 100, 10500, 8200, 'https://images.tokopedia.net/img/jbZAUJ/2024/12/13/fda11b59-552f-466f-ad1a-fb7d745b49bb.png', 12),

-- OBH Combi
(@p_obh, 'HSP-OBH-0005', 'Kemasan', 'Botol 100ml', 80, 18500, 12000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_c4a7238b-7462-4163-92b7-6f662da73fca.png', 100),
(@p_obh, 'HSP-OBH-0006', 'Kemasan', 'Botol 60ml', 60, 12000, 8000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_c4a7238b-7462-4163-92b7-6f662da73fca.png', 70),

-- Woods
(@p_woods, 'HSP-WOO-0007', 'Rasa', 'Peppermint 15 Lozenges', 90, 22000, 15000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/16c215e6-2017-4dfc-9b25-403508b01343.png', 80),
(@p_woods, 'HSP-WOO-0008', 'Rasa', 'Honey Lemon 15 Lozenges', 75, 22000, 15000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/adb2b41e-68d2-4faf-b814-4b261e7c1405.png', 80),

-- Panadol
(@p_panadol, 'HSP-PAN-0009', 'Kemasan', 'Strip 10 Tablet', 200, 15000, 10000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/af25f92f-403c-4705-9849-d3faeb628ed8.png', 50),
(@p_panadol, 'HSP-PAN-0010', 'Kemasan', 'Box 25 Tablet', 80, 32000, 22000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/af25f92f-403c-4705-9849-d3faeb628ed8.png', 80),

-- Bodrex
(@p_bodrex, 'HSP-BOD-0011', 'Kemasan', 'Strip 4 Tablet', 250, 8000, 5000, 'https://images.tokopedia.net/img/cache/700/attachment/2017/4/27/707/707_8cd32fca-31c5-47a5-b8d2-ba5a77bb5910.jpg', 20),
(@p_bodrex, 'HSP-BOD-0012', 'Kemasan', 'Box 25 Tablet', 100, 35000, 25000, 'https://images.tokopedia.net/img/cache/700/attachment/2017/4/27/707/707_8cd32fca-31c5-47a5-b8d2-ba5a77bb5910.jpg', 40),

-- Mixagrip
(@p_mixagrip, 'HSP-MIX-0013', 'Kemasan', 'Strip 4 Kaplet', 150, 12000, 8000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/16/77305583/77305583_05a9e001-e041-49cc-b7ce-c5cebd79d308.png', 20),
(@p_mixagrip, 'HSP-MIX-0014', 'Kemasan', 'Box 25 Kaplet', 60, 55000, 40000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/16/77305583/77305583_05a9e001-e041-49cc-b7ce-c5cebd79d308.png', 60),

-- Oskadon
(@p_oskadon, 'HSP-OSK-0015', 'Kemasan', 'Strip 4 Tablet', 180, 6000, 4000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_aeea9ace-0604-4051-beab-c1ed5ef070dd.png', 20),
(@p_oskadon, 'HSP-OSK-0016', 'Kemasan', 'Box 25 Tablet', 70, 28000, 20000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_aeea9ace-0604-4051-beab-c1ed5ef070dd.png', 40),

-- Promag
(@p_promag, 'HSP-PRO-0017', 'Kemasan', 'Strip 10 Tablet', 160, 14000, 9500, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_5acc68fd-38d6-4d7f-a4e4-b29737d5f59c.png', 30),
(@p_promag, 'HSP-PRO-0018', 'Kemasan', 'Botol 60 Tablet', 55, 65000, 48000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/77305583/77305583_5acc68fd-38d6-4d7f-a4e4-b29737d5f59c.png', 90),

-- Polysilane
(@p_polysilane, 'HSP-POL-0019', 'Kemasan', 'Strip 10 Tablet', 85, 28000, 19000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/82120085/82120085_5761ad57-1669-42a8-8cec-a89057709131.png', 30),
(@p_polysilane, 'HSP-POL-0020', 'Kemasan', 'Botol 30 Tablet', 40, 72000, 55000, 'https://images.tokopedia.net/img/cache/700/attachment/2020/3/18/82120085/82120085_5761ad57-1669-42a8-8cec-a89057709131.png', 80),

-- Vitamin C
(@p_vitc, 'HSP-VIT-0021', 'Kemasan', 'Botol 50 Tablet', 65, 35000, 25000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/1cd9656f-3a5d-4ac5-992c-1d0ee9bc7929.png', 100),
(@p_vitc, 'HSP-VIT-0022', 'Kemasan', 'Botol 100 Tablet', 35, 62000, 45000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/1cd9656f-3a5d-4ac5-992c-1d0ee9bc7929.png', 150),

-- Komix
(@p_komix, 'HSP-KOM-0023', 'Kemasan', 'Botol 100ml', 95, 16000, 11000, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/303e697b-5e60-4367-bfb2-31be809fb710.png', 200),
(@p_komix, 'HSP-KOM-0024', 'Kemasan', 'Botol 60ml', 70, 11000, 7500, 'https://images.tokopedia.net/img/cache/700/WgKiGm/2021/6/23/303e697b-5e60-4367-bfb2-31be809fb710.png', 130);

-- Stock logs awal
INSERT INTO `stock_logs` (`variant_id`, `type`, `quantity`, `reference`, `log_date`)
SELECT id, 'in', stock, 'Seeder Initial Stock', NOW() FROM product_variants;

-- Update banner agar relevan dengan apotek
UPDATE `banners` SET
  `title` = 'Belanja Obat & Kesehatan',
  `subtitle` = 'Produk original dari apotek terpercaya di Happy Shopping',
  `link_url` = '/products'
WHERE `id` = 1;

UPDATE `banners` SET
  `title` = 'Samcodin & Seledryl Ready Stock',
  `subtitle` = 'Obat batuk dan flu tersedia dari berbagai apotek seller',
  `link_url` = '/products'
WHERE `id` = 2;

SELECT 'Seeder produk obat berhasil!' AS status,
  (SELECT COUNT(*) FROM users WHERE role = 'seller') AS total_seller,
  (SELECT COUNT(*) FROM products) AS total_produk,
  (SELECT COUNT(*) FROM product_variants) AS total_variant;
