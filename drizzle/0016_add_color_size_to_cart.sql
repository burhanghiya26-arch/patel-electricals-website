CREATE TABLE `shipping_rates` (
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
	CONSTRAINT `shipping_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `reviews`;--> statement-breakpoint
DROP TABLE `shippingRates`;--> statement-breakpoint
ALTER TABLE `cart_items` ADD `selectedColor` varchar(100);--> statement-breakpoint
ALTER TABLE `cart_items` ADD `selectedSize` varchar(100);