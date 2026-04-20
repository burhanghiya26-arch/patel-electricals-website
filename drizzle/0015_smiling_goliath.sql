CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(100),
	`comment` text,
	`isApproved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shippingRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minWeight` decimal(8,2),
	`maxWeight` decimal(8,2),
	`minDistance` int,
	`maxDistance` int,
	`baseCost` decimal(12,2) NOT NULL,
	`costPerKm` decimal(8,2),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shippingRates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `shipping_rates`;