-- Migration v3: email verification on register only
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `email_verified` TINYINT NOT NULL DEFAULT 1;
