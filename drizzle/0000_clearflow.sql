CREATE TABLE `businesses` (
  `id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `category` text NOT NULL,
  `city` text NOT NULL, `address` text DEFAULT '' NOT NULL, `phone` text DEFAULT '' NOT NULL,
  `email` text DEFAULT '' NOT NULL, `website_url` text, `place_id` text, `maps_url` text,
  `rating` real, `review_count` integer, `source` text DEFAULT 'manual' NOT NULL,
  `source_refreshed_at` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `business_place_idx` ON `businesses` (`place_id`);
CREATE INDEX `business_city_idx` ON `businesses` (`city`);

CREATE TABLE `leads` (
  `id` text PRIMARY KEY NOT NULL, `business_id` text NOT NULL, `contact_name` text DEFAULT '' NOT NULL,
  `phone` text DEFAULT '' NOT NULL, `email` text DEFAULT '' NOT NULL, `stage` text DEFAULT 'researched' NOT NULL,
  `required_services` text DEFAULT '[]' NOT NULL, `budget_min` integer, `budget_max` integer,
  `score` integer DEFAULT 0 NOT NULL, `priority` text DEFAULT 'low' NOT NULL,
  `website_need_score` integer DEFAULT 0 NOT NULL, `business_potential_score` integer DEFAULT 0 NOT NULL,
  `digital_gaps` text DEFAULT '[]' NOT NULL, `pitch_angle` text DEFAULT '' NOT NULL,
  `last_contact_at` text, `next_action_at` text, `notes` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`)
);
CREATE INDEX `lead_pipeline_idx` ON `leads` (`priority`,`stage`);
CREATE UNIQUE INDEX `lead_business_idx` ON `leads` (`business_id`);

CREATE TABLE `consents` (
  `id` text PRIMARY KEY NOT NULL, `lead_id` text NOT NULL, `channel` text NOT NULL,
  `purpose` text DEFAULT 'marketing' NOT NULL, `status` text NOT NULL, `source` text NOT NULL,
  `proof` text NOT NULL, `text_version` text DEFAULT 'v1' NOT NULL,
  `captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `revoked_at` text,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`)
);
CREATE INDEX `consent_lookup_idx` ON `consents` (`lead_id`,`channel`,`status`);

CREATE TABLE `suppressions` (
  `id` text PRIMARY KEY NOT NULL, `lead_id` text NOT NULL, `channel` text NOT NULL,
  `reason` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`)
);
CREATE UNIQUE INDEX `suppression_unique_idx` ON `suppressions` (`lead_id`,`channel`);

CREATE TABLE `messages` (
  `id` text PRIMARY KEY NOT NULL, `lead_id` text, `direction` text NOT NULL,
  `channel` text NOT NULL, `body` text NOT NULL, `provider_message_id` text,
  `status` text DEFAULT 'queued' NOT NULL, `campaign` text DEFAULT 'support' NOT NULL,
  `sent_at` text, `delivered_at` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`)
);
CREATE UNIQUE INDEX `provider_message_idx` ON `messages` (`provider_message_id`);
CREATE INDEX `message_lead_idx` ON `messages` (`lead_id`,`created_at`);

CREATE TABLE `followup_jobs` (
  `id` text PRIMARY KEY NOT NULL, `lead_id` text NOT NULL, `channel` text NOT NULL,
  `step` integer NOT NULL, `run_at` text NOT NULL, `status` text DEFAULT 'scheduled' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL, `idempotency_key` text NOT NULL, `last_error` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`)
);
CREATE UNIQUE INDEX `followup_idempotency_idx` ON `followup_jobs` (`idempotency_key`);
CREATE INDEX `followup_due_idx` ON `followup_jobs` (`status`,`run_at`);

CREATE TABLE `events` (
  `id` text PRIMARY KEY NOT NULL, `event_type` text NOT NULL, `entity_type` text NOT NULL,
  `entity_id` text NOT NULL, `payload` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `event_type_idx` ON `events` (`event_type`,`created_at`);
