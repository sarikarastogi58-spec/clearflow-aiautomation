CREATE TABLE `provider_connections` (
	`provider` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'not_connected' NOT NULL,
	`last_tested_at` text,
	`last_error` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vault_secrets` (
	`name` text PRIMARY KEY NOT NULL,
	`encrypted_value` text NOT NULL,
	`iv` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
