CREATE TABLE `loyalty_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentBalance` int NOT NULL DEFAULT 0,
	`totalEarned` int NOT NULL DEFAULT 0,
	`totalRedeemed` int NOT NULL DEFAULT 0,
	`lastEarnedAt` timestamp,
	`lastRedeemedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pointsPerRupee` decimal(5,2) NOT NULL DEFAULT '1',
	`redemptionRate` decimal(12,2) NOT NULL DEFAULT '1',
	`pointsExpiryDays` int DEFAULT 365,
	`minPointsToRedeem` int DEFAULT 100,
	`maxPointsPerOrder` int,
	`isEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`transactionType` enum('earned','redeemed','expired','adjusted') NOT NULL,
	`points` int NOT NULL,
	`reason` varchar(255),
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`expiryDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referralCode` varchar(50) NOT NULL,
	`referralUrl` text,
	`totalReferred` int DEFAULT 0,
	`totalConverted` int DEFAULT 0,
	`totalEarnings` decimal(12,2) DEFAULT '0',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_links_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `referral_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerRewardAmount` decimal(12,2) NOT NULL,
	`referrerRewardType` enum('cash','points','discount') NOT NULL DEFAULT 'cash',
	`referredRewardAmount` decimal(12,2) NOT NULL,
	`referredRewardType` enum('cash','points','discount') NOT NULL DEFAULT 'discount',
	`minOrderValueForReward` decimal(12,2) DEFAULT '0',
	`maxRewardsPerReferrer` int,
	`referralLinkExpiryDays` int DEFAULT 90,
	`isEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`referralLinkId` int NOT NULL,
	`orderId` int,
	`rewardAmount` decimal(12,2) NOT NULL,
	`rewardType` enum('cash','points','discount') NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `loyalty_points` ADD CONSTRAINT `loyalty_points_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_links` ADD CONSTRAINT `referral_links_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_transactions` ADD CONSTRAINT `referral_transactions_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_transactions` ADD CONSTRAINT `referral_transactions_referredUserId_users_id_fk` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_transactions` ADD CONSTRAINT `referral_transactions_referralLinkId_referral_links_id_fk` FOREIGN KEY (`referralLinkId`) REFERENCES `referral_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_transactions` ADD CONSTRAINT `referral_transactions_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `loyalty_points_user_idx` ON `loyalty_points` (`userId`);--> statement-breakpoint
CREATE INDEX `loyalty_transactions_user_idx` ON `loyalty_transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `loyalty_transactions_order_idx` ON `loyalty_transactions` (`orderId`);--> statement-breakpoint
CREATE INDEX `loyalty_transactions_created_idx` ON `loyalty_transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `referral_links_referrer_idx` ON `referral_links` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_links_code_idx` ON `referral_links` (`referralCode`);--> statement-breakpoint
CREATE INDEX `referral_transactions_referrer_idx` ON `referral_transactions` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_transactions_referred_idx` ON `referral_transactions` (`referredUserId`);--> statement-breakpoint
CREATE INDEX `referral_transactions_order_idx` ON `referral_transactions` (`orderId`);--> statement-breakpoint
CREATE INDEX `referral_transactions_status_idx` ON `referral_transactions` (`status`);