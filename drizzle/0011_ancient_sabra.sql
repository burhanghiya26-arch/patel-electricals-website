CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteName` varchar(255) NOT NULL DEFAULT 'Patel Electricals',
	`siteDescription` text,
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`address` text,
	`paymentGateway` varchar(100) DEFAULT 'Stripe',
	`shippingProvider` varchar(100) DEFAULT 'Custom',
	`taxRate` varchar(10) DEFAULT '18',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
