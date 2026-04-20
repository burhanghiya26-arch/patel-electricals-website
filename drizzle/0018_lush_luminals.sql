CREATE TABLE `customer_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`adminId` int NOT NULL,
	`noteType` enum('call','email','meeting','follow_up','issue','feedback','other') NOT NULL,
	`subject` varchar(255),
	`content` text NOT NULL,
	`isInternal` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_segments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`segment` enum('vip','regular','inactive','new','at_risk','high_value') NOT NULL,
	`reason` text,
	`totalSpent` decimal(12,2) DEFAULT '0',
	`orderCount` int DEFAULT 0,
	`lastOrderDate` timestamp,
	`avgOrderValue` decimal(12,2) DEFAULT '0',
	`daysSinceLastOrder` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_segments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_segments` ADD CONSTRAINT `customer_segments_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `customer_notes_customer_idx` ON `customer_notes` (`customerId`);--> statement-breakpoint
CREATE INDEX `customer_notes_admin_idx` ON `customer_notes` (`adminId`);--> statement-breakpoint
CREATE INDEX `customer_notes_created_idx` ON `customer_notes` (`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_segments_customer_idx` ON `customer_segments` (`customerId`);--> statement-breakpoint
CREATE INDEX `customer_segments_segment_idx` ON `customer_segments` (`segment`);