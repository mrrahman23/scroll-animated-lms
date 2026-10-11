CREATE TABLE `certificate_details` (
	`certificate_id` varchar(32) NOT NULL,
	`legacy_student_id` int,
	`roll_no` varchar(32),
	`reg_no` varchar(32),
	`father_name` varchar(191),
	`mother_name` varchar(191),
	`student_type` varchar(32),
	`institute` varchar(255),
	`course_duration` varchar(100),
	`batch` varchar(100),
	`cgpa` varchar(8),
	`photo` varchar(255),
	`scan` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_details_certificate_id` PRIMARY KEY(`certificate_id`),
	CONSTRAINT `certificate_details_legacy_idx` UNIQUE(`legacy_student_id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_subjects` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`certificate_id` varchar(32) NOT NULL,
	`semester` int NOT NULL DEFAULT 0,
	`code` varchar(32),
	`name` varchar(255) NOT NULL,
	`grade` varchar(8),
	`grade_point` varchar(8),
	`marks` varchar(8),
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `certificate_subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `certificate_details_reg_roll_idx` ON `certificate_details` (`reg_no`,`roll_no`);--> statement-breakpoint
CREATE INDEX `certificate_details_roll_idx` ON `certificate_details` (`roll_no`);--> statement-breakpoint
CREATE INDEX `certificate_subjects_cert_idx` ON `certificate_subjects` (`certificate_id`,`sort`);