-- Migration v2: unified user, OTP, store origin
USE `happy_shopping`;

CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `code` VARCHAR(6) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `users`
  MODIFY `email` VARCHAR(100) NOT NULL,
  MODIFY `store_origin_id` VARCHAR(20) DEFAULT NULL;

-- Run once; ignore error if column already exists
ALTER TABLE `users` ADD COLUMN `store_origin_label` VARCHAR(255) DEFAULT NULL AFTER `store_origin_id`;

-- Migrate existing seller role to pembeli (unified account)
UPDATE `users` SET `role` = 'pembeli' WHERE `role` = 'seller';
