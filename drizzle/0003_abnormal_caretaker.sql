CREATE TABLE `pin_code_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pinCodeStart` varchar(6) NOT NULL,
	`pinCodeEnd` varchar(6) NOT NULL,
	`zone` varchar(50) NOT NULL,
	`shippingCost` decimal(12,2) NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pin_code_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pin_code_start_idx` ON `pin_code_zones` (`pinCodeStart`);