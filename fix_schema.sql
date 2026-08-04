USE apponexthrms;

-- 1. Create workflow_approvals table
CREATE TABLE IF NOT EXISTS `workflow_approvals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL DEFAULT (UUID()),
  `organization_id` int NOT NULL,
  `module_type` varchar(255) NOT NULL,
  `reference_id` int NOT NULL,
  `applicant_id` int NOT NULL,
  `approver_role` varchar(255) DEFAULT NULL,
  `approver_id` int DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Pending',
  `details` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_approvals_uuid_unique` (`uuid`)
);

-- 2. Add grade to employees
-- Check if grade exists first to avoid error, since MySQL doesn't have ADD COLUMN IF NOT EXISTS in all versions, 
-- we can just try it. If it fails we ignore.
ALTER TABLE `employees` ADD COLUMN `grade` varchar(100) NULL;

-- 3. Add paid_type to leave_types
ALTER TABLE `leave_types` ADD COLUMN `paid_type` enum('paid','unpaid','half_paid') DEFAULT 'paid';

