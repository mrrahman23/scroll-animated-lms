CREATE TABLE `auth_attempts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`ip_hash` varchar(64) NOT NULL,
	`success` boolean NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auth_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certification_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`partner_id` varchar(64) NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`batch` varchar(64) NOT NULL,
	`learners` json NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`note` text,
	`submitted_by` varchar(64) NOT NULL,
	`reviewed_by` varchar(64),
	`reviewed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`user_id` varchar(64) NOT NULL,
	`lesson_id` varchar(64) NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_progress_user_id_lesson_id_pk` PRIMARY KEY(`user_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`ip_hash` varchar(64),
	`user_agent` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`assessment_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`content` text,
	`link` varchar(500),
	`status` enum('submitted','graded') NOT NULL DEFAULT 'submitted',
	`score` int,
	`feedback` text,
	`graded_by` varchar(64),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`graded_at` datetime,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submissions_unique` UNIQUE(`assessment_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `enrollments` MODIFY COLUMN `status` enum('pending','active','completed','paused') NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `enrollment_id` varchar(64);--> statement-breakpoint
ALTER TABLE `payments` ADD `transaction_ref` varchar(64);--> statement-breakpoint
ALTER TABLE `payments` ADD `verified_by` varchar(64);--> statement-breakpoint
ALTER TABLE `payments` ADD `verified_at` datetime;--> statement-breakpoint
ALTER TABLE `payments` ADD `note` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `auth_attempts_ip_idx` ON `auth_attempts` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `auth_attempts_email_idx` ON `auth_attempts` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `certification_requests_partner_idx` ON `certification_requests` (`partner_id`,`status`);--> statement-breakpoint
CREATE INDEX `lesson_progress_course_idx` ON `lesson_progress` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `submissions_course_idx` ON `submissions` (`course_id`,`status`);--> statement-breakpoint
-- Preserve existing per-learner results before dropping them from the definitions table
INSERT IGNORE INTO `submissions` (`assessment_id`, `user_id`, `course_id`, `status`, `score`, `graded_at`)
SELECT a.`id`, e.`user_id`, a.`course_id`, IF(a.`status` = 'graded', 'graded', 'submitted'), a.`score`, IF(a.`status` = 'graded', NOW(), NULL)
FROM `assessments` a JOIN `enrollments` e ON e.`course_id` = a.`course_id`
WHERE a.`status` IN ('submitted', 'graded');--> statement-breakpoint
ALTER TABLE `assessments` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `assessments` DROP COLUMN `score`;