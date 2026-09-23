-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: hrms
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addon_billing_history`
--

DROP TABLE IF EXISTS `addon_billing_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addon_billing_history` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_addon_subscription_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `addon_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_subtotal` decimal(10,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'USD',
  `billing_period_start` date DEFAULT NULL,
  `billing_period_end` date DEFAULT NULL,
  `payment_status` enum('pending','paid','failed','refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `payment_method_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method_last4` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripe_charge_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpay_payment_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `invoice_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `addon_billing_history_invoice_number_unique` (`invoice_number`),
  KEY `addon_billing_history_organization_addon_subscription_id_foreign` (`organization_addon_subscription_id`),
  KEY `addon_billing_history_organization_id_foreign` (`organization_id`),
  KEY `addon_billing_history_addon_id_foreign` (`addon_id`),
  KEY `addon_billing_history_payment_status_index` (`payment_status`),
  KEY `addon_billing_history_due_date_index` (`due_date`),
  CONSTRAINT `addon_billing_history_addon_id_foreign` FOREIGN KEY (`addon_id`) REFERENCES `marketplace_addons` (`id`),
  CONSTRAINT `addon_billing_history_organization_addon_subscription_id_foreign` FOREIGN KEY (`organization_addon_subscription_id`) REFERENCES `organization_addon_subscriptions` (`id`),
  CONSTRAINT `addon_billing_history_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `addon_trials`
--

DROP TABLE IF EXISTS `addon_trials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addon_trials` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `addon_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trial_started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `trial_ends_at` timestamp NOT NULL,
  `trial_status` enum('active','converted','expired','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `features_enabled` longtext COLLATE utf8mb4_unicode_ci,
  `conversion_decision` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conversion_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `converted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `addon_trials_organization_id_addon_id_unique` (`organization_id`,`addon_id`),
  KEY `addon_trials_addon_id_foreign` (`addon_id`),
  KEY `addon_trials_trial_status_index` (`trial_status`),
  KEY `addon_trials_trial_ends_at_index` (`trial_ends_at`),
  CONSTRAINT `addon_trials_addon_id_foreign` FOREIGN KEY (`addon_id`) REFERENCES `marketplace_addons` (`id`),
  CONSTRAINT `addon_trials_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_organizations`
--

DROP TABLE IF EXISTS `admin_organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `super_admin_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `admin_role` varchar(50) DEFAULT 'organization_admin',
  `permissions` text,
  `status` varchar(20) DEFAULT 'active',
  `assigned_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_organizations_uuid_unique` (`uuid`),
  KEY `admin_organizations_organization_id_index` (`organization_id`),
  KEY `admin_organizations_user_id_index` (`user_id`),
  KEY `admin_organizations_super_admin_id_index` (`super_admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `advance_recoveries`
--

DROP TABLE IF EXISTS `advance_recoveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advance_recoveries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `advance_id` bigint unsigned NOT NULL,
  `recovery_month` date NOT NULL,
  `recovery_amount` decimal(12,2) NOT NULL,
  `payroll_run_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `advance_recoveries_uuid_unique` (`uuid`),
  KEY `advance_recoveries_payroll_run_id_foreign` (`payroll_run_id`),
  KEY `advance_recoveries_organization_id_index` (`organization_id`),
  KEY `advance_recoveries_advance_id_index` (`advance_id`),
  KEY `advance_recoveries_recovery_month_index` (`recovery_month`),
  CONSTRAINT `advance_recoveries_advance_id_foreign` FOREIGN KEY (`advance_id`) REFERENCES `salary_advances` (`id`),
  CONSTRAINT `advance_recoveries_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `advance_recoveries_payroll_run_id_foreign` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `announcement_posts`
--

DROP TABLE IF EXISTS `announcement_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcement_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `featured_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visibility_level` enum('all_employees','department','role_specific') COLLATE utf8mb4_unicode_ci DEFAULT 'all_employees',
  `visible_to_departments` json DEFAULT NULL,
  `visible_to_roles` json DEFAULT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `priority` enum('low','normal','high') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `published_by` bigint unsigned DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `allow_comments` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `announcement_posts_uuid_unique` (`uuid`),
  KEY `announcement_posts_published_by_foreign` (`published_by`),
  KEY `announcement_posts_created_by_foreign` (`created_by`),
  KEY `announcement_posts_updated_by_foreign` (`updated_by`),
  KEY `announcement_posts_organization_id_index` (`organization_id`),
  KEY `announcement_posts_status_index` (`status`),
  KEY `announcement_posts_priority_index` (`priority`),
  KEY `announcement_posts_published_at_index` (`published_at`),
  KEY `announcement_posts_visibility_level_index` (`visibility_level`),
  CONSTRAINT `announcement_posts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `announcement_posts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `announcement_posts_published_by_foreign` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `announcement_posts_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `announcement_reads`
--

DROP TABLE IF EXISTS `announcement_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcement_reads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `announcement_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `announcement_reads_uuid_unique` (`uuid`),
  UNIQUE KEY `announcement_reads_announcement_id_user_id_unique` (`announcement_id`,`user_id`),
  KEY `announcement_reads_organization_id_index` (`organization_id`),
  KEY `announcement_reads_announcement_id_index` (`announcement_id`),
  KEY `announcement_reads_user_id_index` (`user_id`),
  KEY `announcement_reads_read_at_index` (`read_at`),
  CONSTRAINT `announcement_reads_announcement_id_foreign` FOREIGN KEY (`announcement_id`) REFERENCES `announcement_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `announcement_reads_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `announcement_reads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_stage_history`
--

DROP TABLE IF EXISTS `application_stage_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_stage_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `application_id` int unsigned NOT NULL,
  `from_stage_id` int unsigned DEFAULT NULL,
  `to_stage_id` int unsigned NOT NULL,
  `moved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `moved_by_user_id` int unsigned NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `application_stage_history_uuid_unique` (`uuid`),
  KEY `application_stage_history_application_id_foreign` (`application_id`),
  KEY `application_stage_history_organization_id_index` (`organization_id`),
  CONSTRAINT `application_stage_history_application_id_foreign` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `job_id` int unsigned NOT NULL,
  `application_status` enum('applied','screening','interview','offer','hired','rejected','withdrawn') COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `applied_from_source` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initial_screening_status` enum('pending','passed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `screening_completed_by` int unsigned DEFAULT NULL,
  `screening_completed_at` timestamp NULL DEFAULT NULL,
  `pipeline_stage_id` int unsigned DEFAULT NULL,
  `current_stage_entered_at` timestamp NULL DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `mrf_request_id` bigint unsigned DEFAULT NULL,
  `assigned_recruiter_id` bigint unsigned DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `rejected_at_stage` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `cover_letter` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `applications_organization_id_candidate_id_job_id_unique` (`organization_id`,`candidate_id`,`job_id`),
  UNIQUE KEY `applications_uuid_unique` (`uuid`),
  KEY `applications_candidate_id_foreign` (`candidate_id`),
  KEY `applications_job_id_foreign` (`job_id`),
  KEY `applications_organization_id_index` (`organization_id`),
  KEY `applications_application_status_index` (`application_status`),
  KEY `applications_employee_id_index` (`employee_id`),
  CONSTRAINT `applications_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`),
  CONSTRAINT `applications_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appraisal_ratings`
--

DROP TABLE IF EXISTS `appraisal_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_ratings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `appraisal_id` bigint unsigned NOT NULL,
  `competency_id` bigint unsigned NOT NULL,
  `rating` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appraisal_ratings_uuid_unique` (`uuid`),
  KEY `appraisal_ratings_competency_id_foreign` (`competency_id`),
  KEY `appraisal_ratings_organization_id_index` (`organization_id`),
  KEY `appraisal_ratings_appraisal_id_index` (`appraisal_id`),
  CONSTRAINT `appraisal_ratings_appraisal_id_foreign` FOREIGN KEY (`appraisal_id`) REFERENCES `appraisals` (`id`),
  CONSTRAINT `appraisal_ratings_competency_id_foreign` FOREIGN KEY (`competency_id`) REFERENCES `competencies` (`id`),
  CONSTRAINT `appraisal_ratings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appraisals`
--

DROP TABLE IF EXISTS `appraisals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `cycle_id` bigint unsigned NOT NULL,
  `overall_rating` decimal(5,2) DEFAULT NULL,
  `status` enum('draft','in_progress','completed','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appraisals_uuid_unique` (`uuid`),
  KEY `appraisals_created_by_foreign` (`created_by`),
  KEY `appraisals_updated_by_foreign` (`updated_by`),
  KEY `appraisals_organization_id_index` (`organization_id`),
  KEY `appraisals_employee_id_index` (`employee_id`),
  KEY `appraisals_cycle_id_index` (`cycle_id`),
  KEY `appraisals_status_index` (`status`),
  CONSTRAINT `appraisals_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `appraisals_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `appraisals_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `appraisals_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `appraisals_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assessment_attempts`
--

DROP TABLE IF EXISTS `assessment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_attempts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `application_id` int unsigned NOT NULL,
  `assessment_id` int unsigned NOT NULL,
  `attempt_number` int NOT NULL,
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `score` int DEFAULT NULL,
  `status` enum('in_progress','completed','passed','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `answers_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assessment_attempts_uuid_unique` (`uuid`),
  KEY `assessment_attempts_application_id_foreign` (`application_id`),
  KEY `assessment_attempts_assessment_id_foreign` (`assessment_id`),
  KEY `assessment_attempts_organization_id_index` (`organization_id`),
  CONSTRAINT `assessment_attempts_application_id_foreign` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`),
  CONSTRAINT `assessment_attempts_assessment_id_foreign` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assessment_questions`
--

DROP TABLE IF EXISTS `assessment_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `assessment_id` bigint unsigned NOT NULL,
  `question_number` int NOT NULL DEFAULT '1',
  `question_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('mcq','coding','text','boolean') COLLATE utf8mb4_unicode_ci DEFAULT 'mcq',
  `options_json` json DEFAULT NULL,
  `correct_answer` text COLLATE utf8mb4_unicode_ci,
  `marks` int DEFAULT '1',
  `explanation` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assessment_questions_uuid_unique` (`uuid`),
  KEY `assessment_questions_organization_id_index` (`organization_id`),
  KEY `assessment_questions_assessment_id_index` (`assessment_id`),
  KEY `assessment_questions_question_number_index` (`question_number`),
  CONSTRAINT `assessment_questions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assessment_results`
--

DROP TABLE IF EXISTS `assessment_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_results` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `attempt_id` int unsigned NOT NULL,
  `question_number` int NOT NULL,
  `answer_text` text COLLATE utf8mb4_unicode_ci,
  `is_correct` tinyint(1) NOT NULL,
  `score` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assessment_results_uuid_unique` (`uuid`),
  KEY `assessment_results_attempt_id_foreign` (`attempt_id`),
  KEY `assessment_results_organization_id_index` (`organization_id`),
  CONSTRAINT `assessment_results_attempt_id_foreign` FOREIGN KEY (`attempt_id`) REFERENCES `assessment_attempts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assessments`
--

DROP TABLE IF EXISTS `assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `assessment_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_type` enum('coding','mcq','assignment','form') COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration_minutes` int NOT NULL,
  `passing_score` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `allow_reattempt` tinyint(1) DEFAULT '1',
  `department_id` bigint unsigned DEFAULT NULL,
  `designation_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assessments_uuid_unique` (`uuid`),
  KEY `assessments_organization_id_index` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_assignments`
--

DROP TABLE IF EXISTS `asset_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_assignments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `assignment_type` enum('permanent','temporary') COLLATE utf8mb4_unicode_ci DEFAULT 'permanent',
  `assigned_date` date NOT NULL,
  `expected_return_date` date DEFAULT NULL,
  `status` enum('active','returned','lost','damaged') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `assigned_by` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_assignments_uuid_unique` (`uuid`),
  KEY `asset_assignments_asset_id_foreign` (`asset_id`),
  KEY `asset_assignments_employee_id_foreign` (`employee_id`),
  KEY `asset_assignments_assigned_by_foreign` (`assigned_by`),
  KEY `asset_assignments_organization_id_employee_id_index` (`organization_id`,`employee_id`),
  KEY `asset_assignments_organization_id_asset_id_index` (`organization_id`,`asset_id`),
  KEY `asset_assignments_organization_id_status_index` (`organization_id`,`status`),
  KEY `asset_assignments_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_assignments_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `asset_assignments_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_assignments_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_assignments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_categories`
--

DROP TABLE IF EXISTS `asset_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_categories_uuid_unique` (`uuid`),
  KEY `asset_categories_organization_id_code_index` (`organization_id`,`code`),
  KEY `asset_categories_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_categories_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_maintenance`
--

DROP TABLE IF EXISTS `asset_maintenance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_maintenance` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `maintenance_type` enum('repair','amc','scheduled','preventive') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `vendor_id` int unsigned DEFAULT NULL,
  `cost` decimal(15,2) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `completion_notes` text COLLATE utf8mb4_unicode_ci,
  `completed_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_maintenance_uuid_unique` (`uuid`),
  KEY `asset_maintenance_asset_id_foreign` (`asset_id`),
  KEY `asset_maintenance_vendor_id_foreign` (`vendor_id`),
  KEY `asset_maintenance_completed_by_foreign` (`completed_by`),
  KEY `asset_maintenance_organization_id_asset_id_index` (`organization_id`,`asset_id`),
  KEY `asset_maintenance_organization_id_status_index` (`organization_id`,`status`),
  KEY `asset_maintenance_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_maintenance_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `asset_maintenance_completed_by_foreign` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_maintenance_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `asset_maintenance_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `asset_vendors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_requests`
--

DROP TABLE IF EXISTS `asset_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
  `asset_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specification` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `required_date` date DEFAULT NULL,
  `status` enum('pending','approved','rejected','fulfilled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `requested_by` bigint unsigned NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `fulfilled_by` bigint unsigned DEFAULT NULL,
  `fulfilled_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_requests_uuid_unique` (`uuid`),
  KEY `asset_requests_employee_id_foreign` (`employee_id`),
  KEY `asset_requests_category_id_foreign` (`category_id`),
  KEY `asset_requests_requested_by_foreign` (`requested_by`),
  KEY `asset_requests_approved_by_foreign` (`approved_by`),
  KEY `asset_requests_fulfilled_by_foreign` (`fulfilled_by`),
  KEY `asset_requests_organization_id_status_index` (`organization_id`,`status`),
  KEY `asset_requests_organization_id_employee_id_index` (`organization_id`,`employee_id`),
  KEY `asset_requests_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_requests_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`id`),
  CONSTRAINT `asset_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_requests_fulfilled_by_foreign` FOREIGN KEY (`fulfilled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `asset_requests_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_returns`
--

DROP TABLE IF EXISTS `asset_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_returns` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `return_date` date NOT NULL,
  `condition` enum('good','minor_damage','major_damage','lost') COLLATE utf8mb4_unicode_ci DEFAULT 'good',
  `damage_notes` text COLLATE utf8mb4_unicode_ci,
  `is_recoverable` tinyint(1) DEFAULT '1',
  `recovery_amount` decimal(15,2) DEFAULT NULL,
  `status` enum('pending','completed','processing') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `received_by` bigint unsigned NOT NULL,
  `received_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_returns_uuid_unique` (`uuid`),
  KEY `asset_returns_asset_id_foreign` (`asset_id`),
  KEY `asset_returns_employee_id_foreign` (`employee_id`),
  KEY `asset_returns_received_by_foreign` (`received_by`),
  KEY `asset_returns_organization_id_status_index` (`organization_id`,`status`),
  KEY `asset_returns_organization_id_employee_id_index` (`organization_id`,`employee_id`),
  KEY `asset_returns_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_returns_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `asset_returns_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_returns_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `asset_returns_received_by_foreign` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_transfers`
--

DROP TABLE IF EXISTS `asset_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_transfers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `from_employee_id` bigint unsigned NOT NULL,
  `to_employee_id` bigint unsigned NOT NULL,
  `transfer_date` date NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','approved','rejected','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `requested_by` bigint unsigned NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_transfers_uuid_unique` (`uuid`),
  KEY `asset_transfers_asset_id_foreign` (`asset_id`),
  KEY `asset_transfers_from_employee_id_foreign` (`from_employee_id`),
  KEY `asset_transfers_to_employee_id_foreign` (`to_employee_id`),
  KEY `asset_transfers_requested_by_foreign` (`requested_by`),
  KEY `asset_transfers_approved_by_foreign` (`approved_by`),
  KEY `asset_transfers_organization_id_status_index` (`organization_id`,`status`),
  KEY `asset_transfers_organization_id_asset_id_index` (`organization_id`,`asset_id`),
  KEY `asset_transfers_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_transfers_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_transfers_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `asset_transfers_from_employee_id_foreign` FOREIGN KEY (`from_employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_transfers_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `asset_transfers_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_transfers_to_employee_id_foreign` FOREIGN KEY (`to_employee_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_types`
--

DROP TABLE IF EXISTS `asset_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `type_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `depreciation_rate` decimal(5,2) DEFAULT NULL,
  `warranty_period_months` int DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_types_uuid_unique` (`uuid`),
  UNIQUE KEY `asset_types_organization_id_type_name_unique` (`organization_id`,`type_name`),
  KEY `asset_types_created_by_foreign` (`created_by`),
  KEY `asset_types_updated_by_foreign` (`updated_by`),
  KEY `asset_types_organization_id_index` (`organization_id`),
  CONSTRAINT `asset_types_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `asset_types_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `asset_types_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_vendors`
--

DROP TABLE IF EXISTS `asset_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_vendors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_vendors_uuid_unique` (`uuid`),
  KEY `asset_vendors_organization_id_name_index` (`organization_id`,`name`),
  KEY `asset_vendors_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `asset_vendors_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `asset_type_id` bigint unsigned NOT NULL,
  `asset_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_price` decimal(12,2) DEFAULT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `status` enum('available','allocated','returned','damaged','disposed') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assets_uuid_unique` (`uuid`),
  UNIQUE KEY `assets_organization_id_asset_code_unique` (`organization_id`,`asset_code`),
  KEY `assets_asset_type_id_foreign` (`asset_type_id`),
  KEY `assets_created_by_foreign` (`created_by`),
  KEY `assets_updated_by_foreign` (`updated_by`),
  KEY `assets_organization_id_index` (`organization_id`),
  KEY `assets_status_index` (`status`),
  CONSTRAINT `assets_asset_type_id_foreign` FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types` (`id`),
  CONSTRAINT `assets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `assets_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `assets_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_breaks`
--

DROP TABLE IF EXISTS `attendance_breaks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_breaks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `attendance_record_id` bigint unsigned NOT NULL,
  `break_start_time` timestamp NOT NULL,
  `break_end_time` timestamp NULL DEFAULT NULL,
  `break_duration_minutes` int DEFAULT NULL,
  `break_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `break_setting_id` int unsigned DEFAULT NULL COMMENT 'References breaks.id from settings table',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_breaks_uuid_unique` (`uuid`),
  KEY `attendance_breaks_created_by_foreign` (`created_by`),
  KEY `attendance_breaks_updated_by_foreign` (`updated_by`),
  KEY `attendance_breaks_organization_id_index` (`organization_id`),
  KEY `attendance_breaks_attendance_record_id_index` (`attendance_record_id`),
  KEY `attendance_breaks_status_index` (`status`),
  KEY `attendance_breaks_break_type_index` (`break_type`),
  CONSTRAINT `attendance_breaks_attendance_record_id_foreign` FOREIGN KEY (`attendance_record_id`) REFERENCES `attendance_records` (`id`),
  CONSTRAINT `attendance_breaks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_breaks_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_breaks_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_device_logs`
--

DROP TABLE IF EXISTS `attendance_device_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_device_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `device_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_type` enum('biometric','rfid','qr_scanner','face_recognition','kiosk') COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `punch_time` timestamp NOT NULL,
  `punch_type` enum('check_in','break_in','break_out','check_out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_response_code` int NOT NULL,
  `device_response_message` text COLLATE utf8mb4_unicode_ci,
  `processed` tinyint(1) DEFAULT '0',
  `matched_attendance_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_device_logs_uuid_unique` (`uuid`),
  KEY `attendance_device_logs_location_id_foreign` (`location_id`),
  KEY `attendance_device_logs_matched_attendance_id_foreign` (`matched_attendance_id`),
  KEY `attendance_device_logs_organization_id_index` (`organization_id`),
  KEY `attendance_device_logs_device_id_index` (`device_id`),
  KEY `attendance_device_logs_employee_id_index` (`employee_id`),
  KEY `attendance_device_logs_punch_time_index` (`punch_time`),
  KEY `attendance_device_logs_processed_index` (`processed`),
  KEY `attendance_device_logs_device_id_punch_time_index` (`device_id`,`punch_time`),
  CONSTRAINT `attendance_device_logs_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_device_logs_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`),
  CONSTRAINT `attendance_device_logs_matched_attendance_id_foreign` FOREIGN KEY (`matched_attendance_id`) REFERENCES `attendance_records` (`id`),
  CONSTRAINT `attendance_device_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_geofences`
--

DROP TABLE IF EXISTS `attendance_geofences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_geofences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `location_id` bigint unsigned NOT NULL,
  `geofence_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `radius_meters` int NOT NULL,
  `is_office_location` tinyint(1) DEFAULT '1',
  `allows_remote_work` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_geofences_uuid_unique` (`uuid`),
  KEY `attendance_geofences_created_by_foreign` (`created_by`),
  KEY `attendance_geofences_updated_by_foreign` (`updated_by`),
  KEY `attendance_geofences_organization_id_index` (`organization_id`),
  KEY `attendance_geofences_location_id_index` (`location_id`),
  KEY `attendance_geofences_is_office_location_index` (`is_office_location`),
  CONSTRAINT `attendance_geofences_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_geofences_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`),
  CONSTRAINT `attendance_geofences_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_geofences_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_locations`
--

DROP TABLE IF EXISTS `attendance_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `location_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `is_primary` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_locations_uuid_unique` (`uuid`),
  UNIQUE KEY `attendance_locations_organization_id_location_code_unique` (`organization_id`,`location_code`),
  KEY `attendance_locations_branch_id_foreign` (`branch_id`),
  KEY `attendance_locations_created_by_foreign` (`created_by`),
  KEY `attendance_locations_updated_by_foreign` (`updated_by`),
  KEY `attendance_locations_organization_id_index` (`organization_id`),
  KEY `attendance_locations_is_primary_index` (`is_primary`),
  CONSTRAINT `attendance_locations_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `attendance_locations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_locations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_locations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_locks`
--

DROP TABLE IF EXISTS `attendance_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_locks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `salary_month` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_employees` int DEFAULT '0',
  `locked_by` bigint unsigned NOT NULL DEFAULT '1',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'locked',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `organization_id` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_policies`
--

DROP TABLE IF EXISTS `attendance_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `working_hours_per_day` decimal(4,2) DEFAULT '8.50',
  `grace_period_minutes` int DEFAULT '15',
  `overtime_enabled` tinyint(1) DEFAULT '0',
  `overtime_rules` json DEFAULT NULL,
  `shift_policies` json DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_policies_uuid_unique` (`uuid`),
  UNIQUE KEY `attendance_policies_organization_id_code_unique` (`organization_id`,`code`),
  KEY `attendance_policies_created_by_foreign` (`created_by`),
  KEY `attendance_policies_updated_by_foreign` (`updated_by`),
  KEY `attendance_policies_organization_id_index` (`organization_id`),
  KEY `attendance_policies_is_default_index` (`is_default`),
  KEY `attendance_policies_status_index` (`status`),
  KEY `attendance_policies_created_at_index` (`created_at`),
  CONSTRAINT `attendance_policies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_policies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_policies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_policies_mapping`
--

DROP TABLE IF EXISTS `attendance_policies_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_policies_mapping` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `attendance_policy_id` bigint unsigned NOT NULL,
  `shift_id` bigint unsigned DEFAULT NULL,
  `grace_period_minutes` int DEFAULT '0',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_policies_mapping_uuid_unique` (`uuid`),
  KEY `attendance_policies_mapping_attendance_policy_id_foreign` (`attendance_policy_id`),
  KEY `attendance_policies_mapping_shift_id_foreign` (`shift_id`),
  KEY `attendance_policies_mapping_created_by_foreign` (`created_by`),
  KEY `attendance_policies_mapping_updated_by_foreign` (`updated_by`),
  KEY `attendance_policies_mapping_organization_id_index` (`organization_id`),
  KEY `attendance_policies_mapping_employee_id_index` (`employee_id`),
  KEY `attendance_policies_mapping_is_active_index` (`is_active`),
  KEY `attendance_policies_mapping_effective_from_index` (`effective_from`),
  CONSTRAINT `attendance_policies_mapping_attendance_policy_id_foreign` FOREIGN KEY (`attendance_policy_id`) REFERENCES `attendance_policies` (`id`),
  CONSTRAINT `attendance_policies_mapping_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_policies_mapping_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_policies_mapping_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_policies_mapping_shift_id_foreign` FOREIGN KEY (`shift_id`) REFERENCES `shift_templates` (`id`),
  CONSTRAINT `attendance_policies_mapping_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_records`
--

DROP TABLE IF EXISTS `attendance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `check_in_date` date NOT NULL,
  `check_in_time` timestamp NULL DEFAULT NULL,
  `check_out_time` timestamp NULL DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `break_time_minutes` int DEFAULT '0',
  `work_duration_minutes` int DEFAULT NULL,
  `status` enum('present','absent','half_day','work_from_home','on_leave','holiday','weekly_off','sick') COLLATE utf8mb4_unicode_ci DEFAULT 'absent',
  `check_in_location_id` bigint unsigned DEFAULT NULL,
  `check_out_location_id` bigint unsigned DEFAULT NULL,
  `check_in_method` enum('web','mobile','gps','qr','biometric','kiosk','face_recognition') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `check_out_method` enum('web','web_portal','mobile','gps','qr','biometric','kiosk','face_recognition') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_late` tinyint(1) DEFAULT '0',
  `is_early_departure` tinyint(1) DEFAULT '0',
  `is_regularized` tinyint(1) DEFAULT '0',
  `regularization_request_id` bigint unsigned DEFAULT NULL,
  `overtime_minutes` int DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `shift_id` int unsigned DEFAULT NULL,
  `is_ceo_punch` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_records_uuid_unique` (`uuid`),
  UNIQUE KEY `attendance_org_emp_date_unique` (`organization_id`,`employee_id`,`check_in_date`),
  KEY `attendance_records_check_in_location_id_foreign` (`check_in_location_id`),
  KEY `attendance_records_check_out_location_id_foreign` (`check_out_location_id`),
  KEY `attendance_records_created_by_foreign` (`created_by`),
  KEY `attendance_records_updated_by_foreign` (`updated_by`),
  KEY `attendance_records_organization_id_index` (`organization_id`),
  KEY `attendance_records_employee_id_index` (`employee_id`),
  KEY `attendance_records_check_in_date_index` (`check_in_date`),
  KEY `attendance_records_status_index` (`status`),
  KEY `attendance_records_is_late_index` (`is_late`),
  KEY `attendance_records_is_regularized_index` (`is_regularized`),
  KEY `attendance_records_employee_id_check_in_date_index` (`employee_id`,`check_in_date`),
  CONSTRAINT `attendance_records_check_in_location_id_foreign` FOREIGN KEY (`check_in_location_id`) REFERENCES `attendance_locations` (`id`),
  CONSTRAINT `attendance_records_check_out_location_id_foreign` FOREIGN KEY (`check_out_location_id`) REFERENCES `attendance_locations` (`id`),
  CONSTRAINT `attendance_records_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_records_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_records_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_records_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_regularizations`
--

DROP TABLE IF EXISTS `attendance_regularizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_regularizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `attendance_record_id` bigint unsigned DEFAULT NULL,
  `regularization_type` enum('missed_punch','late_arrival','early_departure','work_from_home','manual_correction') COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_date` date NOT NULL,
  `reason_description` text COLLATE utf8mb4_unicode_ci,
  `supporting_document_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_manager',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `approval_comments` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `is_date_range` tinyint(1) DEFAULT '0',
  `end_date` date DEFAULT NULL,
  `requested_check_in_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_check_out_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actual_check_in_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actual_check_out_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `day_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `manager_id` bigint unsigned DEFAULT NULL,
  `manager_approved_by` bigint unsigned DEFAULT NULL,
  `manager_approved_at` timestamp NULL DEFAULT NULL,
  `manager_comments` text COLLATE utf8mb4_unicode_ci,
  `hr_approved_by` bigint unsigned DEFAULT NULL,
  `hr_approved_at` timestamp NULL DEFAULT NULL,
  `hr_comments` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_regularizations_uuid_unique` (`uuid`),
  KEY `attendance_regularizations_attendance_record_id_foreign` (`attendance_record_id`),
  KEY `attendance_regularizations_approved_by_foreign` (`approved_by`),
  KEY `attendance_regularizations_created_by_foreign` (`created_by`),
  KEY `attendance_regularizations_updated_by_foreign` (`updated_by`),
  KEY `attendance_regularizations_organization_id_index` (`organization_id`),
  KEY `attendance_regularizations_employee_id_index` (`employee_id`),
  KEY `attendance_regularizations_status_index` (`status`),
  KEY `attendance_regularizations_regularization_type_index` (`regularization_type`),
  KEY `attendance_regularizations_request_date_index` (`request_date`),
  KEY `attendance_regularizations_workflow_instance_id_index` (`workflow_instance_id`),
  CONSTRAINT `attendance_regularizations_attendance_record_id_foreign` FOREIGN KEY (`attendance_record_id`) REFERENCES `attendance_records` (`id`),
  CONSTRAINT `attendance_regularizations_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_regularizations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `attendance_regularizations_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_sessions`
--

DROP TABLE IF EXISTS `attendance_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `attendance_record_id` bigint unsigned NOT NULL,
  `session_type` enum('check_in','break_in','break_out','check_out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_timestamp` timestamp NOT NULL,
  `device_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_latitude` decimal(10,7) DEFAULT NULL,
  `device_longitude` decimal(10,7) DEFAULT NULL,
  `geofence_matched` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_sessions_uuid_unique` (`uuid`),
  KEY `attendance_sessions_organization_id_index` (`organization_id`),
  KEY `attendance_sessions_attendance_record_id_index` (`attendance_record_id`),
  KEY `attendance_sessions_session_type_index` (`session_type`),
  KEY `attendance_sessions_session_timestamp_index` (`session_timestamp`),
  KEY `attendance_sessions_created_at_index` (`created_at`),
  CONSTRAINT `attendance_sessions_attendance_record_id_foreign` FOREIGN KEY (`attendance_record_id`) REFERENCES `attendance_records` (`id`),
  CONSTRAINT `attendance_sessions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_summaries`
--

DROP TABLE IF EXISTS `attendance_summaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_summaries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `summary_month` date NOT NULL,
  `present_days` int DEFAULT '0',
  `absent_days` int DEFAULT '0',
  `half_days` int DEFAULT '0',
  `sick_days` int DEFAULT '0',
  `work_from_home_days` int DEFAULT '0',
  `late_arrivals` int DEFAULT '0',
  `early_departures` int DEFAULT '0',
  `overtime_hours` decimal(6,2) DEFAULT '0.00',
  `total_work_hours` decimal(6,2) DEFAULT '0.00',
  `avg_daily_hours` decimal(4,2) DEFAULT '0.00',
  `attendance_percentage` decimal(5,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_summaries_org_emp_month_unique` (`organization_id`,`employee_id`,`summary_month`),
  KEY `attendance_summaries_organization_id_index` (`organization_id`),
  KEY `attendance_summaries_employee_id_index` (`employee_id`),
  KEY `attendance_summaries_summary_month_index` (`summary_month`),
  CONSTRAINT `attendance_summaries_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_summaries_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `actor_user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `before_state` json DEFAULT NULL,
  `after_state` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_actor_user_id_foreign` (`actor_user_id`),
  KEY `audit_logs_organization_id_entity_type_entity_id_index` (`organization_id`,`entity_type`,`entity_id`),
  KEY `audit_logs_organization_id_created_at_index` (`organization_id`,`created_at`),
  CONSTRAINT `audit_logs_actor_user_id_foreign` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=605 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_sessions`
--

DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `refresh_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_type` enum('web','mobile','tablet','api') COLLATE utf8mb4_unicode_ci DEFAULT 'web',
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_trusted` tinyint(1) DEFAULT '0',
  `last_active_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_sessions_uuid_unique` (`uuid`),
  KEY `auth_sessions_user_id_index` (`user_id`),
  KEY `auth_sessions_organization_id_index` (`organization_id`),
  KEY `auth_sessions_expires_at_index` (`expires_at`),
  KEY `auth_sessions_device_id_index` (`device_id`),
  CONSTRAINT `auth_sessions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auth_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=399 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `badge_criteria`
--

DROP TABLE IF EXISTS `badge_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badge_criteria` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `badge_id` bigint unsigned NOT NULL,
  `criteria_type` enum('manual','performance_score','attendance_rate','recognition_points','survey_score','custom_rule') COLLATE utf8mb4_unicode_ci NOT NULL,
  `threshold_value` decimal(10,2) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `badge_criteria_badge_id_index` (`badge_id`),
  KEY `badge_criteria_criteria_type_index` (`criteria_type`),
  CONSTRAINT `badge_criteria_badge_id_foreign` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `badges`
--

DROP TABLE IF EXISTS `badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_hex` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#000000',
  `background_color_hex` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#FFFFFF',
  `category` enum('performance','attendance','innovation','leadership','learning','culture','service','milestone','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_value` int unsigned DEFAULT '0',
  `level` enum('bronze','silver','gold','platinum') COLLATE utf8mb4_unicode_ci DEFAULT 'bronze',
  `expiry_days` int unsigned DEFAULT NULL,
  `requires_certificate` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `badges_uuid_unique` (`uuid`),
  KEY `badges_created_by_foreign` (`created_by`),
  KEY `idx_badges_org_category` (`organization_id`,`category`),
  KEY `badges_level_index` (`level`),
  CONSTRAINT `badges_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `badges_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_head_id` bigint unsigned DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_code` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_uuid_unique` (`uuid`),
  UNIQUE KEY `branches_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `branches_created_by_foreign` (`created_by`),
  KEY `branches_updated_by_foreign` (`updated_by`),
  KEY `branches_organization_id_index` (`organization_id`),
  KEY `branches_status_index` (`status`),
  KEY `branches_created_at_index` (`created_at`),
  CONSTRAINT `branches_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `branches_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `branches_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `branding_settings`
--

DROP TABLE IF EXISTS `branding_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branding_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `primary_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#000000',
  `secondary_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#FFFFFF',
  `accent_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#007BFF',
  `logo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_dark_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favicon_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme` enum('light','dark','system') COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `custom_css` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branding_settings_uuid_unique` (`uuid`),
  UNIQUE KEY `branding_settings_organization_id_unique` (`organization_id`),
  KEY `branding_settings_created_by_foreign` (`created_by`),
  KEY `branding_settings_updated_by_foreign` (`updated_by`),
  KEY `branding_settings_organization_id_index` (`organization_id`),
  KEY `branding_settings_created_at_index` (`created_at`),
  CONSTRAINT `branding_settings_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `branding_settings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `branding_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `breaks`
--

DROP TABLE IF EXISTS `breaks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `breaks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `break_type` enum('Manual','Auto') NOT NULL DEFAULT 'Manual',
  `biometric_device` varchar(100) DEFAULT NULL,
  `max_allow_time` varchar(10) NOT NULL DEFAULT '00:15',
  `is_active` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `breaks_uuid_unique` (`uuid`),
  KEY `breaks_organization_id_index` (`organization_id`),
  KEY `breaks_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  KEY `breaks_organization_id_is_active_index` (`organization_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendar_assignments`
--

DROP TABLE IF EXISTS `calendar_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `calendar_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `employee_group_id` bigint unsigned DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `calendar_assignments_uuid_unique` (`uuid`),
  KEY `calendar_assignments_calendar_id_index` (`calendar_id`),
  KEY `calendar_assignments_company_id_index` (`company_id`),
  KEY `calendar_assignments_location_id_index` (`location_id`),
  KEY `calendar_assignments_department_id_index` (`department_id`),
  CONSTRAINT `calendar_assignments_calendar_id_foreign` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_ai_analysis`
--

DROP TABLE IF EXISTS `candidate_ai_analysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_ai_analysis` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `job_id` int unsigned NOT NULL,
  `overall_score` decimal(5,2) NOT NULL,
  `skill_match_percentage` decimal(5,2) DEFAULT NULL,
  `experience_match_percentage` decimal(5,2) DEFAULT NULL,
  `education_match_percentage` decimal(5,2) DEFAULT NULL,
  `salary_expectation_match` decimal(5,2) DEFAULT NULL,
  `ai_recommendation` enum('strong_match','good_match','fair_match','poor_match') COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_gaps` json DEFAULT NULL,
  `ai_generated_summary` text COLLATE utf8mb4_unicode_ci,
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_ai_analysis_uuid_unique` (`uuid`),
  KEY `candidate_ai_analysis_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_ai_analysis_job_id_foreign` (`job_id`),
  KEY `candidate_ai_analysis_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_ai_analysis_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`),
  CONSTRAINT `candidate_ai_analysis_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_certifications`
--

DROP TABLE IF EXISTS `candidate_certifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_certifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `certification_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issuing_organization` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `credential_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_certifications_uuid_unique` (`uuid`),
  KEY `candidate_certifications_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_certifications_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_certifications_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_documents`
--

DROP TABLE IF EXISTS `candidate_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `document_type` enum('cover_letter','certificate','portfolio','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_documents_uuid_unique` (`uuid`),
  KEY `candidate_documents_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_documents_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_documents_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_education`
--

DROP TABLE IF EXISTS `candidate_education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_education` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `degree` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_of_study` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `graduation_year` int unsigned DEFAULT NULL,
  `cgpa` decimal(4,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_education_uuid_unique` (`uuid`),
  KEY `candidate_education_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_education_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_education_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_experience`
--

DROP TABLE IF EXISTS `candidate_experience`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_experience` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `currently_working` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_experience_uuid_unique` (`uuid`),
  KEY `candidate_experience_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_experience_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_experience_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_job_actions`
--

DROP TABLE IF EXISTS `candidate_job_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_job_actions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_id` int unsigned NOT NULL,
  `candidate_id` int unsigned NOT NULL,
  `action` varchar(50) NOT NULL,
  `reason` text,
  `performed_by` int unsigned DEFAULT NULL,
  `source` varchar(50) DEFAULT 'AI_SCREENING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_job_actions_uuid_unique` (`uuid`),
  KEY `candidate_job_actions_organization_id_index` (`organization_id`),
  KEY `candidate_job_actions_job_id_index` (`job_id`),
  KEY `candidate_job_actions_candidate_id_index` (`candidate_id`),
  KEY `candidate_job_actions_action_index` (`action`),
  CONSTRAINT `candidate_job_actions_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `candidate_job_actions_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_job_matches`
--

DROP TABLE IF EXISTS `candidate_job_matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_job_matches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_id` int unsigned NOT NULL,
  `candidate_id` int unsigned NOT NULL,
  `overall_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `skill_score` decimal(5,2) DEFAULT '0.00',
  `experience_score` decimal(5,2) DEFAULT '0.00',
  `semantic_score` decimal(5,2) DEFAULT '0.00',
  `matched_skills` json DEFAULT NULL,
  `missing_skills` json DEFAULT NULL,
  `match_status` enum('EXCELLENT','GOOD','AVERAGE','POOR') DEFAULT 'AVERAGE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_job_matches_uuid_unique` (`uuid`),
  UNIQUE KEY `candidate_job_matches_job_id_candidate_id_unique` (`job_id`,`candidate_id`),
  KEY `candidate_job_matches_organization_id_index` (`organization_id`),
  KEY `candidate_job_matches_job_id_index` (`job_id`),
  KEY `candidate_job_matches_candidate_id_index` (`candidate_id`),
  CONSTRAINT `candidate_job_matches_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `candidate_job_matches_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_notes`
--

DROP TABLE IF EXISTS `candidate_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_notes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `note_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_notes_uuid_unique` (`uuid`),
  KEY `candidate_notes_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_notes_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_notes_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_resumes`
--

DROP TABLE IF EXISTS `candidate_resumes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_resumes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `resume_file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resume_version` int NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `file_size_kb` int DEFAULT NULL,
  `extracted_text` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_resumes_uuid_unique` (`uuid`),
  KEY `candidate_resumes_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_resumes_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_resumes_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_skills`
--

DROP TABLE IF EXISTS `candidate_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_skills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proficiency_level` enum('beginner','intermediate','expert') COLLATE utf8mb4_unicode_ci NOT NULL,
  `years_of_experience` decimal(4,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_skills_uuid_unique` (`uuid`),
  KEY `candidate_skills_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_skills_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_skills_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_sources`
--

DROP TABLE IF EXISTS `candidate_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_sources` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `source_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` enum('job_board','referral','direct','agency') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_sources_uuid_unique` (`uuid`),
  KEY `candidate_sources_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate_tags`
--

DROP TABLE IF EXISTS `candidate_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_tags` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `tag_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_tags_uuid_unique` (`uuid`),
  KEY `candidate_tags_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_tags_organization_id_index` (`organization_id`),
  CONSTRAINT `candidate_tags_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidates`
--

DROP TABLE IF EXISTS `candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `resume_bank_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternative_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_location_id` int unsigned DEFAULT NULL,
  `preferred_location_id` int unsigned DEFAULT NULL,
  `current_salary` decimal(15,2) DEFAULT NULL,
  `salary_currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expected_salary` decimal(15,2) DEFAULT NULL,
  `notice_period_days` int DEFAULT NULL,
  `current_company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `years_of_experience` decimal(4,2) DEFAULT NULL,
  `linkedin_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `portfolio_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('applied','screening','assessment','interview','offer','hired','rejected','dropped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'applied',
  `source` enum('job_board','employee_referral','direct_apply','recruitment_agency') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_score` decimal(5,2) DEFAULT NULL,
  `ai_summary` text COLLATE utf8mb4_unicode_ci,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `signature_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resume_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line1` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zipcode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skills` text COLLATE utf8mb4_unicode_ci,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `qualification` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `university` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marital_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidates_organization_id_email_unique` (`organization_id`,`email`),
  UNIQUE KEY `candidates_uuid_unique` (`uuid`),
  KEY `candidates_organization_id_index` (`organization_id`),
  KEY `candidates_status_index` (`status`),
  KEY `candidates_resume_bank_id_index` (`resume_bank_id`),
  CONSTRAINT `candidates_resume_bank_id_foreign` FOREIGN KEY (`resume_bank_id`) REFERENCES `resume_bank` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `career_portal_pages`
--

DROP TABLE IF EXISTS `career_portal_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `career_portal_pages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `page_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `career_portal_pages_organization_id_page_slug_unique` (`organization_id`,`page_slug`),
  UNIQUE KEY `career_portal_pages_uuid_unique` (`uuid`),
  KEY `career_portal_pages_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `career_portal_settings`
--

DROP TABLE IF EXISTS `career_portal_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `career_portal_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `portal_title` varchar(255) DEFAULT 'Career Portal',
  `portal_tagline` text,
  `banner_description` text,
  `company_logo_url` longtext,
  `primary_color` varchar(50) DEFAULT '#4f46e5',
  `show_account_info` tinyint(1) DEFAULT '0',
  `show_back_to_hrms` tinyint(1) DEFAULT '1',
  `copyright_text` text,
  `form_fields_config` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `career_portal_settings_organization_id_unique` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comp_off_balances`
--

DROP TABLE IF EXISTS `comp_off_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comp_off_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `comp_off_earned_date` date NOT NULL,
  `comp_off_earned_hours` decimal(4,2) NOT NULL,
  `comp_off_expires_at` date DEFAULT NULL,
  `comp_off_used_date` date DEFAULT NULL,
  `comp_off_used_hours` decimal(4,2) DEFAULT NULL,
  `status` enum('available','used','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `comp_off_balances_uuid_unique` (`uuid`),
  KEY `comp_off_balances_created_by_foreign` (`created_by`),
  KEY `comp_off_balances_updated_by_foreign` (`updated_by`),
  KEY `comp_off_balances_organization_id_index` (`organization_id`),
  KEY `comp_off_balances_employee_id_index` (`employee_id`),
  KEY `comp_off_balances_status_index` (`status`),
  KEY `comp_off_balances_comp_off_earned_date_index` (`comp_off_earned_date`),
  CONSTRAINT `comp_off_balances_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `comp_off_balances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `comp_off_balances_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `comp_off_balances_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comp_off_requests`
--

DROP TABLE IF EXISTS `comp_off_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comp_off_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `comp_off_id` bigint unsigned NOT NULL,
  `request_date` date NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `comp_off_requests_uuid_unique` (`uuid`),
  KEY `comp_off_requests_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `comp_off_requests_created_by_foreign` (`created_by`),
  KEY `comp_off_requests_updated_by_foreign` (`updated_by`),
  KEY `comp_off_requests_organization_id_index` (`organization_id`),
  KEY `comp_off_requests_employee_id_index` (`employee_id`),
  KEY `comp_off_requests_comp_off_id_index` (`comp_off_id`),
  KEY `comp_off_requests_status_index` (`status`),
  CONSTRAINT `comp_off_requests_comp_off_id_foreign` FOREIGN KEY (`comp_off_id`) REFERENCES `comp_off_balances` (`id`),
  CONSTRAINT `comp_off_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `comp_off_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `comp_off_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `comp_off_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `comp_off_requests_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `company`
--

DROP TABLE IF EXISTS `company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company` (
  `company_id` int NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `is_parent` tinyint(1) DEFAULT '0',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_of_establishment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line_1` text COLLATE utf8mb4_unicode_ci,
  `address_line_2` text COLLATE utf8mb4_unicode_ci,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zip_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_tin` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` text COLLATE utf8mb4_unicode_ci,
  `company_stamp` text COLLATE utf8mb4_unicode_ci,
  `signature` text COLLATE utf8mb4_unicode_ci,
  `is_active_toggle` tinyint(1) DEFAULT '1',
  `active_users_toggle` tinyint(1) DEFAULT '1',
  `login_page_logo_toggle` tinyint(1) DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `has_credentials` tinyint(1) NOT NULL DEFAULT '0',
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`company_id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `uq_company_code_org` (`code`,`organization_id`),
  KEY `idx_company_name` (`name`),
  KEY `idx_company_code` (`code`),
  KEY `idx_company_status` (`status`),
  KEY `idx_company_org` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `competencies`
--

DROP TABLE IF EXISTS `competencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competencies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `framework_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `proficiency_levels` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `competencies_uuid_unique` (`uuid`),
  KEY `competencies_created_by_foreign` (`created_by`),
  KEY `competencies_updated_by_foreign` (`updated_by`),
  KEY `competencies_organization_id_index` (`organization_id`),
  KEY `competencies_framework_id_index` (`framework_id`),
  CONSTRAINT `competencies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `competencies_framework_id_foreign` FOREIGN KEY (`framework_id`) REFERENCES `competency_frameworks` (`id`),
  CONSTRAINT `competencies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `competencies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `competency_frameworks`
--

DROP TABLE IF EXISTS `competency_frameworks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competency_frameworks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `competency_frameworks_uuid_unique` (`uuid`),
  KEY `competency_frameworks_created_by_foreign` (`created_by`),
  KEY `competency_frameworks_updated_by_foreign` (`updated_by`),
  KEY `competency_frameworks_organization_id_index` (`organization_id`),
  KEY `competency_frameworks_status_index` (`status`),
  CONSTRAINT `competency_frameworks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `competency_frameworks_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `competency_frameworks_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cost_centers`
--

DROP TABLE IF EXISTS `cost_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cost_centers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_cost_center_id` bigint unsigned DEFAULT NULL,
  `budget_amount` decimal(15,2) DEFAULT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_code` varchar(50) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cost_centers_uuid_unique` (`uuid`),
  UNIQUE KEY `cost_centers_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `cost_centers_created_by_foreign` (`created_by`),
  KEY `cost_centers_updated_by_foreign` (`updated_by`),
  KEY `cost_centers_organization_id_index` (`organization_id`),
  KEY `cost_centers_parent_cost_center_id_index` (`parent_cost_center_id`),
  KEY `cost_centers_status_index` (`status`),
  KEY `cost_centers_created_at_index` (`created_at`),
  CONSTRAINT `cost_centers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `cost_centers_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `cost_centers_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_master_autofill_mappings`
--

DROP TABLE IF EXISTS `custom_master_autofill_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_master_autofill_mappings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `master_id` bigint unsigned NOT NULL,
  `lookup_field_key` varchar(100) NOT NULL,
  `source_field_key` varchar(100) NOT NULL,
  `target_field_key` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cmam_master_idx` (`master_id`),
  CONSTRAINT `custom_master_autofill_mappings_master_id_foreign` FOREIGN KEY (`master_id`) REFERENCES `custom_masters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_master_choice_lists`
--

DROP TABLE IF EXISTS `custom_master_choice_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_master_choice_lists` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text,
  `options_json` json DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cmcl_org_code_idx` (`organization_id`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_master_extended_data`
--

DROP TABLE IF EXISTS `custom_master_extended_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_master_extended_data` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `master_id` bigint unsigned NOT NULL,
  `record_ref_id` bigint unsigned NOT NULL,
  `data` json NOT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cmed_master_record_unique` (`master_id`,`record_ref_id`),
  KEY `cmed_org_master_idx` (`organization_id`,`master_id`),
  CONSTRAINT `custom_master_extended_data_master_id_foreign` FOREIGN KEY (`master_id`) REFERENCES `custom_masters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_master_fields`
--

DROP TABLE IF EXISTS `custom_master_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_master_fields` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `master_id` bigint unsigned NOT NULL,
  `field_name` varchar(150) NOT NULL,
  `field_key` varchar(100) NOT NULL,
  `field_type` varchar(50) NOT NULL DEFAULT 'text',
  `is_required` tinyint(1) DEFAULT '0',
  `is_unique` tinyint(1) DEFAULT '0',
  `show_in_table` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `help_text` varchar(255) DEFAULT NULL,
  `placeholder` varchar(255) DEFAULT NULL,
  `default_value` varchar(255) DEFAULT NULL,
  `lookup_master_id` bigint unsigned DEFAULT NULL,
  `choice_list_id` bigint unsigned DEFAULT NULL,
  `options_json` json DEFAULT NULL,
  `validation_rules` json DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `column_map` varchar(100) DEFAULT NULL COMMENT 'Real DB column this field maps to — NULL means extra field stored in extended_data',
  `is_core` tinyint(1) DEFAULT '0' COMMENT 'Core fields cannot be deleted from Master Builder UI',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cmf_master_field_key_unique` (`master_id`,`field_key`),
  KEY `cmf_master_order_idx` (`master_id`,`display_order`),
  CONSTRAINT `custom_master_fields_master_id_foreign` FOREIGN KEY (`master_id`) REFERENCES `custom_masters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_master_records`
--

DROP TABLE IF EXISTS `custom_master_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_master_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `master_id` bigint unsigned NOT NULL,
  `record_code` varchar(100) DEFAULT NULL,
  `data` json NOT NULL,
  `status` varchar(20) DEFAULT 'Active',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cmr_org_master_idx` (`organization_id`,`master_id`),
  KEY `cmr_master_status_idx` (`master_id`,`status`),
  CONSTRAINT `custom_master_records_master_id_foreign` FOREIGN KEY (`master_id`) REFERENCES `custom_masters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_master_validation_rules`
--

DROP TABLE IF EXISTS `custom_master_validation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_master_validation_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `master_id` bigint unsigned NOT NULL,
  `rule_name` varchar(150) NOT NULL,
  `field_a` varchar(100) NOT NULL,
  `operator` varchar(50) NOT NULL,
  `field_b` varchar(100) DEFAULT NULL,
  `custom_value` varchar(255) DEFAULT NULL,
  `error_message` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cmvr_master_idx` (`master_id`),
  CONSTRAINT `custom_master_validation_rules_master_id_foreign` FOREIGN KEY (`master_id`) REFERENCES `custom_masters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_masters`
--

DROP TABLE IF EXISTS `custom_masters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_masters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `plural_name` varchar(150) DEFAULT NULL,
  `code` varchar(100) NOT NULL,
  `description` text,
  `icon` varchar(50) DEFAULT 'Layers',
  `employee_linkage` varchar(100) DEFAULT 'none',
  `has_hierarchy` tinyint(1) DEFAULT '0',
  `has_history` tinyint(1) DEFAULT '0',
  `status` varchar(20) DEFAULT 'Active',
  `is_system` tinyint(1) DEFAULT '0',
  `system_table` varchar(100) DEFAULT NULL,
  `system_id_column` varchar(100) DEFAULT 'id',
  `system_name_column` varchar(100) DEFAULT 'name',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_code` varchar(100) GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cm_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `cm_org_code_idx` (`organization_id`,`code`),
  KEY `cm_org_status_idx` (`organization_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `department_managers`
--

DROP TABLE IF EXISTS `department_managers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department_managers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `department_id` varchar(100) NOT NULL,
  `manager_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `company_ids` text COLLATE utf8mb4_unicode_ci,
  `company_emails` text COLLATE utf8mb4_unicode_ci,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_department_id` bigint unsigned DEFAULT NULL,
  `department_head_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `colour` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'Yes',
  `color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '#00b4d8',
  `active_code` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_uuid_unique` (`uuid`),
  UNIQUE KEY `departments_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `departments_created_by_foreign` (`created_by`),
  KEY `departments_updated_by_foreign` (`updated_by`),
  KEY `departments_organization_id_index` (`organization_id`),
  KEY `departments_parent_department_id_index` (`parent_department_id`),
  KEY `departments_status_index` (`status`),
  KEY `departments_created_at_index` (`created_at`),
  CONSTRAINT `departments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `departments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `departments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `designations`
--

DROP TABLE IF EXISTS `designations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `designations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `level` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `mapped_companies` json DEFAULT NULL,
  `mapped_locations` json DEFAULT NULL,
  `mapped_departments` json DEFAULT NULL,
  `mapped_shifts` json DEFAULT NULL,
  `mapped_grades` json DEFAULT NULL,
  `active_code` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `designations_uuid_unique` (`uuid`),
  UNIQUE KEY `designations_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `designations_department_id_foreign` (`department_id`),
  KEY `designations_created_by_foreign` (`created_by`),
  KEY `designations_updated_by_foreign` (`updated_by`),
  KEY `designations_organization_id_index` (`organization_id`),
  KEY `designations_status_index` (`status`),
  KEY `designations_created_at_index` (`created_at`),
  CONSTRAINT `designations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `designations_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `designations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `designations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `development_plans`
--

DROP TABLE IF EXISTS `development_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `development_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `cycle_id` bigint unsigned NOT NULL,
  `competency_id` bigint unsigned NOT NULL,
  `objective` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `timeline` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `development_plans_uuid_unique` (`uuid`),
  KEY `development_plans_competency_id_foreign` (`competency_id`),
  KEY `development_plans_created_by_foreign` (`created_by`),
  KEY `development_plans_updated_by_foreign` (`updated_by`),
  KEY `development_plans_organization_id_index` (`organization_id`),
  KEY `development_plans_employee_id_index` (`employee_id`),
  KEY `development_plans_cycle_id_index` (`cycle_id`),
  KEY `development_plans_status_index` (`status`),
  CONSTRAINT `development_plans_competency_id_foreign` FOREIGN KEY (`competency_id`) REFERENCES `competencies` (`id`),
  CONSTRAINT `development_plans_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `development_plans_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `development_plans_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `development_plans_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `development_plans_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `template_type` enum('offer_letter','welcome_email','leave_approval','attendance_alert','custom') COLLATE utf8mb4_unicode_ci DEFAULT 'custom',
  `template_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `placeholders` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_templates_uuid_unique` (`uuid`),
  KEY `email_templates_created_by_foreign` (`created_by`),
  KEY `email_templates_updated_by_foreign` (`updated_by`),
  KEY `email_templates_organization_id_index` (`organization_id`),
  KEY `email_templates_template_type_index` (`template_type`),
  KEY `email_templates_is_default_index` (`is_default`),
  KEY `email_templates_status_index` (`status`),
  KEY `email_templates_created_at_index` (`created_at`),
  CONSTRAINT `email_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `email_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `email_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_asset_allocations`
--

DROP TABLE IF EXISTS `employee_asset_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_asset_allocations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `allocation_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `condition_at_allocation` enum('good','fair','poor') COLLATE utf8mb4_unicode_ci DEFAULT 'good',
  `condition_at_return` enum('good','fair','poor') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_asset_allocations_uuid_unique` (`uuid`),
  KEY `employee_asset_allocations_created_by_foreign` (`created_by`),
  KEY `employee_asset_allocations_updated_by_foreign` (`updated_by`),
  KEY `employee_asset_allocations_organization_id_index` (`organization_id`),
  KEY `employee_asset_allocations_employee_id_index` (`employee_id`),
  KEY `employee_asset_allocations_asset_id_index` (`asset_id`),
  CONSTRAINT `employee_asset_allocations_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `employee_asset_allocations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_asset_allocations_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_asset_allocations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_asset_allocations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_asset_replacements`
--

DROP TABLE IF EXISTS `employee_asset_replacements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_asset_replacements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `old_asset_id` bigint unsigned NOT NULL,
  `new_asset_id` bigint unsigned NOT NULL,
  `reason` enum('damage','loss','upgrade','end_of_life') COLLATE utf8mb4_unicode_ci NOT NULL,
  `replacement_date` date NOT NULL,
  `replacement_cost` decimal(12,2) DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_asset_replacements_uuid_unique` (`uuid`),
  KEY `employee_asset_replacements_asset_id_foreign` (`asset_id`),
  KEY `employee_asset_replacements_old_asset_id_foreign` (`old_asset_id`),
  KEY `employee_asset_replacements_new_asset_id_foreign` (`new_asset_id`),
  KEY `employee_asset_replacements_created_by_foreign` (`created_by`),
  KEY `employee_asset_replacements_updated_by_foreign` (`updated_by`),
  KEY `employee_asset_replacements_organization_id_index` (`organization_id`),
  KEY `employee_asset_replacements_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_asset_replacements_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `employee_asset_replacements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_asset_replacements_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_asset_replacements_new_asset_id_foreign` FOREIGN KEY (`new_asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `employee_asset_replacements_old_asset_id_foreign` FOREIGN KEY (`old_asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `employee_asset_replacements_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_asset_replacements_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_attendance_locations`
--

DROP TABLE IF EXISTS `employee_attendance_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_attendance_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `geofence_id` bigint unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `allow_remote_punch` tinyint(1) NOT NULL DEFAULT '0',
  `allow_field_punch` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `allow_holiday_punch` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Allow this employee to punch attendance on public holidays',
  `allow_weekoff_punch` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Allow this employee to punch attendance on weekly off days',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_geofence_mapping` (`organization_id`,`employee_id`,`geofence_id`),
  KEY `employee_attendance_locations_employee_id_foreign` (`employee_id`),
  KEY `employee_attendance_locations_geofence_id_foreign` (`geofence_id`),
  KEY `employee_attendance_locations_organization_id_employee_id_index` (`organization_id`,`employee_id`),
  CONSTRAINT `employee_attendance_locations_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_attendance_locations_geofence_id_foreign` FOREIGN KEY (`geofence_id`) REFERENCES `attendance_geofences` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_attendance_locations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_badges`
--

DROP TABLE IF EXISTS `employee_badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_badges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `badge_id` bigint unsigned NOT NULL,
  `awarded_by` bigint unsigned NOT NULL,
  `awarded_at` datetime NOT NULL,
  `earned_date` date NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `certificate_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_visible_on_profile` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_badges_awarded_by_foreign` (`awarded_by`),
  KEY `idx_employee_badges_date` (`employee_id`,`awarded_at`),
  KEY `employee_badges_badge_id_index` (`badge_id`),
  KEY `employee_badges_is_visible_on_profile_index` (`is_visible_on_profile`),
  CONSTRAINT `employee_badges_awarded_by_foreign` FOREIGN KEY (`awarded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `employee_badges_badge_id_foreign` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_badges_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_biometric_profiles`
--

DROP TABLE IF EXISTS `employee_biometric_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_biometric_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `employee_name` varchar(255) NOT NULL,
  `embedding_model` varchar(64) NOT NULL,
  `face_vector` json NOT NULL,
  `profile_photo` longtext,
  `quality_score` decimal(5,2) DEFAULT NULL,
  `sample_count` int unsigned NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `enrolled_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_ceo_face` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_biometric_profile_org_employee` (`organization_id`,`employee_id`),
  KEY `idx_biometric_profile_org_active` (`organization_id`,`is_active`),
  KEY `employee_biometric_profiles_employee_id_foreign` (`employee_id`),
  CONSTRAINT `employee_biometric_profiles_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_biometric_profiles_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_certifications`
--

DROP TABLE IF EXISTS `employee_certifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_certifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `certification_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issuing_organization` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `certificate_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_certifications_uuid_unique` (`uuid`),
  KEY `employee_certifications_created_by_foreign` (`created_by`),
  KEY `employee_certifications_updated_by_foreign` (`updated_by`),
  KEY `employee_certifications_organization_id_index` (`organization_id`),
  KEY `employee_certifications_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_certifications_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_certifications_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_certifications_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_certifications_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_change_proposals`
--

DROP TABLE IF EXISTS `employee_change_proposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_change_proposals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `employee_id` int unsigned NOT NULL,
  `proposed_by_user_id` int unsigned NOT NULL,
  `proposal_type` enum('promotion','transfer') NOT NULL,
  `justification` text NOT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'pending_hr_verification',
  `workflow_approval_id` int unsigned DEFAULT NULL,
  `verified_by_user_id` int unsigned DEFAULT NULL,
  `verification_comment` text,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_change_proposals_uuid_unique` (`uuid`),
  KEY `employee_change_proposals_organization_id_employee_id_index` (`organization_id`,`employee_id`),
  KEY `employee_change_proposals_organization_id_status_index` (`organization_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_compensation`
--

DROP TABLE IF EXISTS `employee_compensation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_compensation` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `base_salary` decimal(12,2) DEFAULT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `salary_structure_id` bigint unsigned DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uan_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `esic_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pension_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_compensation_uuid_unique` (`uuid`),
  UNIQUE KEY `employee_compensation_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `employee_compensation_employee_id_foreign` (`employee_id`),
  KEY `employee_compensation_salary_structure_id_foreign` (`salary_structure_id`),
  KEY `employee_compensation_created_by_foreign` (`created_by`),
  KEY `employee_compensation_updated_by_foreign` (`updated_by`),
  KEY `employee_compensation_organization_id_index` (`organization_id`),
  CONSTRAINT `employee_compensation_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_compensation_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_compensation_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_compensation_salary_structure_id_foreign` FOREIGN KEY (`salary_structure_id`) REFERENCES `payroll_policies` (`id`),
  CONSTRAINT `employee_compensation_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_competencies`
--

DROP TABLE IF EXISTS `employee_competencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_competencies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `competency_id` bigint unsigned NOT NULL,
  `current_level` decimal(5,2) DEFAULT NULL,
  `target_level` decimal(5,2) DEFAULT NULL,
  `gap_analysis` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_competencies_uuid_unique` (`uuid`),
  KEY `employee_competencies_created_by_foreign` (`created_by`),
  KEY `employee_competencies_updated_by_foreign` (`updated_by`),
  KEY `employee_competencies_organization_id_index` (`organization_id`),
  KEY `employee_competencies_employee_id_index` (`employee_id`),
  KEY `employee_competencies_competency_id_index` (`competency_id`),
  CONSTRAINT `employee_competencies_competency_id_foreign` FOREIGN KEY (`competency_id`) REFERENCES `competencies` (`id`),
  CONSTRAINT `employee_competencies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_competencies_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_competencies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_competencies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_document_history`
--

DROP TABLE IF EXISTS `employee_document_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_document_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `document_id` bigint unsigned NOT NULL,
  `action` enum('upload','verify','reject','expire') COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `changed_by` bigint unsigned NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_document_history_uuid_unique` (`uuid`),
  KEY `employee_document_history_changed_by_foreign` (`changed_by`),
  KEY `employee_document_history_organization_id_index` (`organization_id`),
  KEY `employee_document_history_employee_id_index` (`employee_id`),
  KEY `employee_document_history_document_id_index` (`document_id`),
  KEY `employee_document_history_changed_at_index` (`changed_at`),
  CONSTRAINT `employee_document_history_changed_by_foreign` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_document_history_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `employee_documents` (`id`),
  CONSTRAINT `employee_document_history_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_document_history_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_document_upload_requests`
--

DROP TABLE IF EXISTS `employee_document_upload_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_document_upload_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `document_type` enum('aadhaar','pan','passport','visa','driving_license','offer_letter','appointment_letter','confirmation_letter','relieving_letter','experience_letter','resume','certificate') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verified_by` bigint unsigned DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_document_upload_requests_uuid_unique` (`uuid`),
  KEY `employee_document_upload_requests_verified_by_foreign` (`verified_by`),
  KEY `employee_document_upload_requests_created_by_foreign` (`created_by`),
  KEY `employee_document_upload_requests_updated_by_foreign` (`updated_by`),
  KEY `employee_document_upload_requests_organization_id_index` (`organization_id`),
  KEY `employee_document_upload_requests_employee_id_index` (`employee_id`),
  KEY `employee_document_upload_requests_status_index` (`status`),
  CONSTRAINT `employee_document_upload_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_document_upload_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_document_upload_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_document_upload_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_document_upload_requests_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_documents`
--

DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `document_type` enum('aadhaar','pan','passport','visa','driving_license','offer_letter','appointment_letter','confirmation_letter','relieving_letter','experience_letter','resume','certificate') COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `issued_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_url` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `verified_by` bigint unsigned DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_documents_uuid_unique` (`uuid`),
  KEY `employee_documents_verified_by_foreign` (`verified_by`),
  KEY `employee_documents_created_by_foreign` (`created_by`),
  KEY `employee_documents_updated_by_foreign` (`updated_by`),
  KEY `employee_documents_organization_id_index` (`organization_id`),
  KEY `employee_documents_employee_id_index` (`employee_id`),
  KEY `employee_documents_document_type_index` (`document_type`),
  KEY `employee_documents_verification_status_index` (`verification_status`),
  CONSTRAINT `employee_documents_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_documents_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_documents_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_documents_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_documents_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_education`
--

DROP TABLE IF EXISTS `employee_education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_education` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `education_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_of_study` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `certificate_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_education_uuid_unique` (`uuid`),
  KEY `employee_education_created_by_foreign` (`created_by`),
  KEY `employee_education_updated_by_foreign` (`updated_by`),
  KEY `employee_education_organization_id_index` (`organization_id`),
  KEY `employee_education_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_education_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_education_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_education_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_education_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_emergency_contacts`
--

DROP TABLE IF EXISTS `employee_emergency_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_emergency_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relationship` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_emergency_contacts_uuid_unique` (`uuid`),
  KEY `employee_emergency_contacts_created_by_foreign` (`created_by`),
  KEY `employee_emergency_contacts_updated_by_foreign` (`updated_by`),
  KEY `employee_emergency_contacts_organization_id_index` (`organization_id`),
  KEY `employee_emergency_contacts_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_emergency_contacts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_emergency_contacts_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_emergency_contacts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_emergency_contacts_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_exit_clearance_tasks`
--

DROP TABLE IF EXISTS `employee_exit_clearance_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_exit_clearance_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `exit_request_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `assigned_to_user_id` bigint unsigned NOT NULL,
  `status` enum('pending','in_progress','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `completion_date` date DEFAULT NULL,
  `completion_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_exit_clearance_tasks_uuid_unique` (`uuid`),
  KEY `employee_exit_clearance_tasks_item_id_foreign` (`item_id`),
  KEY `employee_exit_clearance_tasks_assigned_to_user_id_foreign` (`assigned_to_user_id`),
  KEY `employee_exit_clearance_tasks_created_by_foreign` (`created_by`),
  KEY `employee_exit_clearance_tasks_updated_by_foreign` (`updated_by`),
  KEY `employee_exit_clearance_tasks_organization_id_index` (`organization_id`),
  KEY `employee_exit_clearance_tasks_exit_request_id_index` (`exit_request_id`),
  KEY `employee_exit_clearance_tasks_status_index` (`status`),
  CONSTRAINT `employee_exit_clearance_tasks_assigned_to_user_id_foreign` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_exit_clearance_tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_exit_clearance_tasks_exit_request_id_foreign` FOREIGN KEY (`exit_request_id`) REFERENCES `exit_requests` (`id`),
  CONSTRAINT `employee_exit_clearance_tasks_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `exit_clearance_items` (`id`),
  CONSTRAINT `employee_exit_clearance_tasks_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_exit_clearance_tasks_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_face_encodings`
--

DROP TABLE IF EXISTS `employee_face_encodings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_face_encodings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `tenant_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `face_vector` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `enrolled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_photo` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `employee_face_encodings_tenant_id_index` (`tenant_id`),
  KEY `employee_face_encodings_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_family_details`
--

DROP TABLE IF EXISTS `employee_family_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_family_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relationship` enum('spouse','son','daughter','dependent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_family_details_uuid_unique` (`uuid`),
  KEY `employee_family_details_created_by_foreign` (`created_by`),
  KEY `employee_family_details_updated_by_foreign` (`updated_by`),
  KEY `employee_family_details_organization_id_index` (`organization_id`),
  KEY `employee_family_details_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_family_details_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_family_details_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_family_details_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_family_details_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_kpis`
--

DROP TABLE IF EXISTS `employee_kpis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_kpis` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `kpi_template_id` bigint unsigned NOT NULL,
  `target_value` decimal(10,2) NOT NULL,
  `actual_value` decimal(10,2) DEFAULT '0.00',
  `achievement_percentage` decimal(5,2) DEFAULT '0.00',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_kpis_uuid_unique` (`uuid`),
  KEY `employee_kpis_created_by_foreign` (`created_by`),
  KEY `employee_kpis_updated_by_foreign` (`updated_by`),
  KEY `employee_kpis_organization_id_index` (`organization_id`),
  KEY `employee_kpis_employee_id_index` (`employee_id`),
  KEY `employee_kpis_kpi_template_id_index` (`kpi_template_id`),
  CONSTRAINT `employee_kpis_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_kpis_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_kpis_kpi_template_id_foreign` FOREIGN KEY (`kpi_template_id`) REFERENCES `kpi_templates` (`id`),
  CONSTRAINT `employee_kpis_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_kpis_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_languages`
--

DROP TABLE IF EXISTS `employee_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_languages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `language_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proficiency` enum('read','write','speak') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_languages_uuid_unique` (`uuid`),
  KEY `employee_languages_created_by_foreign` (`created_by`),
  KEY `employee_languages_updated_by_foreign` (`updated_by`),
  KEY `employee_languages_organization_id_index` (`organization_id`),
  KEY `employee_languages_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_languages_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_languages_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_languages_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_languages_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_leave_locks`
--

DROP TABLE IF EXISTS `employee_leave_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_leave_locks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_org` (`employee_id`,`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_lifecycle`
--

DROP TABLE IF EXISTS `employee_lifecycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_lifecycle` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `from_status` enum('candidate','onboarding','probation','active','notice','exit','alumni') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` enum('candidate','onboarding','probation','active','notice','exit','alumni') COLLATE utf8mb4_unicode_ci NOT NULL,
  `transition_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_lifecycle_uuid_unique` (`uuid`),
  KEY `employee_lifecycle_created_by_foreign` (`created_by`),
  KEY `employee_lifecycle_organization_id_index` (`organization_id`),
  KEY `employee_lifecycle_employee_id_index` (`employee_id`),
  KEY `employee_lifecycle_created_at_index` (`created_at`),
  CONSTRAINT `employee_lifecycle_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_lifecycle_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_lifecycle_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_live_locations`
--

DROP TABLE IF EXISTS `employee_live_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_live_locations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL DEFAULT (uuid()),
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` int unsigned NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `heading` decimal(6,2) DEFAULT NULL,
  `speed` decimal(8,2) DEFAULT NULL,
  `accuracy` decimal(8,2) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `location_status` enum('ON','OFF') NOT NULL DEFAULT 'OFF',
  `connection_status` enum('ONLINE','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  `last_ping_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_live_loc_org_emp` (`organization_id`,`employee_id`),
  KEY `idx_live_loc_org_emp` (`organization_id`,`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=359 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_loans`
--

DROP TABLE IF EXISTS `employee_loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_loans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `loan_type_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loan_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_amount` decimal(15,2) NOT NULL,
  `loan_date` date NOT NULL,
  `tenure_months` int NOT NULL,
  `interest_rate` decimal(5,2) DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `emi` decimal(12,2) NOT NULL,
  `total_amount_with_interest` decimal(15,2) NOT NULL,
  `repaid_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `outstanding_amount` decimal(15,2) NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_by` bigint unsigned DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_loans_uuid_unique` (`uuid`),
  KEY `employee_loans_created_by_foreign` (`created_by`),
  KEY `employee_loans_updated_by_foreign` (`updated_by`),
  KEY `employee_loans_organization_id_index` (`organization_id`),
  KEY `employee_loans_employee_id_index` (`employee_id`),
  KEY `employee_loans_status_index` (`status`),
  CONSTRAINT `employee_loans_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_loans_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_loans_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_loans_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_location_history`
--

DROP TABLE IF EXISTS `employee_location_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_location_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL DEFAULT (uuid()),
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` int unsigned NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracy` decimal(8,2) DEFAULT NULL,
  `speed` decimal(8,2) DEFAULT NULL,
  `recorded_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loc_hist_emp_time` (`organization_id`,`employee_id`,`recorded_at`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_offboarding_records`
--

DROP TABLE IF EXISTS `employee_offboarding_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_offboarding_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `exit_type` varchar(100) NOT NULL DEFAULT 'resignation',
  `resignation_date` date DEFAULT NULL,
  `notice_period_days` int DEFAULT '30',
  `relieving_date` date DEFAULT NULL,
  `last_working_day` date DEFAULT NULL,
  `exit_interviewer_name` varchar(255) DEFAULT NULL,
  `exit_interviewer_id` bigint unsigned DEFAULT NULL,
  `exit_reason` text,
  `exit_notes` text,
  `assets_returned` tinyint(1) DEFAULT '0',
  `fnf_status` varchar(50) DEFAULT 'pending',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_offboarding_records_uuid_unique` (`uuid`),
  UNIQUE KEY `employee_offboarding_records_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `employee_offboarding_records_organization_id_index` (`organization_id`),
  KEY `employee_offboarding_records_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_offboarding_records_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_offboarding_records_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_onboarding_instances`
--

DROP TABLE IF EXISTS `employee_onboarding_instances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_onboarding_instances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `checklist_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `target_completion_date` date DEFAULT NULL,
  `status` enum('not_started','in_progress','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_onboarding_instances_uuid_unique` (`uuid`),
  KEY `employee_onboarding_instances_checklist_id_foreign` (`checklist_id`),
  KEY `employee_onboarding_instances_created_by_foreign` (`created_by`),
  KEY `employee_onboarding_instances_updated_by_foreign` (`updated_by`),
  KEY `employee_onboarding_instances_organization_id_index` (`organization_id`),
  KEY `employee_onboarding_instances_employee_id_index` (`employee_id`),
  KEY `employee_onboarding_instances_status_index` (`status`),
  CONSTRAINT `employee_onboarding_instances_checklist_id_foreign` FOREIGN KEY (`checklist_id`) REFERENCES `onboarding_checklists` (`id`),
  CONSTRAINT `employee_onboarding_instances_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_onboarding_instances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_onboarding_instances_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_onboarding_instances_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_onboarding_records`
--

DROP TABLE IF EXISTS `employee_onboarding_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_onboarding_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `interviewer_name` varchar(255) DEFAULT NULL,
  `interviewer_id` bigint unsigned DEFAULT NULL,
  `onboarded_by_name` varchar(255) DEFAULT NULL,
  `onboarded_by_id` bigint unsigned DEFAULT NULL,
  `interview_date` date DEFAULT NULL,
  `interview_rating` varchar(50) DEFAULT NULL,
  `interview_notes` text,
  `joining_date` date DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `orientation_completed` tinyint(1) DEFAULT '0',
  `documents_verified` tinyint(1) DEFAULT '0',
  `welcome_kit_issued` tinyint(1) DEFAULT '0',
  `notes` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_onboarding_records_uuid_unique` (`uuid`),
  UNIQUE KEY `employee_onboarding_records_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `employee_onboarding_records_organization_id_index` (`organization_id`),
  KEY `employee_onboarding_records_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_onboarding_records_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_onboarding_records_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_onboarding_tasks`
--

DROP TABLE IF EXISTS `employee_onboarding_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_onboarding_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `onboarding_instance_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `assigned_to_user_id` bigint unsigned NOT NULL,
  `status` enum('pending','in_progress','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `completion_date` date DEFAULT NULL,
  `completion_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_onboarding_tasks_uuid_unique` (`uuid`),
  KEY `employee_onboarding_tasks_item_id_foreign` (`item_id`),
  KEY `employee_onboarding_tasks_assigned_to_user_id_foreign` (`assigned_to_user_id`),
  KEY `employee_onboarding_tasks_created_by_foreign` (`created_by`),
  KEY `employee_onboarding_tasks_updated_by_foreign` (`updated_by`),
  KEY `employee_onboarding_tasks_organization_id_index` (`organization_id`),
  KEY `employee_onboarding_tasks_onboarding_instance_id_index` (`onboarding_instance_id`),
  KEY `employee_onboarding_tasks_status_index` (`status`),
  CONSTRAINT `employee_onboarding_tasks_assigned_to_user_id_foreign` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_onboarding_tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_onboarding_tasks_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `onboarding_checklist_items` (`id`),
  CONSTRAINT `employee_onboarding_tasks_onboarding_instance_id_foreign` FOREIGN KEY (`onboarding_instance_id`) REFERENCES `employee_onboarding_instances` (`id`),
  CONSTRAINT `employee_onboarding_tasks_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_onboarding_tasks_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_personal_info`
--

DROP TABLE IF EXISTS `employee_personal_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_personal_info` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `father_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spouse_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `children_count` int DEFAULT '0',
  `permanent_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_personal_info_uuid_unique` (`uuid`),
  UNIQUE KEY `employee_personal_info_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `employee_personal_info_employee_id_foreign` (`employee_id`),
  KEY `employee_personal_info_created_by_foreign` (`created_by`),
  KEY `employee_personal_info_updated_by_foreign` (`updated_by`),
  KEY `employee_personal_info_organization_id_index` (`organization_id`),
  CONSTRAINT `employee_personal_info_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_personal_info_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_personal_info_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_personal_info_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_policy_acceptances`
--

DROP TABLE IF EXISTS `employee_policy_acceptances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_policy_acceptances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `policy_document_id` bigint unsigned NOT NULL,
  `policy_version` varchar(20) NOT NULL,
  `accepted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_policy_acceptances_uuid_unique` (`uuid`),
  UNIQUE KEY `unq_user_policy_version` (`user_id`,`policy_document_id`,`policy_version`),
  KEY `employee_policy_acceptances_organization_id_index` (`organization_id`),
  KEY `employee_policy_acceptances_company_id_index` (`company_id`),
  KEY `employee_policy_acceptances_user_id_index` (`user_id`),
  KEY `employee_policy_acceptances_employee_id_index` (`employee_id`),
  KEY `employee_policy_acceptances_policy_document_id_index` (`policy_document_id`),
  KEY `employee_policy_acceptances_policy_version_index` (`policy_version`),
  CONSTRAINT `employee_policy_acceptances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_policy_acceptances_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_policy_acceptances_policy_document_id_foreign` FOREIGN KEY (`policy_document_id`) REFERENCES `policy_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_policy_acceptances_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_professional_info`
--

DROP TABLE IF EXISTS `employee_professional_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_professional_info` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `qualification` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialization` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `university` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_year` int DEFAULT NULL,
  `years_of_experience` int DEFAULT '0',
  `linkedin_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_professional_info_uuid_unique` (`uuid`),
  UNIQUE KEY `employee_professional_info_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `employee_professional_info_employee_id_foreign` (`employee_id`),
  KEY `employee_professional_info_created_by_foreign` (`created_by`),
  KEY `employee_professional_info_updated_by_foreign` (`updated_by`),
  KEY `employee_professional_info_organization_id_index` (`organization_id`),
  CONSTRAINT `employee_professional_info_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_professional_info_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_professional_info_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_professional_info_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_profile_update_requests`
--

DROP TABLE IF EXISTS `employee_profile_update_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_profile_update_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `request_type` enum('personal_info','contact','bank_details','emergency_contact') COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_section` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `current_value` json DEFAULT NULL,
  `requested_value` json DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_profile_update_requests_uuid_unique` (`uuid`),
  KEY `employee_profile_update_requests_approved_by_foreign` (`approved_by`),
  KEY `employee_profile_update_requests_created_by_foreign` (`created_by`),
  KEY `employee_profile_update_requests_updated_by_foreign` (`updated_by`),
  KEY `employee_profile_update_requests_organization_id_index` (`organization_id`),
  KEY `employee_profile_update_requests_employee_id_index` (`employee_id`),
  KEY `employee_profile_update_requests_status_index` (`status`),
  CONSTRAINT `employee_profile_update_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_profile_update_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_profile_update_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_profile_update_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_profile_update_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_references`
--

DROP TABLE IF EXISTS `employee_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_references` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `reference_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_references_uuid_unique` (`uuid`),
  KEY `employee_references_created_by_foreign` (`created_by`),
  KEY `employee_references_updated_by_foreign` (`updated_by`),
  KEY `employee_references_organization_id_index` (`organization_id`),
  KEY `employee_references_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_references_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_references_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_references_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_references_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_reporting_hierarchy`
--

DROP TABLE IF EXISTS `employee_reporting_hierarchy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_reporting_hierarchy` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `manager_id` bigint unsigned NOT NULL,
  `hierarchy_level` int NOT NULL,
  `path` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_reporting_hierarchy_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `employee_reporting_hierarchy_employee_id_foreign` (`employee_id`),
  KEY `employee_reporting_hierarchy_organization_id_index` (`organization_id`),
  KEY `employee_reporting_hierarchy_manager_id_index` (`manager_id`),
  KEY `employee_reporting_hierarchy_hierarchy_level_index` (`hierarchy_level`),
  CONSTRAINT `employee_reporting_hierarchy_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_reporting_hierarchy_manager_id_foreign` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_reporting_hierarchy_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_salary_structures`
--

DROP TABLE IF EXISTS `employee_salary_structures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_salary_structures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `salary_structure_id` bigint unsigned NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_salary_structures_uuid_unique` (`uuid`),
  KEY `employee_salary_structures_created_by_foreign` (`created_by`),
  KEY `employee_salary_structures_updated_by_foreign` (`updated_by`),
  KEY `employee_salary_structures_organization_id_index` (`organization_id`),
  KEY `employee_salary_structures_employee_id_index` (`employee_id`),
  KEY `employee_salary_structures_salary_structure_id_index` (`salary_structure_id`),
  KEY `employee_salary_structures_is_current_index` (`is_current`),
  CONSTRAINT `employee_salary_structures_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_salary_structures_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_salary_structures_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_salary_structures_salary_structure_id_foreign` FOREIGN KEY (`salary_structure_id`) REFERENCES `salary_structures` (`id`),
  CONSTRAINT `employee_salary_structures_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_shift_assignments`
--

DROP TABLE IF EXISTS `employee_shift_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_shift_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL DEFAULT '1',
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `shift_id` bigint unsigned DEFAULT NULL,
  `shift_rotation_id` bigint unsigned DEFAULT NULL,
  `assignment_start_date` date DEFAULT NULL,
  `assignment_end_date` date DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_shift_assignments_uuid_unique` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_skills`
--

DROP TABLE IF EXISTS `employee_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_skills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proficiency` enum('beginner','intermediate','expert') COLLATE utf8mb4_unicode_ci NOT NULL,
  `years_of_experience` int DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_skills_uuid_unique` (`uuid`),
  KEY `employee_skills_created_by_foreign` (`created_by`),
  KEY `employee_skills_updated_by_foreign` (`updated_by`),
  KEY `employee_skills_organization_id_index` (`organization_id`),
  KEY `employee_skills_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_skills_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_skills_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_skills_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_skills_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_statuses`
--

DROP TABLE IF EXISTS `employee_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `is_probation_status` tinyint(1) DEFAULT '0',
  `probation_period_value` int DEFAULT NULL,
  `probation_period_unit` varchar(50) DEFAULT NULL,
  `notify_on_completion` tinyint(1) DEFAULT '0',
  `is_confirmation_status` tinyint(1) DEFAULT '0',
  `is_resignation_status` tinyint(1) DEFAULT '0',
  `inactive_on_status_change` tinyint(1) DEFAULT '0',
  `status_color` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_statuses_uuid_unique` (`uuid`),
  KEY `employee_statuses_organization_id_index` (`organization_id`),
  KEY `employee_statuses_status_index` (`status`),
  CONSTRAINT `employee_statuses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_tracking_sessions`
--

DROP TABLE IF EXISTS `employee_tracking_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_tracking_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL DEFAULT (uuid()),
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` int unsigned NOT NULL,
  `session_date` date NOT NULL,
  `session_start` datetime DEFAULT NULL,
  `session_end` datetime DEFAULT NULL,
  `total_working_minutes` int unsigned NOT NULL DEFAULT '0',
  `total_break_minutes` int unsigned NOT NULL DEFAULT '0',
  `break_count` int unsigned NOT NULL DEFAULT '0',
  `total_distance_km` decimal(10,4) unsigned NOT NULL DEFAULT '0.0000',
  `ping_count` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `location_walk` longtext COMMENT 'JSON array of chronological walk points [ {latitude, longitude, recorded_at, speed} ]',
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_tracking_sessions_uuid_unique` (`uuid`),
  UNIQUE KEY `uniq_tracking_session` (`organization_id`,`employee_id`,`session_date`),
  KEY `idx_tracking_session_org_date` (`organization_id`,`session_date`),
  KEY `idx_tracking_session_emp_date` (`employee_id`,`session_date`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_transfers`
--

DROP TABLE IF EXISTS `employee_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `from_department_id` bigint unsigned DEFAULT NULL,
  `to_department_id` bigint unsigned DEFAULT NULL,
  `from_designation_id` bigint unsigned DEFAULT NULL,
  `to_designation_id` bigint unsigned DEFAULT NULL,
  `from_location_id` bigint unsigned DEFAULT NULL,
  `to_location_id` bigint unsigned DEFAULT NULL,
  `from_reporting_manager_id` bigint unsigned DEFAULT NULL,
  `to_reporting_manager_id` bigint unsigned DEFAULT NULL,
  `effective_date` date NOT NULL,
  `transfer_type` varchar(100) NOT NULL DEFAULT 'department_change',
  `transfer_reason` text,
  `notes` text,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_transfers_uuid_unique` (`uuid`),
  KEY `employee_transfers_created_by_foreign` (`created_by`),
  KEY `employee_transfers_organization_id_index` (`organization_id`),
  KEY `employee_transfers_employee_id_index` (`employee_id`),
  KEY `employee_transfers_effective_date_index` (`effective_date`),
  CONSTRAINT `employee_transfers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_transfers_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_transfers_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_types`
--

DROP TABLE IF EXISTS `employee_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_types_uuid_unique` (`uuid`),
  KEY `employee_types_organization_id_index` (`organization_id`),
  KEY `employee_types_status_index` (`status`),
  CONSTRAINT `employee_types_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_versions`
--

DROP TABLE IF EXISTS `employee_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `version_number` int NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `change_type` enum('create','update','delete','restore') COLLATE utf8mb4_unicode_ci NOT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `changed_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_versions_uuid_unique` (`uuid`),
  KEY `employee_versions_changed_by_foreign` (`changed_by`),
  KEY `employee_versions_organization_id_index` (`organization_id`),
  KEY `employee_versions_employee_id_index` (`employee_id`),
  KEY `employee_versions_entity_type_index` (`entity_type`),
  KEY `employee_versions_version_number_index` (`version_number`),
  KEY `employee_versions_created_at_index` (`created_at`),
  CONSTRAINT `employee_versions_changed_by_foreign` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_versions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_versions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_work_experience`
--

DROP TABLE IF EXISTS `employee_work_experience`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_work_experience` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `company_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `reason_for_leaving` text COLLATE utf8mb4_unicode_ci,
  `reference_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_work_experience_uuid_unique` (`uuid`),
  KEY `employee_work_experience_created_by_foreign` (`created_by`),
  KEY `employee_work_experience_updated_by_foreign` (`updated_by`),
  KEY `employee_work_experience_organization_id_index` (`organization_id`),
  KEY `employee_work_experience_employee_id_index` (`employee_id`),
  CONSTRAINT `employee_work_experience_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_work_experience_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_work_experience_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employee_work_experience_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `source_candidate_id` bigint unsigned DEFAULT NULL,
  `source_application_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('candidate','onboarding','probation','active','inactive','notice','exit','alumni') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` longtext COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_group` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhar_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passport_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_designation_id` bigint unsigned DEFAULT NULL,
  `current_department_id` bigint unsigned DEFAULT NULL,
  `current_grade_id` bigint unsigned DEFAULT NULL,
  `current_branch_id` bigint unsigned DEFAULT NULL,
  `current_location_id` bigint unsigned DEFAULT NULL,
  `reporting_manager_id` bigint unsigned DEFAULT NULL,
  `cost_center_id` bigint unsigned DEFAULT NULL,
  `employment_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'full_time',
  `date_of_joining` date NOT NULL,
  `date_of_confirmation` date DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `custom_id_card` text COLLATE utf8mb4_unicode_ci,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `job_title` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_bank` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pf_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uan_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `esic_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_band` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eligible_for_eps` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `background_verification` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_policy_accepted` tinyint(1) DEFAULT '0',
  `document_policy_accepted_at` timestamp NULL DEFAULT NULL,
  `is_ceo` tinyint(1) NOT NULL DEFAULT '0',
  `is_ceo_profile_hidden` tinyint(1) NOT NULL DEFAULT '1',
  `employee_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marital_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_uuid_unique` (`uuid`),
  UNIQUE KEY `employees_organization_id_employee_code_unique` (`organization_id`,`employee_code`),
  UNIQUE KEY `employees_organization_id_email_unique` (`organization_id`,`email`),
  KEY `employees_current_designation_id_foreign` (`current_designation_id`),
  KEY `employees_current_department_id_foreign` (`current_department_id`),
  KEY `employees_current_branch_id_foreign` (`current_branch_id`),
  KEY `employees_cost_center_id_foreign` (`cost_center_id`),
  KEY `employees_created_by_foreign` (`created_by`),
  KEY `employees_updated_by_foreign` (`updated_by`),
  KEY `employees_organization_id_index` (`organization_id`),
  KEY `employees_status_index` (`status`),
  KEY `employees_created_at_index` (`created_at`),
  KEY `employees_reporting_manager_id_index` (`reporting_manager_id`),
  KEY `employees_current_location_id_foreign` (`current_location_id`),
  KEY `fk_emp_grade` (`current_grade_id`),
  CONSTRAINT `employees_cost_center_id_foreign` FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`),
  CONSTRAINT `employees_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employees_current_branch_id_foreign` FOREIGN KEY (`current_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `employees_current_department_id_foreign` FOREIGN KEY (`current_department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `employees_current_designation_id_foreign` FOREIGN KEY (`current_designation_id`) REFERENCES `designations` (`id`),
  CONSTRAINT `employees_current_location_id_foreign` FOREIGN KEY (`current_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `employees_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `employees_reporting_manager_id_foreign` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employees_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_emp_grade` FOREIGN KEY (`current_grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=691 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `engagement_analytics`
--

DROP TABLE IF EXISTS `engagement_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `engagement_analytics` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `period_date` date NOT NULL,
  `posts_count` int unsigned DEFAULT '0',
  `comments_count` int unsigned DEFAULT '0',
  `reactions_count` int unsigned DEFAULT '0',
  `bookmarks_count` int unsigned DEFAULT '0',
  `recognition_given` int unsigned DEFAULT '0',
  `recognition_received` int unsigned DEFAULT '0',
  `surveys_completed` int unsigned DEFAULT '0',
  `surveys_avg_score` decimal(5,2) DEFAULT NULL,
  `suggestion_status` json DEFAULT NULL,
  `engagement_score` decimal(5,2) DEFAULT '0.00',
  `sentiment_score` decimal(5,2) DEFAULT NULL,
  `attrition_risk_score` decimal(5,2) DEFAULT NULL,
  `last_active_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_org_date` (`organization_id`,`period_date`),
  KEY `idx_analytics_engagement` (`engagement_score`,`period_date`),
  KEY `idx_analytics_attrition` (`attrition_risk_score`,`period_date`),
  KEY `idx_analytics_employee_date` (`employee_id`,`period_date`),
  CONSTRAINT `engagement_analytics_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `engagement_analytics_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `engagement_audit_logs`
--

DROP TABLE IF EXISTS `engagement_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `engagement_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` enum('create','update','delete','publish','archive','award_badge','vote','react','comment','respond_suggestion','export') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` enum('feed_post','survey','suggestion','badge','milestone','event','poll','comment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `changes_json` json DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_org_date` (`organization_id`,`created_at`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `engagement_audit_logs_user_id_index` (`user_id`),
  KEY `engagement_audit_logs_action_index` (`action`),
  CONSTRAINT `engagement_audit_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `engagement_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `enps_snapshots`
--

DROP TABLE IF EXISTS `enps_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enps_snapshots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `survey_id` bigint unsigned NOT NULL,
  `period_label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `promoters_count` int unsigned DEFAULT '0',
  `passives_count` int unsigned DEFAULT '0',
  `detractors_count` int unsigned DEFAULT '0',
  `response_count` int unsigned DEFAULT '0',
  `score` decimal(5,2) DEFAULT NULL,
  `participation_rate` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enps_org_date` (`organization_id`,`created_at`),
  KEY `enps_snapshots_survey_id_index` (`survey_id`),
  CONSTRAINT `enps_snapshots_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `enps_snapshots_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_attendees`
--

DROP TABLE IF EXISTS `event_attendees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_attendees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `event_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `status` enum('invited','accepted','declined','interested') COLLATE utf8mb4_unicode_ci DEFAULT 'invited',
  `response_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_event_attendee` (`event_id`,`employee_id`),
  KEY `event_attendees_event_id_index` (`event_id`),
  KEY `idx_attendee_employee_status` (`employee_id`,`status`),
  CONSTRAINT `event_attendees_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_attendees_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `event_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `end_time` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organizer_id` bigint unsigned DEFAULT NULL,
  `max_attendees` int unsigned DEFAULT NULL,
  `feed_post_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `venue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_days_before` int DEFAULT '0',
  `require_participation` tinyint(1) DEFAULT '0',
  `allow_comments` tinyint(1) DEFAULT '0',
  `set_reminder` tinyint(1) DEFAULT '0',
  `company_ids` longtext COLLATE utf8mb4_unicode_ci,
  `location_ids` longtext COLLATE utf8mb4_unicode_ci,
  `department_ids` longtext COLLATE utf8mb4_unicode_ci,
  `shift_ids` longtext COLLATE utf8mb4_unicode_ci,
  `grade_ids` longtext COLLATE utf8mb4_unicode_ci,
  `employment_types` longtext COLLATE utf8mb4_unicode_ci,
  `employee_status_ids` longtext COLLATE utf8mb4_unicode_ci,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'All',
  `is_active` tinyint(1) DEFAULT '1',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `updated_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `events_uuid_unique` (`uuid`),
  KEY `events_organizer_id_foreign` (`organizer_id`),
  KEY `events_feed_post_id_foreign` (`feed_post_id`),
  KEY `events_created_by_foreign` (`created_by`),
  KEY `idx_events_org_date` (`organization_id`,`start_date`),
  KEY `events_event_type_index` (`event_type`),
  CONSTRAINT `events_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `events_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `events_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `events_organizer_id_foreign` FOREIGN KEY (`organizer_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exit_clearance`
--

DROP TABLE IF EXISTS `exit_clearance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exit_clearance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `resignation_id` bigint unsigned DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `clearance_date` date DEFAULT NULL,
  `finance_cleared` tinyint(1) DEFAULT '0',
  `it_cleared` tinyint(1) DEFAULT '0',
  `operations_cleared` tinyint(1) DEFAULT '0',
  `security_cleared` tinyint(1) DEFAULT '0',
  `equipment_returned` tinyint(1) DEFAULT '0',
  `documents_returned` tinyint(1) DEFAULT '0',
  `access_revoked` tinyint(1) DEFAULT '0',
  `remarks` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exit_clearance_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exit_clearance_checklists`
--

DROP TABLE IF EXISTS `exit_clearance_checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exit_clearance_checklists` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `checklist_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exit_clearance_checklists_uuid_unique` (`uuid`),
  KEY `exit_clearance_checklists_created_by_foreign` (`created_by`),
  KEY `exit_clearance_checklists_updated_by_foreign` (`updated_by`),
  KEY `exit_clearance_checklists_organization_id_index` (`organization_id`),
  CONSTRAINT `exit_clearance_checklists_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `exit_clearance_checklists_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `exit_clearance_checklists_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exit_clearance_items`
--

DROP TABLE IF EXISTS `exit_clearance_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exit_clearance_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `checklist_id` bigint unsigned NOT NULL,
  `item_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_description` text COLLATE utf8mb4_unicode_ci,
  `assigned_to_role` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exit_clearance_items_uuid_unique` (`uuid`),
  KEY `exit_clearance_items_created_by_foreign` (`created_by`),
  KEY `exit_clearance_items_updated_by_foreign` (`updated_by`),
  KEY `exit_clearance_items_organization_id_index` (`organization_id`),
  KEY `exit_clearance_items_checklist_id_index` (`checklist_id`),
  CONSTRAINT `exit_clearance_items_checklist_id_foreign` FOREIGN KEY (`checklist_id`) REFERENCES `exit_clearance_checklists` (`id`),
  CONSTRAINT `exit_clearance_items_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `exit_clearance_items_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `exit_clearance_items_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exit_requests`
--

DROP TABLE IF EXISTS `exit_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exit_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `resignation_date` date NOT NULL,
  `last_working_day` date NOT NULL,
  `reason_for_leaving` text COLLATE utf8mb4_unicode_ci,
  `notice_period_served` int DEFAULT NULL,
  `status` enum('initiated','approved','rejected','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'initiated',
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exit_requests_uuid_unique` (`uuid`),
  KEY `exit_requests_approved_by_foreign` (`approved_by`),
  KEY `exit_requests_created_by_foreign` (`created_by`),
  KEY `exit_requests_updated_by_foreign` (`updated_by`),
  KEY `exit_requests_organization_id_index` (`organization_id`),
  KEY `exit_requests_employee_id_index` (`employee_id`),
  KEY `exit_requests_status_index` (`status`),
  CONSTRAINT `exit_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `exit_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `exit_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `exit_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `exit_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_approval_events`
--

DROP TABLE IF EXISTS `expense_approval_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_approval_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `run_id` bigint unsigned NOT NULL,
  `step_number` int DEFAULT NULL,
  `actor_user_id` bigint unsigned NOT NULL,
  `action` varchar(30) NOT NULL,
  `comments` text,
  `details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_approval_events_run_id_index` (`run_id`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_approval_logs`
--

DROP TABLE IF EXISTS `expense_approval_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_approval_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `claim_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned DEFAULT NULL,
  `approver_name` varchar(150) NOT NULL,
  `approver_role` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  `comments` text,
  `is_absentee_override` tinyint(1) NOT NULL DEFAULT '0',
  `delegated_for_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_approval_logs_claim_id_index` (`claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_approval_runs`
--

DROP TABLE IF EXISTS `expense_approval_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_approval_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `workflow_version` int NOT NULL,
  `submitter_user_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `snapshot` text NOT NULL,
  `current_step` int NOT NULL DEFAULT '0',
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_approval_runs_organization_id_index` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `spending_limit` decimal(15,2) DEFAULT '0.00',
  `is_receipt_mandatory` tinyint(1) DEFAULT '0',
  `min_amount_for_receipt` decimal(15,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `auto_approval_threshold` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `expense_categories_organization_id_index` (`organization_id`),
  KEY `expense_categories_code_index` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_claim_items`
--

DROP TABLE IF EXISTS `expense_claim_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_claim_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `claim_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `expense_date` date NOT NULL,
  `claimed_amount` decimal(15,2) DEFAULT '0.00',
  `approved_amount` decimal(15,2) DEFAULT '0.00',
  `rejected_amount` decimal(15,2) DEFAULT '0.00',
  `merchant_name` varchar(150) DEFAULT NULL,
  `description` text,
  `project_cost_center` varchar(100) DEFAULT NULL,
  `receipt_url` longtext,
  `receipt_file_name` varchar(255) DEFAULT NULL,
  `receipt_file_type` varchar(50) DEFAULT NULL,
  `receipt_file_size` int DEFAULT NULL,
  `policy_validated` tinyint(1) DEFAULT '1',
  `policy_violations` text,
  `employee_justification` text,
  `status` varchar(50) DEFAULT 'pending',
  `adjustment_reason` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_claim_items_claim_id_index` (`claim_id`),
  KEY `expense_claim_items_category_id_index` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_claims`
--

DROP TABLE IF EXISTS `expense_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_claims` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `claim_number` varchar(50) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `claim_date` date NOT NULL,
  `total_claimed_amount` decimal(15,2) DEFAULT '0.00',
  `total_approved_amount` decimal(15,2) DEFAULT '0.00',
  `total_rejected_amount` decimal(15,2) DEFAULT '0.00',
  `payment_method` varchar(50) DEFAULT 'payroll',
  `merchant_name` varchar(150) DEFAULT NULL,
  `description` text,
  `project_cost_center` varchar(100) DEFAULT NULL,
  `receipt_url` longtext,
  `status` varchar(50) DEFAULT 'draft',
  `current_approver_id` bigint unsigned DEFAULT NULL,
  `current_approver_role` varchar(255) DEFAULT NULL,
  `rejection_reason` text,
  `return_comments` text,
  `travel_request_id` bigint unsigned DEFAULT NULL,
  `travel_advance_id` bigint unsigned DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `reimbursed_at` timestamp NULL DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `paid_amount` decimal(15,2) DEFAULT '0.00',
  `payment_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_by_user_id` bigint unsigned DEFAULT NULL,
  `current_level` int DEFAULT '1',
  `workflow_id` bigint unsigned DEFAULT NULL,
  `submitted_by_role` varchar(50) DEFAULT NULL,
  `approval_run_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_claims_uuid_unique` (`uuid`),
  UNIQUE KEY `expense_claims_claim_number_unique` (`claim_number`),
  KEY `expense_claims_organization_id_index` (`organization_id`),
  KEY `expense_claims_employee_id_index` (`employee_id`),
  KEY `expense_claims_status_index` (`status`),
  KEY `expense_claims_claim_number_index` (`claim_number`),
  KEY `expense_claims_approval_run_id_index` (`approval_run_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_config_labels`
--

DROP TABLE IF EXISTS `expense_config_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_config_labels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `label_key` varchar(100) NOT NULL,
  `label_value` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_config_labels_organization_id_label_key_unique` (`organization_id`,`label_key`),
  KEY `expense_config_labels_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_mileage_designation_rates`
--

DROP TABLE IF EXISTS `expense_mileage_designation_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_mileage_designation_rates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `designation_id` bigint unsigned NOT NULL,
  `rate_car` decimal(10,2) NOT NULL DEFAULT '12.00',
  `rate_bike` decimal(10,2) NOT NULL DEFAULT '6.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_number_sequences`
--

DROP TABLE IF EXISTS `expense_number_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_number_sequences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `seq_key` varchar(50) NOT NULL,
  `prefix` varchar(20) DEFAULT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_number_sequences_organization_id_seq_key_unique` (`organization_id`,`seq_key`),
  KEY `expense_number_sequences_organization_id_index` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_payments`
--

DROP TABLE IF EXISTS `expense_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `run_id` bigint unsigned NOT NULL,
  `paid_by_user_id` bigint unsigned NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `advance_applied` decimal(15,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(8) NOT NULL,
  `payment_date` date NOT NULL,
  `method` varchar(50) NOT NULL,
  `reference` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_payments_run_id_unique` (`run_id`),
  KEY `expense_payments_organization_id_payment_date_index` (`organization_id`,`payment_date`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_policies`
--

DROP TABLE IF EXISTS `expense_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `policy_name` varchar(150) NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `max_limit_per_claim` decimal(15,2) DEFAULT '0.00',
  `max_limit_per_month` decimal(15,2) DEFAULT '0.00',
  `require_receipt_above` decimal(15,2) DEFAULT '0.00',
  `allow_exception` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_policies_organization_id_index` (`organization_id`),
  KEY `expense_policies_category_id_index` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_settings`
--

DROP TABLE IF EXISTS `expense_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `auto_approval_threshold` decimal(15,2) DEFAULT '500.00',
  `mileage_rate_car` decimal(10,2) DEFAULT '12.00',
  `mileage_rate_bike` decimal(10,2) DEFAULT '6.00',
  `require_manager_approval` tinyint(1) DEFAULT '1',
  `require_finance_approval` tinyint(1) DEFAULT '1',
  `multi_level_approval` tinyint(1) DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `enable_travel_module` tinyint(1) DEFAULT '1',
  `enable_mileage_module` tinyint(1) DEFAULT '1',
  `currency_symbol` varchar(8) NOT NULL DEFAULT '₹',
  `currency_code` varchar(8) NOT NULL DEFAULT 'INR',
  `currency_locale` varchar(20) NOT NULL DEFAULT 'en-IN',
  `claim_number_prefix` varchar(10) NOT NULL DEFAULT 'EXP',
  `travel_request_number_prefix` varchar(10) NOT NULL DEFAULT 'TRV',
  `travel_advance_number_prefix` varchar(10) NOT NULL DEFAULT 'ADV',
  `default_payment_method` varchar(50) NOT NULL DEFAULT 'bank_transfer',
  `default_advance_status` varchar(50) NOT NULL DEFAULT 'pending_finance',
  `workflow_fallback_max_amount` decimal(15,2) NOT NULL DEFAULT '10000000.00',
  `number_sequence_digits` int NOT NULL DEFAULT '6',
  `workflows_seeded` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_settings_organization_id_unique` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_workflow_levels`
--

DROP TABLE IF EXISTS `expense_workflow_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_workflow_levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `level_order` int NOT NULL DEFAULT '1',
  `approver_type` varchar(50) NOT NULL,
  `approver_role` varchar(100) DEFAULT NULL,
  `step_name` varchar(100) NOT NULL,
  `is_mandatory` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_workflow_levels_workflow_id_index` (`workflow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_workflows`
--

DROP TABLE IF EXISTS `expense_workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_workflows` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `min_amount` decimal(15,2) DEFAULT '0.00',
  `max_amount` decimal(15,2) DEFAULT '10000000.00',
  `department_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `target_role` varchar(50) DEFAULT 'all',
  PRIMARY KEY (`id`),
  KEY `expense_workflows_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feature_access_logs`
--

DROP TABLE IF EXISTS `feature_access_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_access_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `module_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feature_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_type` enum('view','create','update','delete','export') COLLATE utf8mb4_unicode_ci DEFAULT 'view',
  `granted` tinyint(1) DEFAULT NULL,
  `reason_denied` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `feature_access_logs_organization_id_foreign` (`organization_id`),
  KEY `feature_access_logs_user_id_foreign` (`user_id`),
  KEY `feature_access_logs_module_key_feature_key_index` (`module_key`,`feature_key`),
  KEY `feature_access_logs_granted_index` (`granted`),
  CONSTRAINT `feature_access_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `feature_access_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_attachments`
--

DROP TABLE IF EXISTS `feed_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feed_post_id` bigint unsigned NOT NULL,
  `attachment_type` enum('image','video','document','poll') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_seconds` int unsigned DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feed_attachments_uuid_unique` (`uuid`),
  KEY `feed_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `feed_attachments_feed_post_id_index` (`feed_post_id`),
  KEY `feed_attachments_attachment_type_index` (`attachment_type`),
  CONSTRAINT `feed_attachments_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_bookmarks`
--

DROP TABLE IF EXISTS `feed_bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_bookmarks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `feed_post_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feed_bookmark_employee` (`feed_post_id`,`employee_id`),
  KEY `feed_bookmarks_feed_post_id_index` (`feed_post_id`),
  KEY `idx_bookmarks_employee_date` (`employee_id`,`created_at`),
  CONSTRAINT `feed_bookmarks_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_bookmarks_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_hashtags`
--

DROP TABLE IF EXISTS `feed_hashtags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_hashtags` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tag_text` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `usage_count` int unsigned DEFAULT '0',
  `last_used_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hashtag_org_text` (`organization_id`,`tag_text`),
  KEY `feed_hashtags_organization_id_index` (`organization_id`),
  KEY `idx_hashtags_trending` (`usage_count`,`last_used_at`),
  CONSTRAINT `feed_hashtags_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_mentions`
--

DROP TABLE IF EXISTS `feed_mentions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_mentions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `feed_post_id` bigint unsigned DEFAULT NULL,
  `comment_id` bigint unsigned DEFAULT NULL,
  `mentioned_employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `feed_mentions_feed_post_id_index` (`feed_post_id`),
  KEY `feed_mentions_comment_id_index` (`comment_id`),
  KEY `idx_mentions_employee_date` (`mentioned_employee_id`,`created_at`),
  CONSTRAINT `feed_mentions_comment_id_foreign` FOREIGN KEY (`comment_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_mentions_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_mentions_mentioned_employee_id_foreign` FOREIGN KEY (`mentioned_employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_poll_options`
--

DROP TABLE IF EXISTS `feed_poll_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_poll_options` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `poll_id` bigint unsigned NOT NULL,
  `option_text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `vote_count` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `feed_poll_options_poll_id_index` (`poll_id`),
  CONSTRAINT `feed_poll_options_poll_id_foreign` FOREIGN KEY (`poll_id`) REFERENCES `feed_polls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_poll_votes`
--

DROP TABLE IF EXISTS `feed_poll_votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_poll_votes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `poll_id` bigint unsigned NOT NULL,
  `option_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_poll_vote_employee_option` (`poll_id`,`employee_id`,`option_id`),
  KEY `feed_poll_votes_option_id_foreign` (`option_id`),
  KEY `feed_poll_votes_poll_id_index` (`poll_id`),
  KEY `feed_poll_votes_employee_id_index` (`employee_id`),
  CONSTRAINT `feed_poll_votes_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_poll_votes_option_id_foreign` FOREIGN KEY (`option_id`) REFERENCES `feed_poll_options` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_poll_votes_poll_id_foreign` FOREIGN KEY (`poll_id`) REFERENCES `feed_polls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_polls`
--

DROP TABLE IF EXISTS `feed_polls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_polls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feed_post_id` bigint unsigned NOT NULL,
  `question` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allows_multiple` tinyint(1) DEFAULT '0',
  `is_anonymous` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feed_polls_uuid_unique` (`uuid`),
  KEY `feed_polls_created_by_foreign` (`created_by`),
  KEY `feed_polls_feed_post_id_index` (`feed_post_id`),
  KEY `idx_feed_polls_expiry` (`expires_at`,`created_at`),
  CONSTRAINT `feed_polls_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `feed_polls_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_post_comments`
--

DROP TABLE IF EXISTS `feed_post_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_post_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feed_post_id` bigint unsigned NOT NULL,
  `parent_comment_id` bigint unsigned DEFAULT NULL,
  `author_id` bigint unsigned NOT NULL,
  `comment_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `rich_text_json` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `reply_count` int unsigned DEFAULT '0',
  `like_count` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `feed_post_comments_uuid_unique` (`uuid`),
  KEY `feed_post_comments_parent_comment_id_foreign` (`parent_comment_id`),
  KEY `feed_post_comments_created_by_foreign` (`created_by`),
  KEY `feed_post_comments_updated_by_foreign` (`updated_by`),
  KEY `feed_post_comments_feed_post_id_index` (`feed_post_id`),
  KEY `idx_feed_comments_thread` (`feed_post_id`,`parent_comment_id`),
  KEY `feed_post_comments_author_id_index` (`author_id`),
  KEY `feed_post_comments_created_at_index` (`created_at`),
  CONSTRAINT `feed_post_comments_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_post_comments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `feed_post_comments_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_post_comments_parent_comment_id_foreign` FOREIGN KEY (`parent_comment_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_post_comments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_post_hashtags`
--

DROP TABLE IF EXISTS `feed_post_hashtags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_post_hashtags` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `feed_post_id` bigint unsigned NOT NULL,
  `hashtag_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_hashtag` (`feed_post_id`,`hashtag_id`),
  KEY `feed_post_hashtags_feed_post_id_index` (`feed_post_id`),
  KEY `feed_post_hashtags_hashtag_id_index` (`hashtag_id`),
  CONSTRAINT `feed_post_hashtags_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_post_hashtags_hashtag_id_foreign` FOREIGN KEY (`hashtag_id`) REFERENCES `feed_hashtags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_posts`
--

DROP TABLE IF EXISTS `feed_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `author_id` bigint unsigned DEFAULT NULL,
  `post_type` enum('user_post','announcement','recognition','event','poll','suggestion','birthday','work_anniversary','promotion','service_milestone') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user_post',
  `content` text COLLATE utf8mb4_unicode_ci,
  `rich_text_json` json DEFAULT NULL,
  `visibility_level` enum('public','department','team','branch','private') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `visible_to_department_ids` json DEFAULT NULL,
  `visible_to_team_ids` json DEFAULT NULL,
  `visible_to_branch_ids` json DEFAULT NULL,
  `visible_to_role_ids` json DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT '0',
  `pin_priority` int unsigned DEFAULT NULL,
  `is_trending` tinyint(1) DEFAULT '0',
  `engagement_score` decimal(10,2) DEFAULT '0.00',
  `scheduled_publish_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `allow_comments` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `like_count` int unsigned DEFAULT '0',
  `comment_count` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `feed_posts_uuid_unique` (`uuid`),
  KEY `feed_posts_created_by_foreign` (`created_by`),
  KEY `feed_posts_updated_by_foreign` (`updated_by`),
  KEY `feed_posts_organization_id_index` (`organization_id`),
  KEY `idx_feed_posts_org_date` (`organization_id`,`created_at`),
  KEY `idx_feed_posts_pinned` (`is_pinned`,`pin_priority`,`created_at`),
  KEY `feed_posts_post_type_index` (`post_type`),
  KEY `feed_posts_author_id_index` (`author_id`),
  KEY `idx_feed_posts_trending` (`engagement_score`,`created_at`),
  KEY `feed_posts_is_trending_index` (`is_trending`),
  CONSTRAINT `feed_posts_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `feed_posts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `feed_posts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_posts_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feed_reactions`
--

DROP TABLE IF EXISTS `feed_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_reactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `feed_post_id` bigint unsigned DEFAULT NULL,
  `comment_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `reaction_type` enum('like','heart','celebrate','clap','fire') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_reaction_employee` (`feed_post_id`,`employee_id`,`reaction_type`),
  UNIQUE KEY `uq_comment_reaction_employee` (`comment_id`,`employee_id`,`reaction_type`),
  KEY `feed_reactions_feed_post_id_index` (`feed_post_id`),
  KEY `feed_reactions_comment_id_index` (`comment_id`),
  KEY `feed_reactions_employee_id_index` (`employee_id`),
  CONSTRAINT `feed_reactions_comment_id_foreign` FOREIGN KEY (`comment_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_reactions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feed_reactions_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedback_requests`
--

DROP TABLE IF EXISTS `feedback_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `reviewer_id` bigint unsigned NOT NULL,
  `cycle_id` bigint unsigned NOT NULL,
  `feedback_type` enum('self','peer','manager','direct_report','360') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','completed','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `deadline` date NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feedback_requests_uuid_unique` (`uuid`),
  KEY `feedback_requests_cycle_id_foreign` (`cycle_id`),
  KEY `feedback_requests_created_by_foreign` (`created_by`),
  KEY `feedback_requests_updated_by_foreign` (`updated_by`),
  KEY `feedback_requests_organization_id_index` (`organization_id`),
  KEY `feedback_requests_employee_id_index` (`employee_id`),
  KEY `feedback_requests_reviewer_id_index` (`reviewer_id`),
  KEY `feedback_requests_feedback_type_index` (`feedback_type`),
  KEY `feedback_requests_status_index` (`status`),
  CONSTRAINT `feedback_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `feedback_requests_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `feedback_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `feedback_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `feedback_requests_reviewer_id_foreign` FOREIGN KEY (`reviewer_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `feedback_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedback_responses`
--

DROP TABLE IF EXISTS `feedback_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_responses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `feedback_request_id` bigint unsigned NOT NULL,
  `response_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `is_anonymous` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feedback_responses_uuid_unique` (`uuid`),
  KEY `feedback_responses_organization_id_index` (`organization_id`),
  KEY `feedback_responses_feedback_request_id_index` (`feedback_request_id`),
  CONSTRAINT `feedback_responses_feedback_request_id_foreign` FOREIGN KEY (`feedback_request_id`) REFERENCES `feedback_requests` (`id`),
  CONSTRAINT `feedback_responses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `final_settlement`
--

DROP TABLE IF EXISTS `final_settlement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_settlement` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `resignation_id` bigint unsigned DEFAULT NULL,
  `settlement_date` date NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `final_salary` decimal(12,2) DEFAULT NULL,
  `gratuity` decimal(12,2) DEFAULT NULL,
  `leave_encashment` decimal(12,2) DEFAULT NULL,
  `bonus` decimal(12,2) DEFAULT NULL,
  `other_benefits` decimal(12,2) DEFAULT NULL,
  `deductions` decimal(12,2) DEFAULT NULL,
  `net_amount` decimal(12,2) DEFAULT NULL,
  `payment_mode` varchar(50) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `final_settlement_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `full_final_settlements`
--

DROP TABLE IF EXISTS `full_final_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `full_final_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `exit_date` date NOT NULL,
  `notice_period_days` int NOT NULL,
  `notice_period_recovery` decimal(15,2) NOT NULL DEFAULT '0.00',
  `leave_encashment_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `gratuity_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `bonus_settlement` decimal(15,2) NOT NULL DEFAULT '0.00',
  `asset_recovery_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `other_deductions` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_settlement_amount` decimal(15,2) NOT NULL,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `status` enum('draft','exit_requested','submitted','approved','rejected','processed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `processed_date` timestamp NULL DEFAULT NULL,
  `settlement_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `full_final_settlements_uuid_unique` (`uuid`),
  KEY `full_final_settlements_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `full_final_settlements_approved_by_foreign` (`approved_by`),
  KEY `full_final_settlements_created_by_foreign` (`created_by`),
  KEY `full_final_settlements_updated_by_foreign` (`updated_by`),
  KEY `full_final_settlements_organization_id_index` (`organization_id`),
  KEY `full_final_settlements_employee_id_index` (`employee_id`),
  KEY `full_final_settlements_status_index` (`status`),
  CONSTRAINT `full_final_settlements_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `full_final_settlements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `full_final_settlements_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `full_final_settlements_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `full_final_settlements_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `full_final_settlements_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `generated_letters`
--

DROP TABLE IF EXISTS `generated_letters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `generated_letters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `letter_template_id` bigint unsigned DEFAULT NULL,
  `letter_code` varchar(50) NOT NULL,
  `letter_type` enum('interview_call','intent_to_offer','offer_letter','appointment','nda','code_of_conduct','confirmation','increment','promotion','warning','resignation_acceptance','relieving','experience','custom') NOT NULL,
  `letter_category` varchar(50) DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `candidate_id` bigint unsigned DEFAULT NULL,
  `recipient_name` varchar(255) NOT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `rendered_html` longtext NOT NULL,
  `rendered_pdf_url` longtext,
  `merge_data` json DEFAULT NULL,
  `status` enum('draft','sent','acknowledged','signed','revoked') DEFAULT 'draft',
  `sent_at` timestamp NULL DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `signed_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `digital_signature_url` longtext,
  `acknowledgment_note` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `generated_letters_uuid_unique` (`uuid`),
  KEY `generated_letters_organization_id_index` (`organization_id`),
  KEY `generated_letters_employee_id_index` (`employee_id`),
  KEY `generated_letters_candidate_id_index` (`candidate_id`),
  KEY `generated_letters_letter_type_index` (`letter_type`),
  KEY `generated_letters_status_index` (`status`),
  KEY `generated_letters_letter_template_id_index` (`letter_template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_progress`
--

DROP TABLE IF EXISTS `goal_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `goal_id` bigint unsigned NOT NULL,
  `progress_value` decimal(10,2) NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `goal_progress_uuid_unique` (`uuid`),
  KEY `goal_progress_updated_by_foreign` (`updated_by`),
  KEY `goal_progress_organization_id_index` (`organization_id`),
  KEY `goal_progress_goal_id_index` (`goal_id`),
  CONSTRAINT `goal_progress_goal_id_foreign` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`),
  CONSTRAINT `goal_progress_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `goal_progress_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_templates`
--

DROP TABLE IF EXISTS `goal_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `template_data` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `goal_templates_uuid_unique` (`uuid`),
  KEY `goal_templates_created_by_foreign` (`created_by`),
  KEY `goal_templates_updated_by_foreign` (`updated_by`),
  KEY `goal_templates_organization_id_index` (`organization_id`),
  KEY `goal_templates_category_index` (`category`),
  KEY `goal_templates_status_index` (`status`),
  CONSTRAINT `goal_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `goal_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `goal_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goals`
--

DROP TABLE IF EXISTS `goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `goal_template_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `target_value` decimal(10,2) DEFAULT NULL,
  `progress` decimal(5,2) DEFAULT '0.00',
  `status` enum('draft','active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `weight` decimal(5,2) DEFAULT '1.00',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `goals_uuid_unique` (`uuid`),
  KEY `goals_goal_template_id_foreign` (`goal_template_id`),
  KEY `goals_created_by_foreign` (`created_by`),
  KEY `goals_updated_by_foreign` (`updated_by`),
  KEY `goals_organization_id_index` (`organization_id`),
  KEY `goals_employee_id_index` (`employee_id`),
  KEY `goals_status_index` (`status`),
  CONSTRAINT `goals_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `goals_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `goals_goal_template_id_foreign` FOREIGN KEY (`goal_template_id`) REFERENCES `goal_templates` (`id`),
  CONSTRAINT `goals_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `goals_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `grades`
--

DROP TABLE IF EXISTS `grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_code` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grades_uuid_unique` (`uuid`),
  UNIQUE KEY `grades_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `grades_created_by_foreign` (`created_by`),
  KEY `grades_updated_by_foreign` (`updated_by`),
  KEY `grades_organization_id_index` (`organization_id`),
  KEY `grades_status_index` (`status`),
  KEY `grades_created_at_index` (`created_at`),
  CONSTRAINT `grades_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `grades_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `grades_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `helpdesk_queries`
--

DROP TABLE IF EXISTS `helpdesk_queries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helpdesk_queries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan_interest` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Enterprise',
  `message` text COLLATE utf8mb4_unicode_ci,
  `status` enum('new','in_progress','resolved','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `status` (`status`),
  KEY `is_read` (`is_read`),
  KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `holiday_calendars`
--

DROP TABLE IF EXISTS `holiday_calendars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `holiday_calendars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_default` tinyint(1) DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Draft',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `applicable_location_id` bigint unsigned DEFAULT NULL,
  `calendar_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calendar_year` int DEFAULT NULL,
  `region_id` bigint unsigned DEFAULT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `holiday_calendars_uuid_unique` (`uuid`),
  UNIQUE KEY `holiday_calendars_organization_id_year_name_unique` (`organization_id`,`year`,`name`),
  KEY `holiday_calendars_created_by_foreign` (`created_by`),
  KEY `holiday_calendars_updated_by_foreign` (`updated_by`),
  KEY `holiday_calendars_organization_id_index` (`organization_id`),
  KEY `holiday_calendars_year_index` (`year`),
  KEY `holiday_calendars_is_default_index` (`is_default`),
  KEY `holiday_calendars_status_index` (`status`),
  KEY `holiday_calendars_created_at_index` (`created_at`),
  KEY `holiday_calendars_applicable_location_id_index` (`applicable_location_id`),
  CONSTRAINT `holiday_calendars_applicable_location_id_foreign` FOREIGN KEY (`applicable_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `holiday_calendars_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `holiday_calendars_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `holiday_calendars_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `holidays`
--

DROP TABLE IF EXISTS `holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `holidays` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `holiday_calendar_id` bigint unsigned NOT NULL,
  `holiday_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `holiday_date` date NOT NULL,
  `holiday_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'National',
  `is_optional` tinyint(1) DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `calendar_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `holidays_uuid_unique` (`uuid`),
  UNIQUE KEY `holidays_holiday_calendar_id_holiday_date_unique` (`holiday_calendar_id`,`holiday_date`),
  KEY `holidays_created_by_foreign` (`created_by`),
  KEY `holidays_updated_by_foreign` (`updated_by`),
  KEY `holidays_organization_id_index` (`organization_id`),
  KEY `holidays_holiday_calendar_id_index` (`holiday_calendar_id`),
  KEY `holidays_holiday_date_index` (`holiday_date`),
  KEY `holidays_created_at_index` (`created_at`),
  CONSTRAINT `holidays_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `holidays_holiday_calendar_id_foreign` FOREIGN KEY (`holiday_calendar_id`) REFERENCES `holiday_calendars` (`id`),
  CONSTRAINT `holidays_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `holidays_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `id_card_template_versions`
--

DROP TABLE IF EXISTS `id_card_template_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_card_template_versions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `template_id` int unsigned NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `version_number` int NOT NULL,
  `config_json` json NOT NULL,
  `changelog` text,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_card_template_versions_template_id_index` (`template_id`),
  KEY `id_card_template_versions_organization_id_index` (`organization_id`),
  CONSTRAINT `id_card_template_versions_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `id_card_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `id_card_templates`
--

DROP TABLE IF EXISTS `id_card_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_card_templates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'Default ID Card Template',
  `description` text,
  `is_default` tinyint(1) DEFAULT '0',
  `status` enum('draft','published') DEFAULT 'published',
  `version` int DEFAULT '1',
  `applies_to` json DEFAULT NULL,
  `config_json` json NOT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `updated_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_card_templates_organization_id_index` (`organization_id`),
  KEY `id_card_templates_is_default_index` (`is_default`),
  KEY `id_card_templates_status_index` (`status`),
  KEY `id_card_templates_deleted_at_index` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interview_feedback`
--

DROP TABLE IF EXISTS `interview_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_feedback` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `interview_id` int unsigned NOT NULL,
  `interviewer_id` int unsigned NOT NULL,
  `overall_rating` int NOT NULL,
  `technical_rating` int DEFAULT NULL,
  `communication_rating` int DEFAULT NULL,
  `cultural_fit_rating` int DEFAULT NULL,
  `feedback_text` text COLLATE utf8mb4_unicode_ci,
  `would_recommend` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `interview_feedback_uuid_unique` (`uuid`),
  KEY `interview_feedback_interview_id_foreign` (`interview_id`),
  KEY `interview_feedback_organization_id_index` (`organization_id`),
  CONSTRAINT `interview_feedback_interview_id_foreign` FOREIGN KEY (`interview_id`) REFERENCES `interviews` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interview_panel`
--

DROP TABLE IF EXISTS `interview_panel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_panel` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `interview_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `interview_panel_organization_id_foreign` (`organization_id`),
  CONSTRAINT `interview_panel_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interview_schedules`
--

DROP TABLE IF EXISTS `interview_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `applicant_id` bigint unsigned NOT NULL,
  `job_opening_id` bigint unsigned NOT NULL,
  `interview_type` enum('phone_screen','technical','hr','manager','final') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `round_number` int DEFAULT '1',
  `interviewer_id` bigint unsigned DEFAULT NULL,
  `interview_date` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `feedback` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rating` decimal(3,2) DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `job_opening_id` (`job_opening_id`),
  KEY `organization_id` (`organization_id`),
  KEY `applicant_id` (`applicant_id`),
  KEY `status` (`status`),
  KEY `interview_date` (`interview_date`),
  CONSTRAINT `interview_schedules_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_schedules_ibfk_2` FOREIGN KEY (`applicant_id`) REFERENCES `job_applicants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_schedules_ibfk_3` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interviews`
--

DROP TABLE IF EXISTS `interviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `application_id` int unsigned NOT NULL,
  `interview_type` enum('phone','video','in_person') COLLATE utf8mb4_unicode_ci NOT NULL,
  `interview_round` int NOT NULL,
  `scheduled_date` timestamp NOT NULL,
  `interview_duration_minutes` int DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled','rescheduled') COLLATE utf8mb4_unicode_ci NOT NULL,
  `decision` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decision_notes` text COLLATE utf8mb4_unicode_ci,
  `decision_at` timestamp NULL DEFAULT NULL,
  `meeting_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recording_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feedback_submitted` tinyint(1) NOT NULL DEFAULT '0',
  `interviewer_ids` json DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `interviews_uuid_unique` (`uuid`),
  KEY `interviews_application_id_foreign` (`application_id`),
  KEY `interviews_organization_id_index` (`organization_id`),
  CONSTRAINT `interviews_application_id_foreign` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_ai_settings`
--

DROP TABLE IF EXISTS `job_ai_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_ai_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_id` int unsigned NOT NULL,
  `ai_screening_enabled` tinyint(1) DEFAULT '1',
  `ats_enabled` tinyint(1) DEFAULT '1',
  `ats_threshold` int DEFAULT '85',
  `jd_match_enabled` tinyint(1) DEFAULT '1',
  `jd_match_threshold` int DEFAULT '80',
  `shortlisting_mode` enum('ATS_ONLY','JD_MATCH_ONLY','ATS_AND_JD','WEIGHTED_SCORE','AI_RECOMMENDED') DEFAULT 'ATS_AND_JD',
  `ats_weight` int DEFAULT '40',
  `jd_match_weight` int DEFAULT '60',
  `auto_shortlist_enabled` tinyint(1) DEFAULT '0',
  `suggestion_limit` int DEFAULT '50',
  `mandatory_skills` json DEFAULT NULL,
  `min_experience` decimal(4,1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_ai_settings_uuid_unique` (`uuid`),
  UNIQUE KEY `job_ai_settings_job_id_unique` (`job_id`),
  KEY `job_ai_settings_organization_id_index` (`organization_id`),
  KEY `job_ai_settings_job_id_index` (`job_id`),
  CONSTRAINT `job_ai_settings_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_applicants`
--

DROP TABLE IF EXISTS `job_applicants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_applicants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_opening_id` bigint unsigned NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resume_url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_letter` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `current_company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_designation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_salary` decimal(15,2) DEFAULT NULL,
  `expected_salary` decimal(15,2) DEFAULT NULL,
  `years_of_experience` int DEFAULT NULL,
  `qualification` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('applied','screened','shortlisted','interview','offer','rejected','hired','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'applied',
  `rating` decimal(3,2) DEFAULT NULL,
  `source` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `organization_id` (`organization_id`),
  KEY `job_opening_id` (`job_opening_id`),
  KEY `status` (`status`),
  KEY `email` (`email`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `job_applicants_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_applicants_ibfk_2` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_locations`
--

DROP TABLE IF EXISTS `job_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_locations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_id` int unsigned NOT NULL,
  `location_id` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_locations_uuid_unique` (`uuid`),
  KEY `job_locations_job_id_foreign` (`job_id`),
  KEY `job_locations_organization_id_index` (`organization_id`),
  CONSTRAINT `job_locations_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_openings`
--

DROP TABLE IF EXISTS `job_openings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_openings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `responsibilities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `position_count` int DEFAULT '1',
  `filled_count` int DEFAULT '0',
  `salary_min` decimal(15,2) DEFAULT NULL,
  `salary_max` decimal(15,2) DEFAULT NULL,
  `job_type` enum('full_time','part_time','contract','intern') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'full_time',
  `status` enum('draft','published','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `unique_job` (`organization_id`,`job_code`),
  KEY `organization_id` (`organization_id`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `job_openings_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_requisition_approvals`
--

DROP TABLE IF EXISTS `job_requisition_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_requisition_approvals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `requisition_id` int unsigned NOT NULL,
  `approver_level` int NOT NULL,
  `approver_user_id` int unsigned NOT NULL,
  `approval_status` enum('approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL,
  `approval_date` date NOT NULL,
  `approval_comments` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_requisition_approvals_uuid_unique` (`uuid`),
  KEY `job_requisition_approvals_requisition_id_foreign` (`requisition_id`),
  KEY `job_requisition_approvals_organization_id_index` (`organization_id`),
  CONSTRAINT `job_requisition_approvals_requisition_id_foreign` FOREIGN KEY (`requisition_id`) REFERENCES `job_requisitions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_requisitions`
--

DROP TABLE IF EXISTS `job_requisitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_requisitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `requisition_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int unsigned DEFAULT NULL,
  `headcount_count` int NOT NULL,
  `requisition_type` enum('new_position','replacement_hiring') COLLATE utf8mb4_unicode_ci NOT NULL,
  `budget_allocated` decimal(15,2) DEFAULT NULL,
  `hiring_justification` text COLLATE utf8mb4_unicode_ci,
  `priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflow_instance_id` int unsigned DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected','active','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `approvers_chain` json DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_requisitions_organization_id_requisition_code_unique` (`organization_id`,`requisition_code`),
  UNIQUE KEY `job_requisitions_uuid_unique` (`uuid`),
  KEY `job_requisitions_organization_id_index` (`organization_id`),
  KEY `job_requisitions_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_skills`
--

DROP TABLE IF EXISTS `job_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_skills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_id` int unsigned NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proficiency_level` enum('beginner','intermediate','expert') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_skills_uuid_unique` (`uuid`),
  KEY `job_skills_job_id_foreign` (`job_id`),
  KEY `job_skills_organization_id_index` (`organization_id`),
  CONSTRAINT `job_skills_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_templates`
--

DROP TABLE IF EXISTS `job_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_templates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_templates_uuid_unique` (`uuid`),
  KEY `job_templates_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `job_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int unsigned DEFAULT NULL,
  `designation_id` int unsigned DEFAULT NULL,
  `location_id` int unsigned DEFAULT NULL,
  `job_type` enum('full_time','part_time','contract','internship') COLLATE utf8mb4_unicode_ci NOT NULL,
  `experience_level` enum('entry','mid','senior','lead') COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_experience_years` int unsigned DEFAULT NULL,
  `max_experience_years` int unsigned DEFAULT NULL,
  `min_salary` decimal(15,2) DEFAULT NULL,
  `max_salary` decimal(15,2) DEFAULT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `employment_type` enum('onsite','remote','hybrid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_of_positions` int unsigned NOT NULL,
  `job_template_id` int unsigned DEFAULT NULL,
  `status` enum('draft','published','closed','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `mrf_request_id` bigint unsigned DEFAULT NULL,
  `is_internal` tinyint(1) DEFAULT '0',
  `is_published_external` tinyint(1) DEFAULT '1',
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jobs_organization_id_job_code_unique` (`organization_id`,`job_code`),
  UNIQUE KEY `jobs_uuid_unique` (`uuid`),
  KEY `jobs_organization_id_index` (`organization_id`),
  KEY `jobs_status_index` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knex_migrations`
--

DROP TABLE IF EXISTS `knex_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knex_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=342 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knex_migrations_lock`
--

DROP TABLE IF EXISTS `knex_migrations_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knex_migrations_lock` (
  `index` int unsigned NOT NULL AUTO_INCREMENT,
  `is_locked` int DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`index`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knex_migrations_server`
--

DROP TABLE IF EXISTS `knex_migrations_server`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knex_migrations_server` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knex_migrations_server_lock`
--

DROP TABLE IF EXISTS `knex_migrations_server_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knex_migrations_server_lock` (
  `index` int unsigned NOT NULL AUTO_INCREMENT,
  `is_locked` int DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kpi_templates`
--

DROP TABLE IF EXISTS `kpi_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `role_based` tinyint(1) DEFAULT '0',
  `department_based` tinyint(1) DEFAULT '0',
  `measurement_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_value` decimal(10,2) NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kpi_templates_uuid_unique` (`uuid`),
  KEY `kpi_templates_created_by_foreign` (`created_by`),
  KEY `kpi_templates_updated_by_foreign` (`updated_by`),
  KEY `kpi_templates_organization_id_index` (`organization_id`),
  KEY `kpi_templates_measurement_type_index` (`measurement_type`),
  CONSTRAINT `kpi_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `kpi_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `kpi_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kra_forms`
--

DROP TABLE IF EXISTS `kra_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kra_forms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `is_active` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kra_forms_uuid_unique` (`uuid`),
  KEY `kra_forms_organization_id_index` (`organization_id`),
  KEY `kra_forms_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  KEY `kra_forms_organization_id_is_active_index` (`organization_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `late_auto_deduction_logs`
--

DROP TABLE IF EXISTS `late_auto_deduction_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `late_auto_deduction_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `month` varchar(255) NOT NULL,
  `evaluated` int DEFAULT '0',
  `deducted_leaves` decimal(5,2) DEFAULT '0.00',
  `status` varchar(255) DEFAULT 'Success',
  `execution_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `late_deduction_policies`
--

DROP TABLE IF EXISTS `late_deduction_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `late_deduction_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `policy_type` varchar(255) DEFAULT 'Late Coming',
  `first_deduction_on` int DEFAULT '3',
  `buffer_allowed` int DEFAULT '15',
  `no_buffer_allowed` int DEFAULT '0',
  `deduct_type` varchar(255) DEFAULT 'Leave',
  `deduction_unit` decimal(5,2) DEFAULT '1.00',
  `after_deduction_amount` decimal(5,2) DEFAULT '0.50',
  `after_deduction_every` int DEFAULT '1',
  `deduction_sequence` text,
  `locations` text,
  `departments` text,
  `grades` text,
  `shifts` text,
  `employee_statuses` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `late_updations`
--

DROP TABLE IF EXISTS `late_updations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `late_updations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `late_coming_after` varchar(255) DEFAULT '09:30',
  `update_for` varchar(255) DEFAULT 'Half Day',
  `auto_apply_leave` tinyint(1) DEFAULT '0',
  `locations` text,
  `departments` text,
  `grades` text,
  `shifts` text,
  `employee_statuses` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_accruals`
--

DROP TABLE IF EXISTS `leave_accruals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_accruals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `accrual_date` date NOT NULL,
  `accrual_type` enum('monthly','quarterly','yearly') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `accrued_days` decimal(6,2) NOT NULL,
  `policy_id` bigint unsigned NOT NULL,
  `processed` tinyint(1) DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_accruals_uuid_unique` (`uuid`),
  KEY `leave_accruals_policy_id_foreign` (`policy_id`),
  KEY `leave_accruals_created_by_foreign` (`created_by`),
  KEY `leave_accruals_updated_by_foreign` (`updated_by`),
  KEY `leave_accruals_organization_id_index` (`organization_id`),
  KEY `leave_accruals_employee_id_index` (`employee_id`),
  KEY `leave_accruals_leave_type_id_index` (`leave_type_id`),
  KEY `leave_accruals_accrual_date_index` (`accrual_date`),
  KEY `leave_accruals_processed_index` (`processed`),
  CONSTRAINT `leave_accruals_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_accruals_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_accruals_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_accruals_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_accruals_policy_id_foreign` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies` (`id`),
  CONSTRAINT `leave_accruals_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_application_days`
--

DROP TABLE IF EXISTS `leave_application_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_application_days` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `application_id` bigint unsigned NOT NULL,
  `leave_date` date NOT NULL,
  `day_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_holiday` tinyint(1) DEFAULT '0',
  `is_weekend` tinyint(1) DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_application_days_uuid_unique` (`uuid`),
  UNIQUE KEY `leave_application_days_application_id_leave_date_unique` (`application_id`,`leave_date`),
  KEY `leave_application_days_organization_id_index` (`organization_id`),
  KEY `leave_application_days_application_id_index` (`application_id`),
  KEY `leave_application_days_leave_date_index` (`leave_date`),
  KEY `leave_application_days_status_index` (`status`),
  CONSTRAINT `leave_application_days_application_id_foreign` FOREIGN KEY (`application_id`) REFERENCES `leave_applications` (`id`),
  CONSTRAINT `leave_application_days_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_applications`
--

DROP TABLE IF EXISTS `leave_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `application_start_date` date NOT NULL,
  `application_end_date` date NOT NULL,
  `total_days` decimal(6,2) NOT NULL,
  `is_half_day` tinyint(1) DEFAULT '0',
  `reason_description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `approval_notes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_emergency` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `half_day_period` enum('first_half','second_half') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_hourly` tinyint(1) DEFAULT '0',
  `hourly_duration` decimal(4,2) DEFAULT NULL,
  `supporting_document_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `submitted_by_user_id` bigint unsigned DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_by` bigint unsigned DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `withdrawn_at` timestamp NULL DEFAULT NULL,
  `withdrawn_by` bigint unsigned DEFAULT NULL,
  `withdrawn_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_sandwich_day` tinyint(1) DEFAULT '0',
  `delegated_to_user_id` bigint unsigned DEFAULT NULL,
  `admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `lop_days` decimal(5,2) DEFAULT '0.00',
  `pool_leave_type_id` bigint unsigned DEFAULT NULL,
  `l1_approved_by` bigint unsigned DEFAULT NULL,
  `l1_approval_date` timestamp NULL DEFAULT NULL,
  `l2_approved_by` bigint unsigned DEFAULT NULL,
  `l2_approval_date` timestamp NULL DEFAULT NULL,
  `is_backdated` tinyint(1) DEFAULT '0',
  `requires_payroll_arrears` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `leave_type_id` (`leave_type_id`),
  KEY `organization_id` (`organization_id`),
  KEY `employee_id` (`employee_id`),
  KEY `status` (`status`),
  KEY `from_date` (`application_start_date`),
  KEY `created_at` (`created_at`),
  KEY `leave_applications_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `leave_applications_submitted_by_user_id_foreign` (`submitted_by_user_id`),
  KEY `leave_applications_approved_by_foreign` (`approved_by`),
  KEY `leave_applications_cancelled_by_foreign` (`cancelled_by`),
  KEY `leave_applications_withdrawn_by_foreign` (`withdrawn_by`),
  KEY `leave_applications_delegated_to_user_id_foreign` (`delegated_to_user_id`),
  KEY `leave_applications_pool_leave_type_id_foreign` (`pool_leave_type_id`),
  KEY `leave_applications_l1_approved_by_foreign` (`l1_approved_by`),
  KEY `leave_applications_l2_approved_by_foreign` (`l2_approved_by`),
  CONSTRAINT `leave_applications_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_cancelled_by_foreign` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_delegated_to_user_id_foreign` FOREIGN KEY (`delegated_to_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_applications_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_applications_ibfk_3` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_applications_l1_approved_by_foreign` FOREIGN KEY (`l1_approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_l2_approved_by_foreign` FOREIGN KEY (`l2_approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_pool_leave_type_id_foreign` FOREIGN KEY (`pool_leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_applications_submitted_by_user_id_foreign` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_withdrawn_by_foreign` FOREIGN KEY (`withdrawn_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_applications_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_approvals`
--

DROP TABLE IF EXISTS `leave_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_approvals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `leave_application_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned NOT NULL,
  `approval_level` int DEFAULT '1',
  `status` enum('pending','approved','rejected','delegated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approval_date` timestamp NULL DEFAULT NULL,
  `rejection_reason` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `comments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `approver_id` (`approver_id`),
  KEY `organization_id` (`organization_id`),
  KEY `leave_application_id` (`leave_application_id`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `leave_approvals_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_approvals_ibfk_2` FOREIGN KEY (`leave_application_id`) REFERENCES `leave_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_approvals_ibfk_3` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_audit_logs`
--

DROP TABLE IF EXISTS `leave_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `action` enum('applied','approved','rejected','cancelled','withdrawn','encashed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` enum('application','approval','cancellation','encashment','comp_off') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `actor_id` bigint unsigned NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_audit_logs_uuid_unique` (`uuid`),
  KEY `leave_audit_logs_actor_id_foreign` (`actor_id`),
  KEY `leave_audit_logs_organization_id_index` (`organization_id`),
  KEY `leave_audit_logs_employee_id_index` (`employee_id`),
  KEY `leave_audit_logs_action_index` (`action`),
  KEY `leave_audit_logs_entity_type_index` (`entity_type`),
  KEY `leave_audit_logs_timestamp_index` (`timestamp`),
  CONSTRAINT `leave_audit_logs_actor_id_foreign` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_audit_logs_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_audit_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_balances`
--

DROP TABLE IF EXISTS `leave_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `financial_year_start` date NOT NULL,
  `opening_balance` decimal(5,2) DEFAULT '0.00',
  `consumed_balance` decimal(5,2) DEFAULT '0.00',
  `pending_approval_balance` decimal(5,2) DEFAULT '0.00',
  `available_balance` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `financial_year_end` date DEFAULT NULL,
  `credited_balance` decimal(6,2) DEFAULT '0.00',
  `carry_forward_balance` decimal(6,2) DEFAULT '0.00',
  `encashed_balance` decimal(6,2) DEFAULT '0.00',
  `expired_balance` decimal(6,2) DEFAULT '0.00',
  `last_updated_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `carried_forward_negative_days` decimal(5,2) DEFAULT '0.00',
  `hours_worked_accumulator` decimal(8,2) DEFAULT '0.00',
  `last_reconciled_attendance_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `leave_bal_emp_type_year_unique` (`employee_id`,`leave_type_id`,`financial_year_start`),
  KEY `leave_balances_created_by_foreign` (`created_by`),
  KEY `leave_balances_updated_by_foreign` (`updated_by`),
  CONSTRAINT `leave_balances_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_balances_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_blackout_periods`
--

DROP TABLE IF EXISTS `leave_blackout_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_blackout_periods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicable_location_id` bigint unsigned DEFAULT NULL,
  `applicable_department_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_blackout_periods_uuid_unique` (`uuid`),
  KEY `leave_blackout_periods_applicable_department_id_foreign` (`applicable_department_id`),
  KEY `leave_blackout_periods_organization_id_index` (`organization_id`),
  KEY `leave_blackout_periods_start_date_end_date_index` (`start_date`,`end_date`),
  KEY `leave_blackout_periods_applicable_location_id_foreign` (`applicable_location_id`),
  CONSTRAINT `leave_blackout_periods_applicable_department_id_foreign` FOREIGN KEY (`applicable_department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `leave_blackout_periods_applicable_location_id_foreign` FOREIGN KEY (`applicable_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `leave_blackout_periods_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_cancellations`
--

DROP TABLE IF EXISTS `leave_cancellations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_cancellations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `leave_application_id` bigint unsigned NOT NULL,
  `cancelled_by` bigint unsigned NOT NULL,
  `cancellation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reason` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `cancelled_by` (`cancelled_by`),
  KEY `organization_id` (`organization_id`),
  KEY `leave_application_id` (`leave_application_id`),
  KEY `cancellation_date` (`cancellation_date`),
  CONSTRAINT `leave_cancellations_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_cancellations_ibfk_2` FOREIGN KEY (`leave_application_id`) REFERENCES `leave_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_cancellations_ibfk_3` FOREIGN KEY (`cancelled_by`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_carry_forward`
--

DROP TABLE IF EXISTS `leave_carry_forward`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_carry_forward` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `from_financial_year_end` date NOT NULL,
  `to_financial_year_start` date NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `carried_forward_days` decimal(6,2) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_carry_forward_uuid_unique` (`uuid`),
  KEY `leave_carry_forward_created_by_foreign` (`created_by`),
  KEY `leave_carry_forward_updated_by_foreign` (`updated_by`),
  KEY `leave_carry_forward_organization_id_index` (`organization_id`),
  KEY `leave_carry_forward_employee_id_index` (`employee_id`),
  KEY `leave_carry_forward_leave_type_id_index` (`leave_type_id`),
  KEY `leave_carry_forward_from_financial_year_end_index` (`from_financial_year_end`),
  CONSTRAINT `leave_carry_forward_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_carry_forward_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_carry_forward_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_carry_forward_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_carry_forward_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_delegations`
--

DROP TABLE IF EXISTS `leave_delegations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_delegations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `delegated_by_user_id` bigint unsigned NOT NULL,
  `delegated_to_user_id` bigint unsigned NOT NULL,
  `delegation_start_date` date NOT NULL,
  `delegation_end_date` date NOT NULL,
  `delegated_for_leave_types` json DEFAULT NULL,
  `status` enum('active','expired','revoked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_delegations_uuid_unique` (`uuid`),
  KEY `leave_delegations_created_by_foreign` (`created_by`),
  KEY `leave_delegations_updated_by_foreign` (`updated_by`),
  KEY `leave_delegations_organization_id_index` (`organization_id`),
  KEY `leave_delegations_delegated_by_user_id_index` (`delegated_by_user_id`),
  KEY `leave_delegations_delegated_to_user_id_index` (`delegated_to_user_id`),
  KEY `leave_delegations_status_index` (`status`),
  KEY `leave_delegations_delegation_start_date_index` (`delegation_start_date`),
  CONSTRAINT `leave_delegations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_delegations_delegated_by_user_id_foreign` FOREIGN KEY (`delegated_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_delegations_delegated_to_user_id_foreign` FOREIGN KEY (`delegated_to_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_delegations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_delegations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_encashment_settings`
--

DROP TABLE IF EXISTS `leave_encashment_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_encashment_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `formula` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `limit` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `employment` json DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `days_basis` int DEFAULT '30',
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_encashment_settings_uuid_unique` (`uuid`),
  KEY `leave_encashment_settings_created_by_foreign` (`created_by`),
  KEY `leave_encashment_settings_updated_by_foreign` (`updated_by`),
  KEY `leave_encashment_settings_organization_id_index` (`organization_id`),
  KEY `leave_encashment_settings_is_active_index` (`is_active`),
  CONSTRAINT `leave_encashment_settings_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_encashment_settings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_encashment_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_encashments`
--

DROP TABLE IF EXISTS `leave_encashments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_encashments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `financial_year_start` date NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `encashment_days` decimal(6,2) NOT NULL,
  `daily_rate` decimal(10,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `encashment_date` date NOT NULL,
  `processed` tinyint(1) DEFAULT '0',
  `payroll_batch_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leave_encashment_setting_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_encashments_uuid_unique` (`uuid`),
  KEY `leave_encashments_created_by_foreign` (`created_by`),
  KEY `leave_encashments_updated_by_foreign` (`updated_by`),
  KEY `leave_encashments_organization_id_index` (`organization_id`),
  KEY `leave_encashments_employee_id_index` (`employee_id`),
  KEY `leave_encashments_leave_type_id_index` (`leave_type_id`),
  KEY `leave_encashments_encashment_date_index` (`encashment_date`),
  KEY `leave_encashments_processed_index` (`processed`),
  KEY `leave_encashments_leave_encashment_setting_id_foreign` (`leave_encashment_setting_id`),
  CONSTRAINT `leave_encashments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_encashments_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_encashments_leave_encashment_setting_id_foreign` FOREIGN KEY (`leave_encashment_setting_id`) REFERENCES `leave_encashment_settings` (`id`),
  CONSTRAINT `leave_encashments_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_encashments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_encashments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_ledger_entries`
--

DROP TABLE IF EXISTS `leave_ledger_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_ledger_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `transaction_type` enum('ACCRUAL','USAGE','RESERVATION','RESERVATION_RELEASE','CARRY_FORWARD','ENCASHMENT','LAPSE','MANUAL_ADJUSTMENT','COMP_OFF_CREDIT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(6,2) NOT NULL,
  `reference_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `effective_date` date NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_ledger_entries_uuid_unique` (`uuid`),
  KEY `leave_ledger_entries_created_by_foreign` (`created_by`),
  KEY `leave_ledger_entries_organization_id_index` (`organization_id`),
  KEY `leave_ledger_entries_employee_id_index` (`employee_id`),
  KEY `leave_ledger_entries_leave_type_id_index` (`leave_type_id`),
  KEY `leave_ledger_entries_effective_date_index` (`effective_date`),
  KEY `leave_ledger_entries_transaction_type_index` (`transaction_type`),
  CONSTRAINT `leave_ledger_entries_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_ledger_entries_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_ledger_entries_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_ledger_entries_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_lop_records`
--

DROP TABLE IF EXISTS `leave_lop_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_lop_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_application_id` bigint unsigned NOT NULL,
  `lop_days` decimal(5,2) NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_payroll',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_lop_records_uuid_unique` (`uuid`),
  KEY `leave_lop_records_organization_id_foreign` (`organization_id`),
  KEY `leave_lop_records_employee_id_foreign` (`employee_id`),
  KEY `leave_lop_records_leave_application_id_foreign` (`leave_application_id`),
  CONSTRAINT `leave_lop_records_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_lop_records_leave_application_id_foreign` FOREIGN KEY (`leave_application_id`) REFERENCES `leave_applications` (`id`),
  CONSTRAINT `leave_lop_records_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_policies`
--

DROP TABLE IF EXISTS `leave_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `earned_leave_entitlement_percent` decimal(5,2) DEFAULT NULL,
  `entitlement_includes_public_holidays` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_policies_uuid_unique` (`uuid`),
  UNIQUE KEY `leave_policies_organization_id_code_unique` (`organization_id`,`code`),
  KEY `leave_policies_created_by_foreign` (`created_by`),
  KEY `leave_policies_updated_by_foreign` (`updated_by`),
  KEY `leave_policies_organization_id_index` (`organization_id`),
  KEY `leave_policies_is_default_index` (`is_default`),
  KEY `leave_policies_status_index` (`status`),
  KEY `leave_policies_created_at_index` (`created_at`),
  CONSTRAINT `leave_policies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_policies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_policies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_policy_assignments`
--

DROP TABLE IF EXISTS `leave_policy_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_policy_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_policy_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `annual_quota` int NOT NULL,
  `monthly_accrual` decimal(5,2) DEFAULT NULL,
  `quarterly_accrual` decimal(5,2) DEFAULT NULL,
  `yearly_accrual` int DEFAULT NULL,
  `carry_forward_enabled` tinyint(1) DEFAULT '1',
  `carry_forward_limit` int DEFAULT NULL,
  `encashment_enabled` tinyint(1) DEFAULT '0',
  `encashment_limit` int DEFAULT NULL,
  `maximum_balance` int DEFAULT NULL,
  `can_take_negative` tinyint(1) DEFAULT '0',
  `sandwich_policy_enabled` tinyint(1) DEFAULT '1',
  `probation_excluded` tinyint(1) DEFAULT '0',
  `assignment_start_date` date NOT NULL,
  `assignment_end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `max_backdated_days` int DEFAULT NULL,
  `max_future_days` int DEFAULT NULL,
  `max_consecutive_days` int DEFAULT NULL,
  `notice_period_excluded` tinyint(1) DEFAULT '0',
  `prefix_suffix_rule_enabled` tinyint(1) DEFAULT '0',
  `floating_holiday_quota` int DEFAULT '0',
  `max_team_members_on_leave_simultaneously` int DEFAULT NULL,
  `concurrent_leave_cap_mode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'hard_block',
  `auto_escalation_days` int DEFAULT NULL,
  `accrual_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'monthly',
  `accrual_rate` decimal(6,2) DEFAULT '0.00',
  `comp_off_validity_days` int DEFAULT '60',
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_policy_assignments_uuid_unique` (`uuid`),
  UNIQUE KEY `leave_policy_assignments_employee_id_leave_type_id_unique` (`employee_id`,`leave_type_id`),
  KEY `leave_policy_assignments_created_by_foreign` (`created_by`),
  KEY `leave_policy_assignments_updated_by_foreign` (`updated_by`),
  KEY `leave_policy_assignments_organization_id_index` (`organization_id`),
  KEY `leave_policy_assignments_employee_id_index` (`employee_id`),
  KEY `leave_policy_assignments_leave_policy_id_index` (`leave_policy_id`),
  KEY `leave_policy_assignments_leave_type_id_index` (`leave_type_id`),
  KEY `leave_policy_assignments_is_active_index` (`is_active`),
  CONSTRAINT `leave_policy_assignments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_policy_assignments_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_policy_assignments_leave_policy_id_foreign` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies` (`id`),
  CONSTRAINT `leave_policy_assignments_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_policy_assignments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_policy_assignments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_policy_mappings`
--

DROP TABLE IF EXISTS `leave_policy_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_policy_mappings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `leave_policy_id` bigint unsigned NOT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `designation_id` bigint unsigned DEFAULT NULL,
  `gender` varchar(20) DEFAULT 'all',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `priority` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_report_schedules`
--

DROP TABLE IF EXISTS `leave_report_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_report_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `schedule_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` enum('daily','weekly','monthly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'weekly',
  `entity` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fields` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `filters` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_report_schedules_uuid_unique` (`uuid`),
  KEY `leave_report_schedules_organization_id_index` (`organization_id`),
  KEY `leave_report_schedules_user_id_index` (`user_id`),
  CONSTRAINT `leave_report_schedules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_report_schedules_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_types`
--

DROP TABLE IF EXISTS `leave_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `leave_policy_id` bigint unsigned DEFAULT NULL,
  `leave_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `leave_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `annual_quota` int DEFAULT '0',
  `carry_forward_enabled` tinyint(1) DEFAULT '0',
  `carry_forward_limit` int DEFAULT NULL,
  `encashment_enabled` tinyint(1) DEFAULT '0',
  `encashment_limit` int DEFAULT NULL,
  `sandwich_rule_enabled` tinyint(1) DEFAULT '0',
  `gender_applicable` enum('all','male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `paid_type` enum('paid','unpaid','half_paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'paid',
  `default_allowance_days` decimal(5,2) DEFAULT '12.00',
  `is_encashable` tinyint(1) DEFAULT '0',
  `is_carry_forward` tinyint(1) DEFAULT '0',
  `allow_negative_balance` tinyint(1) DEFAULT '0',
  `negative_balance_action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pool_from_leave_type_id` bigint unsigned DEFAULT NULL,
  `leave_classification` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'uncategorized',
  `allocation_settings` json DEFAULT NULL,
  `application_settings` json DEFAULT NULL,
  `payroll_settings` json DEFAULT NULL,
  `employment_allocation_settings` json DEFAULT NULL,
  `employment_application_settings` json DEFAULT NULL,
  `encashment_settings` json DEFAULT NULL,
  `active_code` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`leave_code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_types_uuid_unique` (`uuid`),
  UNIQUE KEY `leave_types_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `leave_types_created_by_foreign` (`created_by`),
  KEY `leave_types_updated_by_foreign` (`updated_by`),
  KEY `leave_types_organization_id_index` (`organization_id`),
  KEY `leave_types_leave_policy_id_index` (`leave_policy_id`),
  KEY `leave_types_status_index` (`status`),
  KEY `leave_types_created_at_index` (`created_at`),
  KEY `leave_types_pool_from_leave_type_id_foreign` (`pool_from_leave_type_id`),
  CONSTRAINT `leave_types_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `leave_types_leave_policy_id_foreign` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies` (`id`),
  CONSTRAINT `leave_types_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `leave_types_pool_from_leave_type_id_foreign` FOREIGN KEY (`pool_from_leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_types_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leave_year_settings`
--

DROP TABLE IF EXISTS `leave_year_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_year_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` int NOT NULL,
  `company_id` int DEFAULT NULL,
  `start_day` int NOT NULL DEFAULT '1',
  `start_month` varchar(20) NOT NULL DEFAULT 'April',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `locations` json DEFAULT NULL,
  `departments` json DEFAULT NULL,
  `grades` json DEFAULT NULL,
  `companies` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `letter_templates`
--

DROP TABLE IF EXISTS `letter_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `letter_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `template_name` varchar(255) NOT NULL,
  `template_code` varchar(100) NOT NULL,
  `letter_category` enum('hiring','onboarding','employment','exit') NOT NULL,
  `letter_type` enum('interview_call','intent_to_offer','offer_letter','appointment','nda','code_of_conduct','confirmation','increment','promotion','warning','resignation_acceptance','relieving','experience','custom') NOT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `header_html` longtext,
  `footer_html` longtext,
  `logo_url` longtext,
  `company_name_override` varchar(255) DEFAULT NULL,
  `company_address_override` text,
  `signatory_name` varchar(255) DEFAULT NULL,
  `signatory_designation` varchar(255) DEFAULT NULL,
  `body_content` longtext NOT NULL,
  `terms_and_conditions` longtext,
  `custom_clause` longtext,
  `merge_codes_used` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `bgv_mandatory` tinyint(1) DEFAULT '0',
  `nda_mandatory` tinyint(1) DEFAULT '0',
  `non_compete` tinyint(1) DEFAULT '0',
  `relieving_letter_required` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `letter_templates_organization_id_index` (`organization_id`),
  KEY `letter_templates_company_id_index` (`company_id`),
  KEY `letter_templates_letter_type_index` (`letter_type`),
  KEY `letter_templates_letter_category_index` (`letter_category`),
  KEY `letter_templates_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_assessment_attempts`
--

DROP TABLE IF EXISTS `lms_assessment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_assessment_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `assessment_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `enrollment_id` bigint unsigned DEFAULT NULL,
  `answers` json NOT NULL,
  `score` decimal(5,2) DEFAULT '0.00',
  `passed` tinyint(1) DEFAULT '0',
  `attempt_number` int DEFAULT '1',
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lms_assessment_attempts_organization_id_index` (`organization_id`),
  KEY `lms_assessment_attempts_assessment_id_index` (`assessment_id`),
  KEY `lms_assessment_attempts_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_assessments`
--

DROP TABLE IF EXISTS `lms_assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_assessments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `questions` json NOT NULL,
  `pass_percentage` decimal(5,2) DEFAULT '60.00',
  `attempt_limit` int DEFAULT '3',
  `timer_seconds` int DEFAULT '1800',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lms_assessments_organization_id_index` (`organization_id`),
  KEY `lms_assessments_course_id_index` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_batches`
--

DROP TABLE IF EXISTS `lms_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_batches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `course_id` bigint unsigned NOT NULL,
  `trainer_id` bigint unsigned DEFAULT NULL,
  `trainer_name` varchar(150) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `mode` varchar(50) DEFAULT 'online',
  `max_seats` int DEFAULT '50',
  `seats_filled` int DEFAULT '0',
  `meeting_link` text,
  `location` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'upcoming',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `schedule_time` varchar(150) DEFAULT NULL,
  `schedule_days` varchar(150) DEFAULT NULL,
  `today_session_time` varchar(150) DEFAULT NULL,
  `session_notice` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_batches_organization_id_index` (`organization_id`),
  KEY `lms_batches_course_id_index` (`course_id`),
  KEY `lms_batches_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_categories`
--

DROP TABLE IF EXISTS `lms_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `icon` varchar(50) DEFAULT 'Folder',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_categories_organization_id_index` (`organization_id`),
  KEY `lms_categories_company_id_index` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_certificates`
--

DROP TABLE IF EXISTS `lms_certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_certificates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `certificate_number` varchar(100) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `enrollment_id` bigint unsigned DEFAULT NULL,
  `issued_on` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` datetime DEFAULT NULL,
  `certificate_url` text,
  `score` decimal(5,2) DEFAULT NULL,
  `source` varchar(50) DEFAULT 'manual',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lms_certificates_certificate_number_unique` (`certificate_number`),
  KEY `lms_certificates_organization_id_index` (`organization_id`),
  KEY `lms_certificates_employee_id_index` (`employee_id`),
  KEY `lms_certificates_course_id_index` (`course_id`),
  KEY `lms_certificates_certificate_number_index` (`certificate_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_compliance`
--

DROP TABLE IF EXISTS `lms_compliance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_compliance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `designation_id` bigint unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) DEFAULT '1',
  `deadline_days` int DEFAULT '30',
  `reminder_schedule` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lms_compliance_organization_id_index` (`organization_id`),
  KEY `lms_compliance_course_id_index` (`course_id`),
  KEY `lms_compliance_department_id_index` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_courses`
--

DROP TABLE IF EXISTS `lms_courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_courses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` varchar(50) DEFAULT 'self_paced',
  `duration_hours` decimal(5,2) DEFAULT '0.00',
  `skill_tags` json DEFAULT NULL,
  `thumbnail_url` text,
  `is_mandatory` tinyint(1) DEFAULT '0',
  `deadline_days` int DEFAULT '0',
  `pass_percentage` decimal(5,2) DEFAULT '60.00',
  `attempt_limit` int DEFAULT '3',
  `status` varchar(50) DEFAULT 'draft',
  `source` varchar(50) DEFAULT 'manual',
  `external_id` varchar(255) DEFAULT NULL,
  `external_url` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_courses_organization_id_index` (`organization_id`),
  KEY `lms_courses_company_id_index` (`company_id`),
  KEY `lms_courses_category_id_index` (`category_id`),
  KEY `lms_courses_status_index` (`status`),
  KEY `lms_courses_source_index` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_enrollments`
--

DROP TABLE IF EXISTS `lms_enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_enrollments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `batch_id` bigint unsigned DEFAULT NULL,
  `enrolled_by` varchar(50) DEFAULT 'self',
  `enrolled_by_employee_id` bigint unsigned DEFAULT NULL,
  `status` varchar(50) DEFAULT 'enrolled',
  `progress_pct` decimal(5,2) DEFAULT '0.00',
  `completed_modules` json DEFAULT NULL,
  `enrolled_on` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_on` timestamp NULL DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lms_enrollments_organization_id_index` (`organization_id`),
  KEY `lms_enrollments_employee_id_index` (`employee_id`),
  KEY `lms_enrollments_course_id_index` (`course_id`),
  KEY `lms_enrollments_batch_id_index` (`batch_id`),
  KEY `lms_enrollments_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_integration_settings`
--

DROP TABLE IF EXISTS `lms_integration_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_integration_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `platform` varchar(50) NOT NULL,
  `is_enabled` tinyint(1) DEFAULT '0',
  `config_json` text,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lis_org_company_platform_uidx` (`organization_id`,`company_id`,`platform`),
  KEY `lms_integration_settings_organization_id_index` (`organization_id`),
  KEY `lms_integration_settings_company_id_index` (`company_id`),
  KEY `lms_integration_settings_platform_index` (`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lms_modules`
--

DROP TABLE IF EXISTS `lms_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `content_type` varchar(50) DEFAULT 'video',
  `content_url` longtext,
  `body_text` longtext,
  `sequence` int DEFAULT '1',
  `is_locked` tinyint(1) DEFAULT '0',
  `duration_minutes` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_modules_organization_id_index` (`organization_id`),
  KEY `lms_modules_course_id_index` (`course_id`),
  KEY `lms_modules_sequence_index` (`sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loan_repayment_schedules`
--

DROP TABLE IF EXISTS `loan_repayment_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_repayment_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_loan_id` bigint unsigned NOT NULL,
  `installment_number` int NOT NULL,
  `due_date` date NOT NULL,
  `principal_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `interest_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_installment` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `employee_loan_id` (`employee_loan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loan_repayments`
--

DROP TABLE IF EXISTS `loan_repayments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_repayments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `loan_id` bigint unsigned NOT NULL,
  `emi_number` int NOT NULL,
  `emi_amount` decimal(12,2) NOT NULL,
  `interest_amount` decimal(12,2) NOT NULL,
  `principal_amount` decimal(12,2) NOT NULL,
  `due_date` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `status` enum('pending','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_repayments_uuid_unique` (`uuid`),
  KEY `loan_repayments_created_by_foreign` (`created_by`),
  KEY `loan_repayments_updated_by_foreign` (`updated_by`),
  KEY `loan_repayments_organization_id_index` (`organization_id`),
  KEY `loan_repayments_loan_id_index` (`loan_id`),
  KEY `loan_repayments_status_index` (`status`),
  CONSTRAINT `loan_repayments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `loan_repayments_loan_id_foreign` FOREIGN KEY (`loan_id`) REFERENCES `employee_loans` (`id`),
  CONSTRAINT `loan_repayments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `loan_repayments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `office_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zip_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_area` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_currency_format` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_mail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'Yes',
  `active_code` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`code`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `locations_uuid_unique` (`uuid`),
  UNIQUE KEY `locations_org_active_code_uq` (`organization_id`,`active_code`),
  KEY `locations_created_by_foreign` (`created_by`),
  KEY `locations_updated_by_foreign` (`updated_by`),
  KEY `locations_organization_id_index` (`organization_id`),
  KEY `locations_status_index` (`status`),
  KEY `locations_created_at_index` (`created_at`),
  CONSTRAINT `locations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `locations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `locations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_history`
--

DROP TABLE IF EXISTS `login_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `email_attempted` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_method` enum('password','otp_email','otp_sms','sso_google','sso_microsoft','mfa_totp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('success','failed_password','failed_otp','failed_mfa','blocked_ip','account_locked') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `login_history_session_id_foreign` (`session_id`),
  KEY `login_history_user_id_index` (`user_id`),
  KEY `login_history_organization_id_created_at_index` (`organization_id`,`created_at`),
  KEY `login_history_email_attempted_index` (`email_attempted`),
  CONSTRAINT `login_history_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_history_session_id_foreign` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_history_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marketplace_addons`
--

DROP TABLE IF EXISTS `marketplace_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_addons` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pricing_model` enum('fixed','usage-based','hybrid') COLLATE utf8mb4_unicode_ci DEFAULT 'fixed',
  `base_price` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'USD',
  `trial_days` int DEFAULT '14',
  `trial_enabled` tinyint(1) DEFAULT '1',
  `features` longtext COLLATE utf8mb4_unicode_ci,
  `max_users_allowed` int DEFAULT NULL,
  `max_api_calls` int DEFAULT NULL,
  `status` enum('active','beta','deprecated','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `published_at` timestamp NULL DEFAULT NULL,
  `deprecated_at` timestamp NULL DEFAULT NULL,
  `support_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentation_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changelog_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketplace_addons_key_unique` (`key`),
  KEY `marketplace_addons_key_index` (`key`),
  KEY `marketplace_addons_category_index` (`category`),
  KEY `marketplace_addons_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mileage_claims`
--

DROP TABLE IF EXISTS `mileage_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mileage_claims` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `trip_date` date NOT NULL,
  `from_location` varchar(150) NOT NULL,
  `to_location` varchar(150) NOT NULL,
  `vehicle_type` varchar(50) DEFAULT 'car',
  `distance_km` decimal(10,2) DEFAULT '0.00',
  `rate_per_km` decimal(10,2) DEFAULT '0.00',
  `calculated_amount` decimal(15,2) DEFAULT '0.00',
  `purpose` text,
  `claim_id` bigint unsigned DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_by_user_id` bigint unsigned DEFAULT NULL,
  `submitted_by_role` varchar(50) DEFAULT NULL,
  `current_level` int DEFAULT '1',
  `current_approver_role` varchar(255) DEFAULT NULL,
  `workflow_id` bigint unsigned DEFAULT NULL,
  `approval_run_id` bigint unsigned DEFAULT NULL,
  `rejection_reason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mileage_claims_uuid_unique` (`uuid`),
  KEY `mileage_claims_organization_id_index` (`organization_id`),
  KEY `mileage_claims_employee_id_index` (`employee_id`),
  KEY `mileage_claims_status_index` (`status`),
  KEY `mileage_claims_approval_run_id_index` (`approval_run_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `milestones`
--

DROP TABLE IF EXISTS `milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `milestone_type` enum('birthday','work_anniversary','joining_anniversary','promotion_anniversary','service_1yr','service_3yr','service_5yr','service_10yr','service_15yr','service_20yr','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `milestone_date` date NOT NULL,
  `feed_post_id` bigint unsigned DEFAULT NULL,
  `notification_sent_at` datetime DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `milestones_uuid_unique` (`uuid`),
  KEY `milestones_feed_post_id_foreign` (`feed_post_id`),
  KEY `idx_milestones_org_type` (`organization_id`,`milestone_type`),
  KEY `idx_milestones_employee_date` (`employee_id`,`milestone_date`),
  KEY `milestones_milestone_date_index` (`milestone_date`),
  CONSTRAINT `milestones_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `milestones_feed_post_id_foreign` FOREIGN KEY (`feed_post_id`) REFERENCES `feed_posts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `milestones_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mrf_approval_history`
--

DROP TABLE IF EXISTS `mrf_approval_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mrf_approval_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `mrf_request_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned DEFAULT NULL,
  `action` enum('approved','rejected','returned','submitted') COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `acted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mrf_approval_history_uuid_unique` (`uuid`),
  KEY `mrf_approval_history_organization_id_index` (`organization_id`),
  KEY `mrf_approval_history_mrf_request_id_index` (`mrf_request_id`),
  CONSTRAINT `mrf_approval_history_mrf_request_id_foreign` FOREIGN KEY (`mrf_request_id`) REFERENCES `mrf_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mrf_approval_history_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mrf_requests`
--

DROP TABLE IF EXISTS `mrf_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mrf_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `mr_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number_of_positions` int NOT NULL DEFAULT '1',
  `recruitment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Both',
  `company_id` bigint unsigned DEFAULT NULL,
  `company_location_id` bigint unsigned DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `grade_id` bigint unsigned DEFAULT NULL,
  `employment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qualification_required` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `experience_desired` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interviewer_id` bigint unsigned DEFAULT NULL,
  `pay_scale_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pay_scale_for_position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason_for_requirement` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `list_in_job_page` enum('Yes','No') COLLATE utf8mb4_unicode_ci DEFAULT 'Yes',
  `skills` json DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `job_description` longtext COLLATE utf8mb4_unicode_ci,
  `stage` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Pending Approval',
  `status` enum('Open','Closed') COLLATE utf8mb4_unicode_ci DEFAULT 'Open',
  `requested_by` bigint unsigned DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `target_closure_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mrf_requests_uuid_unique` (`uuid`),
  KEY `mrf_requests_organization_id_index` (`organization_id`),
  KEY `mrf_requests_mr_number_index` (`mr_number`),
  KEY `mrf_requests_status_index` (`status`),
  KEY `mrf_requests_stage_index` (`stage`),
  KEY `mrf_requests_department_id_index` (`department_id`),
  CONSTRAINT `mrf_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mrf_table_settings`
--

DROP TABLE IF EXISTS `mrf_table_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mrf_table_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `config_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settings_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mrf_table_settings_uuid_unique` (`uuid`),
  UNIQUE KEY `mrf_table_settings_organization_id_user_id_config_type_unique` (`organization_id`,`user_id`,`config_type`),
  KEY `mrf_table_settings_organization_id_index` (`organization_id`),
  KEY `mrf_table_settings_user_id_index` (`user_id`),
  CONSTRAINT `mrf_table_settings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_batches`
--

DROP TABLE IF EXISTS `notification_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_batches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `batch_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `notification_count` int DEFAULT '0',
  `delivered_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_batches_uuid_unique` (`uuid`),
  UNIQUE KEY `notification_batches_organization_id_batch_code_unique` (`organization_id`,`batch_code`),
  KEY `notification_batches_created_by_foreign` (`created_by`),
  KEY `notification_batches_updated_by_foreign` (`updated_by`),
  KEY `notification_batches_organization_id_index` (`organization_id`),
  KEY `notification_batches_status_index` (`status`),
  CONSTRAINT `notification_batches_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_batches_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_batches_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_events`
--

DROP TABLE IF EXISTS `notification_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `event_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_description` text COLLATE utf8mb4_unicode_ci,
  `default_template_id` bigint unsigned DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `retry_count` int DEFAULT '3',
  `retry_interval_minutes` int DEFAULT '5',
  `max_queue_delay_hours` int DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_events_uuid_unique` (`uuid`),
  UNIQUE KEY `notification_events_organization_id_event_code_unique` (`organization_id`,`event_code`),
  KEY `notification_events_default_template_id_foreign` (`default_template_id`),
  KEY `notification_events_created_by_foreign` (`created_by`),
  KEY `notification_events_updated_by_foreign` (`updated_by`),
  KEY `notification_events_organization_id_index` (`organization_id`),
  KEY `notification_events_is_enabled_index` (`is_enabled`),
  CONSTRAINT `notification_events_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_events_default_template_id_foreign` FOREIGN KEY (`default_template_id`) REFERENCES `notification_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notification_events_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_events_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_logs`
--

DROP TABLE IF EXISTS `notification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `notification_id` bigint unsigned NOT NULL,
  `channel` enum('email','sms','whatsapp','push','inapp','webhook') COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_address` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('sent','delivered','failed','bounced') COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempt_number` int NOT NULL,
  `provider_response_code` int DEFAULT NULL,
  `provider_response_body` text COLLATE utf8mb4_unicode_ci,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time_ms` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_logs_uuid_unique` (`uuid`),
  KEY `notification_logs_organization_id_index` (`organization_id`),
  KEY `notification_logs_notification_id_index` (`notification_id`),
  KEY `notification_logs_channel_index` (`channel`),
  KEY `notification_logs_status_index` (`status`),
  KEY `notification_logs_timestamp_index` (`timestamp`),
  CONSTRAINT `notification_logs_notification_id_foreign` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_merge_codes`
--

DROP TABLE IF EXISTS `notification_merge_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_merge_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `module_name` varchar(100) DEFAULT NULL,
  `sub_module_name` varchar(100) DEFAULT NULL,
  `merge_code` varchar(100) DEFAULT NULL,
  `description` text,
  `is_active` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_merge_codes_uuid_unique` (`uuid`),
  KEY `notification_merge_codes_organization_id_index` (`organization_id`),
  KEY `notification_merge_codes_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  KEY `notification_merge_codes_organization_id_is_active_index` (`organization_id`,`is_active`),
  KEY `notification_merge_codes_module_name_sub_module_name_index` (`module_name`,`sub_module_name`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `email_enabled` tinyint(1) DEFAULT '1',
  `sms_enabled` tinyint(1) DEFAULT '1',
  `whatsapp_enabled` tinyint(1) DEFAULT '1',
  `push_enabled` tinyint(1) DEFAULT '1',
  `inapp_enabled` tinyint(1) DEFAULT '1',
  `webhook_enabled` tinyint(1) DEFAULT '1',
  `quiet_hours_start` time DEFAULT NULL,
  `quiet_hours_end` time DEFAULT NULL,
  `quiet_hours_enabled` tinyint(1) DEFAULT '0',
  `unsubscribe_all` tinyint(1) DEFAULT '0',
  `preferences_json` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_preferences_uuid_unique` (`uuid`),
  UNIQUE KEY `notification_preferences_organization_id_user_id_unique` (`organization_id`,`user_id`),
  KEY `notification_preferences_created_by_foreign` (`created_by`),
  KEY `notification_preferences_updated_by_foreign` (`updated_by`),
  KEY `notification_preferences_organization_id_index` (`organization_id`),
  KEY `notification_preferences_user_id_index` (`user_id`),
  CONSTRAINT `notification_preferences_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_preferences_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_preferences_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_preferences_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_queue`
--

DROP TABLE IF EXISTS `notification_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_queue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `notification_id` bigint unsigned NOT NULL,
  `channel` enum('email','sms','whatsapp','push','inapp','webhook') COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_push_token` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_webhook_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','processing','delivered','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `priority` int DEFAULT '5',
  `attempt_count` int DEFAULT '0',
  `last_attempted_at` timestamp NULL DEFAULT NULL,
  `next_attempt_at` timestamp NULL DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `response_code` int DEFAULT NULL,
  `response_body` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_queue_uuid_unique` (`uuid`),
  KEY `notification_queue_organization_id_index` (`organization_id`),
  KEY `notification_queue_notification_id_index` (`notification_id`),
  KEY `notification_queue_status_priority_index` (`status`,`priority`),
  KEY `notification_queue_next_attempt_at_index` (`next_attempt_at`),
  KEY `notification_queue_channel_index` (`channel`),
  CONSTRAINT `notification_queue_notification_id_foreign` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_queue_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_recipients`
--

DROP TABLE IF EXISTS `notification_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_recipients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `notification_id` bigint unsigned NOT NULL,
  `recipient_id` bigint unsigned NOT NULL,
  `recipient_type` enum('to','cc','bcc') COLLATE utf8mb4_unicode_ci DEFAULT 'to',
  `status` enum('queued','sent','delivered','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'queued',
  `sent_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `clicked_at` timestamp NULL DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_recipients_uuid_unique` (`uuid`),
  UNIQUE KEY `notification_recipients_notification_id_recipient_id_unique` (`notification_id`,`recipient_id`),
  KEY `notification_recipients_created_by_foreign` (`created_by`),
  KEY `notification_recipients_organization_id_index` (`organization_id`),
  KEY `notification_recipients_notification_id_index` (`notification_id`),
  KEY `notification_recipients_recipient_id_index` (`recipient_id`),
  KEY `notification_recipients_status_index` (`status`),
  CONSTRAINT `notification_recipients_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_recipients_notification_id_foreign` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_recipients_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_recipients_recipient_id_foreign` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_template_versions`
--

DROP TABLE IF EXISTS `notification_template_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_template_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `template_id` bigint unsigned NOT NULL,
  `version_number` int NOT NULL,
  `body_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` text COLLATE utf8mb4_unicode_ci,
  `sms_text` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `variables` json DEFAULT NULL,
  `published_by` bigint unsigned DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_template_versions_uuid_unique` (`uuid`),
  UNIQUE KEY `notification_template_versions_template_id_version_number_unique` (`template_id`,`version_number`),
  KEY `notification_template_versions_published_by_foreign` (`published_by`),
  KEY `notification_template_versions_organization_id_index` (`organization_id`),
  KEY `notification_template_versions_template_id_index` (`template_id`),
  CONSTRAINT `notification_template_versions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_template_versions_published_by_foreign` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notification_template_versions_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_notification` text COLLATE utf8mb4_unicode_ci,
  `is_active` enum('Yes','No') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Yes',
  `template_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `channels` json DEFAULT NULL,
  `subject_line` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body_text` text COLLATE utf8mb4_unicode_ci,
  `body_html` text COLLATE utf8mb4_unicode_ci,
  `sms_text` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_template_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `variables` json DEFAULT NULL,
  `version_number` int DEFAULT '1',
  `is_published` tinyint(1) DEFAULT '1',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'published',
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_templates_uuid_unique` (`uuid`),
  UNIQUE KEY `idx_notif_temp_org_name` (`organization_id`,`template_name`),
  KEY `notification_templates_created_by_foreign` (`created_by`),
  KEY `notification_templates_updated_by_foreign` (`updated_by`),
  KEY `notification_templates_organization_id_index` (`organization_id`),
  CONSTRAINT `notification_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notification_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=1019 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `event_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_id` bigint unsigned DEFAULT NULL,
  `recipient_id` bigint unsigned NOT NULL,
  `channels` json DEFAULT NULL,
  `subject_line` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `variables` json DEFAULT NULL,
  `status` enum('queued','sent','delivered','failed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'queued',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `read_by_user_id` bigint unsigned DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `retry_count` int DEFAULT '0',
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `related_entity_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_entity_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `notification_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notifications_uuid_unique` (`uuid`),
  KEY `notifications_template_id_foreign` (`template_id`),
  KEY `notifications_read_by_user_id_foreign` (`read_by_user_id`),
  KEY `notifications_created_by_foreign` (`created_by`),
  KEY `notifications_updated_by_foreign` (`updated_by`),
  KEY `notifications_organization_id_index` (`organization_id`),
  KEY `notifications_recipient_id_index` (`recipient_id`),
  KEY `notifications_status_index` (`status`),
  KEY `notifications_priority_index` (`priority`),
  KEY `notifications_created_at_index` (`created_at`),
  KEY `notifications_recipient_id_status_index` (`recipient_id`,`status`),
  KEY `notifications_organization_id_created_at_index` (`organization_id`,`created_at`),
  CONSTRAINT `notifications_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notifications_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_read_by_user_id_foreign` FOREIGN KEY (`read_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_recipient_id_foreign` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `notifications_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `offer_approvals`
--

DROP TABLE IF EXISTS `offer_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_approvals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `offer_id` int unsigned NOT NULL,
  `approver_user_id` int unsigned NOT NULL,
  `approval_status` enum('approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL,
  `approval_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_comments` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offer_approvals_uuid_unique` (`uuid`),
  KEY `offer_approvals_offer_id_foreign` (`offer_id`),
  KEY `offer_approvals_organization_id_index` (`organization_id`),
  CONSTRAINT `offer_approvals_offer_id_foreign` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `offer_letters`
--

DROP TABLE IF EXISTS `offer_letters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_letters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `applicant_id` bigint unsigned NOT NULL,
  `job_opening_id` bigint unsigned NOT NULL,
  `offer_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `salary_offered` decimal(15,2) DEFAULT NULL,
  `currency` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `joining_date` date DEFAULT NULL,
  `probation_period_days` int DEFAULT '90',
  `designation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` bigint unsigned DEFAULT NULL,
  `offer_letter_url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','sent','accepted','rejected','withdrawn') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `sent_at` timestamp NULL DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `valid_till` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `unique_offer` (`organization_id`,`offer_code`),
  KEY `job_opening_id` (`job_opening_id`),
  KEY `organization_id` (`organization_id`),
  KEY `applicant_id` (`applicant_id`),
  KEY `status` (`status`),
  CONSTRAINT `offer_letters_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_letters_ibfk_2` FOREIGN KEY (`applicant_id`) REFERENCES `job_applicants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_letters_ibfk_3` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `offer_versions`
--

DROP TABLE IF EXISTS `offer_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_versions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `offer_id` int unsigned NOT NULL,
  `version_number` int NOT NULL,
  `ctc` decimal(15,2) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offer_versions_uuid_unique` (`uuid`),
  KEY `offer_versions_offer_id_foreign` (`offer_id`),
  KEY `offer_versions_organization_id_index` (`organization_id`),
  CONSTRAINT `offer_versions_offer_id_foreign` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `offers`
--

DROP TABLE IF EXISTS `offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `application_id` int unsigned NOT NULL,
  `offer_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int unsigned DEFAULT NULL,
  `designation_id` int unsigned DEFAULT NULL,
  `cost_to_company` decimal(15,2) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `offer_start_date` date NOT NULL,
  `offer_expiry_date` date NOT NULL,
  `status` enum('draft','sent','accepted','rejected','expired','withdrawn') COLLATE utf8mb4_unicode_ci NOT NULL,
  `offer_pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `workflow_instance_id` int unsigned DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `meta` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offers_organization_id_offer_code_unique` (`organization_id`,`offer_code`),
  UNIQUE KEY `offers_uuid_unique` (`uuid`),
  KEY `offers_application_id_foreign` (`application_id`),
  KEY `offers_organization_id_index` (`organization_id`),
  CONSTRAINT `offers_application_id_foreign` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `okr_key_results`
--

DROP TABLE IF EXISTS `okr_key_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `okr_key_results` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `okr_id` bigint unsigned NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_value` decimal(10,2) NOT NULL,
  `current_value` decimal(10,2) DEFAULT '0.00',
  `status` enum('draft','active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `weight` decimal(5,2) DEFAULT '1.00',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `okr_key_results_uuid_unique` (`uuid`),
  KEY `okr_key_results_created_by_foreign` (`created_by`),
  KEY `okr_key_results_updated_by_foreign` (`updated_by`),
  KEY `okr_key_results_organization_id_index` (`organization_id`),
  KEY `okr_key_results_okr_id_index` (`okr_id`),
  KEY `okr_key_results_status_index` (`status`),
  CONSTRAINT `okr_key_results_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `okr_key_results_okr_id_foreign` FOREIGN KEY (`okr_id`) REFERENCES `okr_objectives` (`id`),
  CONSTRAINT `okr_key_results_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `okr_key_results_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `okr_objectives`
--

DROP TABLE IF EXISTS `okr_objectives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `okr_objectives` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `aligned_to_goal_id` bigint unsigned DEFAULT NULL,
  `owner_id` bigint unsigned NOT NULL,
  `status` enum('planning','active','completed','abandoned') COLLATE utf8mb4_unicode_ci DEFAULT 'planning',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `okr_objectives_uuid_unique` (`uuid`),
  KEY `okr_objectives_aligned_to_goal_id_foreign` (`aligned_to_goal_id`),
  KEY `okr_objectives_created_by_foreign` (`created_by`),
  KEY `okr_objectives_updated_by_foreign` (`updated_by`),
  KEY `okr_objectives_organization_id_index` (`organization_id`),
  KEY `okr_objectives_owner_id_index` (`owner_id`),
  KEY `okr_objectives_status_index` (`status`),
  CONSTRAINT `okr_objectives_aligned_to_goal_id_foreign` FOREIGN KEY (`aligned_to_goal_id`) REFERENCES `goals` (`id`),
  CONSTRAINT `okr_objectives_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `okr_objectives_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `okr_objectives_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `okr_objectives_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `onboarding`
--

DROP TABLE IF EXISTS `onboarding`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `onboarding` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `status` varchar(50) DEFAULT 'initiated',
  `start_date` date NOT NULL,
  `completion_date` date DEFAULT NULL,
  `training_sessions` json DEFAULT NULL,
  `equipment_assigned` json DEFAULT NULL,
  `system_access_granted` tinyint(1) DEFAULT '0',
  `buddy_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `onboarding_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `onboarding_checklist_items`
--

DROP TABLE IF EXISTS `onboarding_checklist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `onboarding_checklist_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `checklist_id` bigint unsigned NOT NULL,
  `item_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_description` text COLLATE utf8mb4_unicode_ci,
  `sequence_order` int DEFAULT '0',
  `assigned_to_role` json DEFAULT NULL,
  `estimated_days` int DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `onboarding_checklist_items_uuid_unique` (`uuid`),
  KEY `onboarding_checklist_items_created_by_foreign` (`created_by`),
  KEY `onboarding_checklist_items_updated_by_foreign` (`updated_by`),
  KEY `onboarding_checklist_items_organization_id_index` (`organization_id`),
  KEY `onboarding_checklist_items_checklist_id_index` (`checklist_id`),
  CONSTRAINT `onboarding_checklist_items_checklist_id_foreign` FOREIGN KEY (`checklist_id`) REFERENCES `onboarding_checklists` (`id`),
  CONSTRAINT `onboarding_checklist_items_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `onboarding_checklist_items_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `onboarding_checklist_items_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `onboarding_checklists`
--

DROP TABLE IF EXISTS `onboarding_checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `onboarding_checklists` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `checklist_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `applicable_to` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `onboarding_checklists_uuid_unique` (`uuid`),
  KEY `onboarding_checklists_created_by_foreign` (`created_by`),
  KEY `onboarding_checklists_updated_by_foreign` (`updated_by`),
  KEY `onboarding_checklists_organization_id_index` (`organization_id`),
  CONSTRAINT `onboarding_checklists_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `onboarding_checklists_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `onboarding_checklists_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `optional_holiday_selections`
--

DROP TABLE IF EXISTS `optional_holiday_selections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `optional_holiday_selections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `holiday_id` bigint unsigned NOT NULL,
  `year` int NOT NULL,
  `status` varchar(50) DEFAULT 'approved',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_leave_settings`
--

DROP TABLE IF EXISTS `org_leave_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_leave_settings` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `location_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `normal_working_hours_daily` decimal(5,2) DEFAULT '9.00',
  `full_time_hours` decimal(5,2) DEFAULT '8.00',
  `weekly_work_pattern` json DEFAULT NULL,
  `holiday_year_start_month` int DEFAULT '4',
  `max_consecutive_annual_leave_days` decimal(5,2) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `leave_clubbing_rules` json DEFAULT NULL,
  `leave_restriction_rules` json DEFAULT NULL,
  `default_week_day` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disable_leave_application_reminder` tinyint(1) DEFAULT '0',
  `show_popup_on_week_off_or_holiday` tinyint(1) DEFAULT '0',
  `leave_application_date_restriction` tinyint(1) DEFAULT '0',
  `leave_application_start_day` int DEFAULT '1',
  `leave_application_start_month` int DEFAULT NULL,
  `default_leave_month` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_leave_settings_organization_id_location_id_unique` (`organization_id`,`location_id`),
  KEY `org_leave_settings_location_id_foreign` (`location_id`),
  CONSTRAINT `org_leave_settings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organization_addon_subscriptions`
--

DROP TABLE IF EXISTS `organization_addon_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_addon_subscriptions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `addon_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscription_status` enum('trial','active','suspended','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'trial',
  `billing_cycle` enum('monthly','yearly') COLLATE utf8mb4_unicode_ci DEFAULT 'monthly',
  `monthly_price` decimal(10,2) DEFAULT NULL,
  `yearly_price` decimal(10,2) DEFAULT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `trial_started_at` timestamp NULL DEFAULT NULL,
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `trial_converted_to_paid` tinyint(1) DEFAULT '0',
  `subscription_started_at` timestamp NULL DEFAULT NULL,
  `subscription_ends_at` timestamp NULL DEFAULT NULL,
  `next_renewal_date` timestamp NULL DEFAULT NULL,
  `api_calls_used` int DEFAULT '0',
  `api_calls_limit` int DEFAULT NULL,
  `users_added` int DEFAULT '0',
  `users_limit` int DEFAULT NULL,
  `enabled_features` longtext COLLATE utf8mb4_unicode_ci,
  `auto_renew` tinyint(1) DEFAULT '1',
  `payment_method_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organization_addon_subscriptions_organization_id_addon_id_unique` (`organization_id`,`addon_id`),
  KEY `organization_addon_subscriptions_addon_id_foreign` (`addon_id`),
  KEY `organization_addon_subscriptions_subscription_status_index` (`subscription_status`),
  KEY `organization_addon_subscriptions_next_renewal_date_index` (`next_renewal_date`),
  CONSTRAINT `organization_addon_subscriptions_addon_id_foreign` FOREIGN KEY (`addon_id`) REFERENCES `marketplace_addons` (`id`),
  CONSTRAINT `organization_addon_subscriptions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organization_module_features`
--

DROP TABLE IF EXISTS `organization_module_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_module_features` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `module_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feature_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `monthly_usage_limit` int DEFAULT NULL,
  `monthly_usage_current` int DEFAULT '0',
  `enabled_at` timestamp NULL DEFAULT NULL,
  `disabled_at` timestamp NULL DEFAULT NULL,
  `reason_disabled` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disabled_by_user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_mod_feat_unique` (`organization_id`,`module_key`,`feature_key`),
  KEY `organization_module_features_module_key_index` (`module_key`),
  KEY `organization_module_features_enabled_index` (`enabled`),
  CONSTRAINT `organization_module_features_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organization_profiles`
--

DROP TABLE IF EXISTS `organization_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cin_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_dark_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organization_profiles_uuid_unique` (`uuid`),
  UNIQUE KEY `organization_profiles_organization_id_unique` (`organization_id`),
  KEY `organization_profiles_created_by_foreign` (`created_by`),
  KEY `organization_profiles_updated_by_foreign` (`updated_by`),
  KEY `organization_profiles_organization_id_index` (`organization_id`),
  KEY `organization_profiles_created_at_index` (`created_at`),
  CONSTRAINT `organization_profiles_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `organization_profiles_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `organization_profiles_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organization_settings`
--

DROP TABLE IF EXISTS `organization_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` json DEFAULT NULL,
  `setting_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organization_settings_uuid_unique` (`uuid`),
  UNIQUE KEY `organization_settings_organization_id_setting_key_unique` (`organization_id`,`setting_key`),
  KEY `organization_settings_created_by_foreign` (`created_by`),
  KEY `organization_settings_updated_by_foreign` (`updated_by`),
  KEY `organization_settings_organization_id_index` (`organization_id`),
  KEY `organization_settings_setting_type_index` (`setting_type`),
  KEY `organization_settings_created_at_index` (`created_at`),
  CONSTRAINT `organization_settings_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `organization_settings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `organization_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `plan_tier` enum('starter','professional','enterprise') COLLATE utf8mb4_unicode_ci DEFAULT 'starter',
  `allowed_ip_ranges` json DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line1` text COLLATE utf8mb4_unicode_ci,
  `subscription_tier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` longtext COLLATE utf8mb4_unicode_ci,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `designation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_host` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_port` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_user` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_pass` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sender_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sender_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscription_plan_id` bigint unsigned DEFAULT NULL,
  `enabled_modules` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_uuid_unique` (`uuid`),
  UNIQUE KEY `organizations_slug_unique` (`slug`),
  KEY `organizations_status_index` (`status`),
  KEY `organizations_created_at_index` (`created_at`),
  KEY `organizations_subscription_plan_id_index` (`subscription_plan_id`),
  CONSTRAINT `organizations_subscription_plan_id_foreign` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ot_rule_eligibility`
--

DROP TABLE IF EXISTS `ot_rule_eligibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ot_rule_eligibility` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ot_rule_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `entity_type` enum('company_location','department','grade','employee_type','shift','employee_status') NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ot_rule_entity` (`ot_rule_id`,`entity_type`,`entity_id`),
  KEY `ot_rule_eligibility_ot_rule_id_index` (`ot_rule_id`),
  KEY `ot_rule_eligibility_organization_id_index` (`organization_id`),
  CONSTRAINT `ot_rule_eligibility_ot_rule_id_foreign` FOREIGN KEY (`ot_rule_id`) REFERENCES `ot_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ot_rules`
--

DROP TABLE IF EXISTS `ot_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ot_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `rule_name` varchar(255) NOT NULL,
  `title_change` varchar(255) DEFAULT NULL,
  `period` enum('daily','weekly') DEFAULT 'daily',
  `shift_type` enum('time_bound','flexible') DEFAULT 'time_bound',
  `daily_max_ot_limit` decimal(6,2) DEFAULT NULL,
  `daily_max_ot_limit_unit` enum('minutes','hours') DEFAULT 'hours',
  `weekly_max_ot_limit` decimal(6,2) DEFAULT NULL,
  `weekly_max_ot_limit_unit` enum('minutes','hours') DEFAULT 'hours',
  `max_limit_priority_json` text,
  `auto_ot_approve` tinyint(1) DEFAULT '0',
  `auto_approve_min_minutes` int DEFAULT NULL,
  `auto_approve_max_minutes` int DEFAULT NULL,
  `ot_formula_enabled` tinyint(1) DEFAULT '0',
  `ot_formula_expression` text,
  `employee_timing_rounding` varchar(50) DEFAULT 'no_round',
  `normal_day_config_json` text,
  `holiday_config_json` text,
  `weekend_config_json` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ot_rules_uuid_unique` (`uuid`),
  KEY `ot_rules_created_by_foreign` (`created_by`),
  KEY `ot_rules_updated_by_foreign` (`updated_by`),
  KEY `ot_rules_organization_id_index` (`organization_id`),
  KEY `ot_rules_company_id_index` (`company_id`),
  KEY `ot_rules_is_active_index` (`is_active`),
  CONSTRAINT `ot_rules_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `ot_rules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `ot_rules_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `otp_codes`
--

DROP TABLE IF EXISTS `otp_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `channel` enum('email','sms') COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('login','mfa_backup','email_verification','mobile_verification','password_reset') COLLATE utf8mb4_unicode_ci NOT NULL,
  `destination` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` int DEFAULT '0',
  `max_attempts` int DEFAULT '5',
  `expires_at` timestamp NOT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `otp_codes_organization_id_foreign` (`organization_id`),
  KEY `otp_codes_user_id_purpose_index` (`user_id`,`purpose`),
  KEY `otp_codes_expires_at_index` (`expires_at`),
  CONSTRAINT `otp_codes_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `otp_codes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `overtime_requests`
--

DROP TABLE IF EXISTS `overtime_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overtime_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `attendance_record_id` bigint unsigned DEFAULT NULL,
  `overtime_date` date NOT NULL,
  `overtime_hours` decimal(4,2) NOT NULL,
  `overtime_minutes` int DEFAULT NULL,
  `overtime_type` enum('extra_hours','weekend_work','holiday_work') COLLATE utf8mb4_unicode_ci NOT NULL,
  `day_type` enum('normal','holiday','weekend') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` enum('manual','auto_checkout') COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `reason_description` text COLLATE utf8mb4_unicode_ci,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `comp_off_eligible` tinyint(1) DEFAULT '1',
  `comp_off_used` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `overtime_requests_uuid_unique` (`uuid`),
  KEY `overtime_requests_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `overtime_requests_approved_by_foreign` (`approved_by`),
  KEY `overtime_requests_created_by_foreign` (`created_by`),
  KEY `overtime_requests_updated_by_foreign` (`updated_by`),
  KEY `overtime_requests_organization_id_index` (`organization_id`),
  KEY `overtime_requests_employee_id_index` (`employee_id`),
  KEY `overtime_requests_approval_status_index` (`approval_status`),
  KEY `overtime_requests_overtime_date_index` (`overtime_date`),
  CONSTRAINT `overtime_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `overtime_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `overtime_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `overtime_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `overtime_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `overtime_requests_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_history`
--

DROP TABLE IF EXISTS `password_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `password_history_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `password_history_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_policies`
--

DROP TABLE IF EXISTS `password_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `min_length` int DEFAULT '8',
  `require_uppercase` tinyint(1) DEFAULT '1',
  `require_lowercase` tinyint(1) DEFAULT '1',
  `require_number` tinyint(1) DEFAULT '1',
  `require_special_char` tinyint(1) DEFAULT '1',
  `password_expiry_days` int DEFAULT NULL,
  `password_history_count` int DEFAULT '3',
  `max_failed_attempts` int DEFAULT '5',
  `lockout_duration_minutes` int DEFAULT '30',
  `session_timeout_minutes` int DEFAULT '30',
  `mfa_required` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_policies_organization_id_unique` (`organization_id`),
  KEY `password_policies_organization_id_index` (`organization_id`),
  CONSTRAINT `password_policies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pay_component_definitions`
--

DROP TABLE IF EXISTS `pay_component_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pay_component_definitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'COMP',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Component',
  `component_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `calculation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `formula_expression` text COLLATE utf8mb4_unicode_ci,
  `is_taxable` tinyint(1) DEFAULT '1',
  `is_pf_applicable` tinyint(1) DEFAULT '1',
  `is_esi_applicable` tinyint(1) DEFAULT '1',
  `is_pt_applicable` tinyint(1) DEFAULT '1',
  `is_statutory` tinyint(1) DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL DEFAULT '1',
  `updated_by` bigint unsigned DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `organization_id` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_component_audit_logs`
--

DROP TABLE IF EXISTS `payroll_component_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_component_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `component_id` bigint unsigned NOT NULL,
  `component_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` bigint unsigned DEFAULT NULL,
  `action` enum('CREATE','UPDATE','DELETE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UPDATE',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `before_state` json DEFAULT NULL,
  `after_state` json DEFAULT NULL,
  `updated_by_id` bigint unsigned DEFAULT NULL,
  `updated_by_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Admin',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comp_audit_comp_id` (`component_id`),
  KEY `idx_comp_audit_group_id` (`group_id`),
  KEY `idx_comp_audit_org_id` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_component_conditions`
--

DROP TABLE IF EXISTS `payroll_component_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_component_conditions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `component_id` bigint unsigned NOT NULL,
  `condition_on` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value2` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_component_conditions_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_component_group_audit_logs`
--

DROP TABLE IF EXISTS `payroll_component_group_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_component_group_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `group_id` bigint unsigned NOT NULL,
  `group_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('CREATE','UPDATE','DELETE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UPDATE',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `before_state` json DEFAULT NULL,
  `after_state` json DEFAULT NULL,
  `updated_by_id` bigint unsigned DEFAULT NULL,
  `updated_by_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Admin',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_audit_group_id` (`group_id`),
  KEY `idx_group_audit_org_id` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_component_groups`
--

DROP TABLE IF EXISTS `payroll_component_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_component_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('Earning','Deduction') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Earning',
  `round_format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Round',
  `group_function` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Max',
  `configure_on_profile` tinyint(1) DEFAULT '0',
  `display_on_profile` tinyint(1) DEFAULT '0',
  `is_editable` tinyint(1) DEFAULT '1',
  `contributed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Employee',
  `is_active` tinyint(1) DEFAULT '1',
  `recalculate_on_change` tinyint(1) DEFAULT '0',
  `group_for_payslip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Choose',
  `display_order` int DEFAULT '10',
  `disable_arrear` tinyint(1) DEFAULT '0',
  `display_total_on_process` tinyint(1) DEFAULT '0',
  `tds_same_month` tinyint(1) DEFAULT '0',
  `is_taxable` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payroll_component_groups_organization_id_foreign` (`organization_id`),
  CONSTRAINT `payroll_component_groups_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_components`
--

DROP TABLE IF EXISTS `payroll_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_components` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `group_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `non_cashable` tinyint(1) DEFAULT '0',
  `based_on_attendance` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `component_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Value',
  `amount` decimal(14,2) DEFAULT '0.00',
  `formula` text COLLATE utf8mb4_unicode_ci,
  `boundary_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Choose',
  `min_amount` decimal(14,2) DEFAULT '0.00',
  `max_amount` decimal(14,2) DEFAULT '0.00',
  `effective_from_date` date DEFAULT NULL,
  `effective_to_date` date DEFAULT NULL,
  `condition_on` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_operator` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_value1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_value2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `months` json DEFAULT NULL,
  `gender_filter` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'All',
  `grades` json DEFAULT NULL,
  `departments` json DEFAULT NULL,
  `locations` json DEFAULT NULL,
  `employees` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `module_source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statutory_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'epf|eps|vpf|esi|pt|tds|lwf|gratuity',
  `is_statutory` tinyint(1) NOT NULL DEFAULT '0',
  `calculation_order` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payroll_components_organization_id_foreign` (`organization_id`),
  KEY `payroll_components_group_id_foreign` (`group_id`),
  CONSTRAINT `payroll_components_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `payroll_component_groups` (`id`),
  CONSTRAINT `payroll_components_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_cycles`
--

DROP TABLE IF EXISTS `payroll_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_cycles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `cycle_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_type` enum('monthly','biweekly','weekly','fortnightly') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_start_date` date NOT NULL,
  `cycle_end_date` date NOT NULL,
  `payroll_run_date` date NOT NULL,
  `salary_credit_date` date NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `cutoff_day` int DEFAULT '25',
  `disbursement_date_str` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '1st',
  `payslip_frequency` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Monthly',
  `is_daily_wages` tinyint(1) DEFAULT '0',
  `frequency` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Monthly' COMMENT 'Monthly, Bi-monthly, Semi-Monthly, Weekly, Bi-Weekly',
  `start_date` int DEFAULT '1' COMMENT 'Day of month calculation starts',
  `start_date_2` int DEFAULT NULL COMMENT 'For Bi-monthly: 2nd cycle start date',
  `start_day` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'For Weekly: Mon/Tue/Wed/Thu/Fri/Sat/Sun',
  `cutoff_day_name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'For Weekly: day name for cutoff',
  `total_days_calc` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '30' COMMENT '30, Month-Days, WorkDays, etc.',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_cycles_uuid_unique` (`uuid`),
  UNIQUE KEY `payroll_cycles_organization_id_cycle_code_unique` (`organization_id`,`cycle_code`),
  KEY `payroll_cycles_created_by_foreign` (`created_by`),
  KEY `payroll_cycles_updated_by_foreign` (`updated_by`),
  KEY `payroll_cycles_organization_id_index` (`organization_id`),
  CONSTRAINT `payroll_cycles_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_cycles_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payroll_cycles_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_deductions`
--

DROP TABLE IF EXISTS `payroll_deductions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_deductions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `payroll_run_employee_id` bigint unsigned NOT NULL,
  `component_id` bigint unsigned DEFAULT NULL,
  `calculated_value` decimal(12,2) NOT NULL,
  `actual_value` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `component_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_deductions_uuid_unique` (`uuid`),
  KEY `payroll_deductions_organization_id_index` (`organization_id`),
  KEY `payroll_deductions_payroll_run_employee_id_index` (`payroll_run_employee_id`),
  KEY `payroll_deductions_component_id_index` (`component_id`),
  CONSTRAINT `payroll_deductions_component_id_foreign` FOREIGN KEY (`component_id`) REFERENCES `payroll_components` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payroll_deductions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payroll_deductions_payroll_run_employee_id_foreign` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_earnings`
--

DROP TABLE IF EXISTS `payroll_earnings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_earnings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `payroll_run_employee_id` bigint unsigned NOT NULL,
  `component_id` bigint unsigned DEFAULT NULL,
  `calculated_value` decimal(12,2) NOT NULL,
  `actual_value` decimal(12,2) NOT NULL,
  `formula_used` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `component_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_non_cashable` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_earnings_uuid_unique` (`uuid`),
  KEY `payroll_earnings_organization_id_index` (`organization_id`),
  KEY `payroll_earnings_payroll_run_employee_id_index` (`payroll_run_employee_id`),
  KEY `payroll_earnings_component_id_index` (`component_id`),
  CONSTRAINT `payroll_earnings_component_id_foreign` FOREIGN KEY (`component_id`) REFERENCES `payroll_components` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payroll_earnings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payroll_earnings_payroll_run_employee_id_foreign` FOREIGN KEY (`payroll_run_employee_id`) REFERENCES `payroll_run_employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_gratuity_rules`
--

DROP TABLE IF EXISTS `payroll_gratuity_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_gratuity_rules` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'Standard Gratuity Policy',
  `eligible_years_operator` varchar(20) DEFAULT '>=',
  `eligible_years_value` decimal(5,2) DEFAULT '5.00',
  `rounding_rule` varchar(50) DEFAULT 'round_up',
  `formula` text,
  `companies` json DEFAULT NULL,
  `locations` json DEFAULT NULL,
  `departments` json DEFAULT NULL,
  `grades` json DEFAULT NULL,
  `employment_types` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_ledger_entries`
--

DROP TABLE IF EXISTS `payroll_ledger_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_ledger_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `payroll_run_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `entry_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `component_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(14,2) DEFAULT '0.00',
  `financial_year` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary_month` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_ledger_entries_uuid_unique` (`uuid`),
  KEY `payroll_ledger_entries_organization_id_salary_month_index` (`organization_id`,`salary_month`),
  KEY `payroll_ledger_entries_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_loan_types`
--

DROP TABLE IF EXISTS `payroll_loan_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_loan_types` (
  `id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'loan',
  `min_service_months` int DEFAULT '0',
  `interest_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Fixed',
  `interest_rate` decimal(5,2) DEFAULT '8.50',
  `min_term_months` int DEFAULT '1',
  `max_term_months` int DEFAULT '12',
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'All',
  `min_amount` decimal(15,2) DEFAULT '5000.00',
  `max_amount` decimal(15,2) DEFAULT '100000.00',
  `max_applications_per_year` int DEFAULT '2',
  `gap_months` int DEFAULT '3',
  `restrict_concurrent` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `foreclosure_allowed` tinyint(1) DEFAULT '0',
  `max_eligibility` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Salary',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approver_role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'hr_manager',
  `request_form_template` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_form_template` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disbursement_form_template` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_form_template` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stop_form_template` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `departments` json DEFAULT NULL,
  `grades` json DEFAULT NULL,
  `employee_types` json DEFAULT NULL,
  `is_taxable` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_mass_upload_logs`
--

DROP TABLE IF EXISTS `payroll_mass_upload_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_mass_upload_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `slab_name` varchar(255) DEFAULT NULL,
  `total_rows` int unsigned NOT NULL DEFAULT '0',
  `success_count` int unsigned NOT NULL DEFAULT '0',
  `fail_count` int unsigned NOT NULL DEFAULT '0',
  `errors` json DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pmul_org_created_idx` (`organization_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_policies`
--

DROP TABLE IF EXISTS `payroll_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `pay_frequency` enum('monthly','biweekly','weekly') COLLATE utf8mb4_unicode_ci DEFAULT 'monthly',
  `salary_structure` json DEFAULT NULL,
  `deductions` json DEFAULT NULL,
  `compliance_settings` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_policies_uuid_unique` (`uuid`),
  UNIQUE KEY `payroll_policies_organization_id_code_unique` (`organization_id`,`code`),
  KEY `payroll_policies_created_by_foreign` (`created_by`),
  KEY `payroll_policies_updated_by_foreign` (`updated_by`),
  KEY `payroll_policies_organization_id_index` (`organization_id`),
  KEY `payroll_policies_is_default_index` (`is_default`),
  KEY `payroll_policies_status_index` (`status`),
  KEY `payroll_policies_created_at_index` (`created_at`),
  CONSTRAINT `payroll_policies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_policies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payroll_policies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_register_overrides`
--

DROP TABLE IF EXISTS `payroll_register_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_register_overrides` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `month` varchar(7) NOT NULL,
  `cycle_id` bigint unsigned DEFAULT NULL,
  `salary_days` decimal(6,2) DEFAULT '30.00',
  `paid_days` decimal(6,2) DEFAULT '30.00',
  `unpaid_days` decimal(6,2) DEFAULT '0.00',
  `basic` decimal(14,2) DEFAULT '0.00',
  `hra` decimal(14,2) DEFAULT '0.00',
  `standard_allowance` decimal(14,2) DEFAULT '0.00',
  `meal_allowance` decimal(14,2) DEFAULT '0.00',
  `communication_allowance` decimal(14,2) DEFAULT '0.00',
  `children_education_allowance` decimal(14,2) DEFAULT '0.00',
  `lta` decimal(14,2) DEFAULT '0.00',
  `gross` decimal(14,2) DEFAULT '0.00',
  `basic_earned` decimal(14,2) DEFAULT '0.00',
  `hra_earned` decimal(14,2) DEFAULT '0.00',
  `standard_allowance_earned` decimal(14,2) DEFAULT '0.00',
  `meal_allowance_earned` decimal(14,2) DEFAULT '0.00',
  `communication_allowance_earned` decimal(14,2) DEFAULT '0.00',
  `children_education_allowance_earned` decimal(14,2) DEFAULT '0.00',
  `lta_earned` decimal(14,2) DEFAULT '0.00',
  `gross_earned` decimal(14,2) DEFAULT '0.00',
  `total_gross_earned` decimal(14,2) DEFAULT '0.00',
  `adjustment` decimal(14,2) DEFAULT '0.00',
  `ot_hours` decimal(6,2) DEFAULT '0.00',
  `ot` decimal(14,2) DEFAULT '0.00',
  `pt` decimal(14,2) DEFAULT '0.00',
  `pf` decimal(14,2) DEFAULT '0.00',
  `tds` decimal(14,2) DEFAULT '0.00',
  `esic` decimal(14,2) DEFAULT '0.00',
  `esic_employer` decimal(14,2) DEFAULT '0.00',
  `total_deduction` decimal(14,2) DEFAULT '0.00',
  `net_salary` decimal(14,2) DEFAULT '0.00',
  `ctc` decimal(14,2) DEFAULT '0.00',
  `payment_status` varchar(30) DEFAULT 'Freeze',
  `notes` text,
  `component_values` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pro_org_emp_month_unique` (`organization_id`,`employee_id`,`month`),
  KEY `pro_org_month_idx` (`organization_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_run_employees`
--

DROP TABLE IF EXISTS `payroll_run_employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_run_employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `payroll_run_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `status` enum('pending','processed','error') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `working_days` int DEFAULT NULL,
  `leave_days` decimal(6,2) DEFAULT NULL,
  `paid_leave_days` decimal(6,2) DEFAULT NULL,
  `unpaid_leave_days` decimal(6,2) DEFAULT NULL,
  `overtime_hours` decimal(6,2) DEFAULT NULL,
  `total_earnings` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_deductions` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_salary` decimal(15,2) NOT NULL DEFAULT '0.00',
  `tax_deducted` decimal(15,2) NOT NULL DEFAULT '0.00',
  `processing_notes` text COLLATE utf8mb4_unicode_ci,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_run_employees_uuid_unique` (`uuid`),
  UNIQUE KEY `payroll_run_employees_payroll_run_id_employee_id_unique` (`payroll_run_id`,`employee_id`),
  KEY `payroll_run_employees_created_by_foreign` (`created_by`),
  KEY `payroll_run_employees_updated_by_foreign` (`updated_by`),
  KEY `payroll_run_employees_organization_id_index` (`organization_id`),
  KEY `payroll_run_employees_payroll_run_id_index` (`payroll_run_id`),
  KEY `payroll_run_employees_employee_id_index` (`employee_id`),
  KEY `payroll_run_employees_status_index` (`status`),
  CONSTRAINT `payroll_run_employees_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_run_employees_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `payroll_run_employees_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payroll_run_employees_payroll_run_id_foreign` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`),
  CONSTRAINT `payroll_run_employees_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_runs`
--

DROP TABLE IF EXISTS `payroll_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `payroll_cycle_id` bigint unsigned NOT NULL,
  `run_type` enum('regular','off_cycle','final_settlement','arrears') COLLATE utf8mb4_unicode_ci NOT NULL,
  `run_month` date NOT NULL,
  `status` enum('draft','processing','calculated','locked','approved','published','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `locked_by` bigint unsigned DEFAULT NULL,
  `locked_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `total_employees` int NOT NULL DEFAULT '0',
  `processed_employees` int NOT NULL DEFAULT '0',
  `error_count` int NOT NULL DEFAULT '0',
  `processing_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_runs_uuid_unique` (`uuid`),
  KEY `payroll_runs_locked_by_foreign` (`locked_by`),
  KEY `payroll_runs_approved_by_foreign` (`approved_by`),
  KEY `payroll_runs_created_by_foreign` (`created_by`),
  KEY `payroll_runs_updated_by_foreign` (`updated_by`),
  KEY `payroll_runs_organization_id_index` (`organization_id`),
  KEY `payroll_runs_payroll_cycle_id_index` (`payroll_cycle_id`),
  KEY `payroll_runs_status_index` (`status`),
  KEY `payroll_runs_run_month_index` (`run_month`),
  CONSTRAINT `payroll_runs_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_runs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_runs_locked_by_foreign` FOREIGN KEY (`locked_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_runs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payroll_runs_payroll_cycle_id_foreign` FOREIGN KEY (`payroll_cycle_id`) REFERENCES `payroll_cycles` (`id`),
  CONSTRAINT `payroll_runs_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_settings`
--

DROP TABLE IF EXISTS `payroll_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `esic_calculation_base` varchar(50) DEFAULT 'Gross Salary' COMMENT 'Gross Salary, Fixed Gross, Actual Gross',
  `esic_wage_ceiling` decimal(12,2) DEFAULT '21000.00',
  `sandwich_policy_enabled` tinyint(1) DEFAULT '0',
  `sandwich_policy_rules` json DEFAULT NULL COMMENT '[{appliesTo, includeWeekOff, includeHoliday}]',
  `loan_setting` json DEFAULT NULL COMMENT '{maxLoanMultipleOfSalary, maxTenureMonths, interestRatePct, minServiceMonths}',
  `payslip_setting` json DEFAULT NULL COMMENT '{showCompanyLogo, showBankDetails, showLeaveBalance, showAttendanceSummary, footerNote}',
  `payment_status_options` json DEFAULT NULL COMMENT '[{code, label, color}]',
  `checklist_setting` json DEFAULT NULL COMMENT '[{label, isMandatory}]',
  `approval_mode` varchar(20) DEFAULT 'single' COMMENT 'single, multi',
  `approval_levels` json DEFAULT NULL COMMENT '[{level, name, approverRole, approverUserId}]',
  `require_approval_before_publish` tinyint(1) DEFAULT '1',
  `process_payroll_tabs` json DEFAULT NULL COMMENT '[{code, label, isEnabled}]',
  `freeze_attendance_day` int DEFAULT '25' COMMENT 'Day of month attendance data is frozen for payroll',
  `ignore_leave_type_ids` json DEFAULT NULL COMMENT 'Leave type IDs excluded from LOP calculation',
  `mass_paid_days` int DEFAULT '0' COMMENT 'Days credited as paid to all employees regardless of attendance',
  `double_pay_inclusive` tinyint(1) DEFAULT '0' COMMENT 'Whether OT/holiday double-pay is included in gross by default',
  `bonus_setting` json DEFAULT NULL COMMENT '{isEnabled, calculationBase, percentage}',
  `attendance_bonus_setting` json DEFAULT NULL COMMENT '{isEnabled, amount, minAttendancePct}',
  `night_allowance_setting` json DEFAULT NULL COMMENT '{isEnabled, amountPerNight, shiftStartHour, shiftEndHour}',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `rounding_mode` varchar(20) NOT NULL DEFAULT 'half_up' COMMENT 'half_up|half_even|ceil|floor|none',
  `rounding_nearest` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT 'round to nearest N rupees; 0 = keep paise',
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_settings_uuid_unique` (`uuid`),
  UNIQUE KEY `payroll_settings_org_company_unique` (`organization_id`,`company_id`),
  KEY `payroll_settings_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payroll_slabs`
--

DROP TABLE IF EXISTS `payroll_slabs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_slabs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departments` text COLLATE utf8mb4_unicode_ci,
  `grades` text COLLATE utf8mb4_unicode_ci,
  `locations` text COLLATE utf8mb4_unicode_ci,
  `min_ctc` decimal(14,2) DEFAULT '0.00',
  `max_ctc` decimal(14,2) DEFAULT '10000000.00',
  `selected_component_ids` text COLLATE utf8mb4_unicode_ci,
  `cycle_id` bigint unsigned DEFAULT NULL,
  `employment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Regular',
  `pf_rate_pct` decimal(5,2) DEFAULT '12.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_slabs_uuid_unique` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payslip_items`
--

DROP TABLE IF EXISTS `payslip_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payslip_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) DEFAULT (uuid()),
  `organization_id` int NOT NULL DEFAULT '68',
  `company_id` bigint unsigned DEFAULT NULL,
  `payslip_id` int NOT NULL,
  `component_type` enum('earning','deduction') NOT NULL,
  `component_name` varchar(100) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_pi_ps` (`payslip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payslips`
--

DROP TABLE IF EXISTS `payslips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payslips` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `payroll_run_id` bigint unsigned NOT NULL,
  `payslip_month` date NOT NULL,
  `payslip_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ctc` decimal(15,2) NOT NULL,
  `basic_salary` decimal(12,2) NOT NULL,
  `gross_salary` decimal(15,2) NOT NULL,
  `total_deductions` decimal(15,2) NOT NULL,
  `net_salary` decimal(15,2) NOT NULL,
  `ytd_gross` decimal(15,2) NOT NULL DEFAULT '0.00',
  `ytd_tax` decimal(15,2) NOT NULL DEFAULT '0.00',
  `ytd_net` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payslip_pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payslip_html` text COLLATE utf8mb4_unicode_ci,
  `is_locked` tinyint(1) DEFAULT '0',
  `locked_at` timestamp NULL DEFAULT NULL,
  `digitally_signed` tinyint(1) DEFAULT '0',
  `signature_timestamp` timestamp NULL DEFAULT NULL,
  `sent_to_employee_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payslips_uuid_unique` (`uuid`),
  UNIQUE KEY `payslips_organization_id_payslip_number_unique` (`organization_id`,`payslip_number`),
  KEY `payslips_created_by_foreign` (`created_by`),
  KEY `payslips_updated_by_foreign` (`updated_by`),
  KEY `payslips_organization_id_index` (`organization_id`),
  KEY `payslips_employee_id_index` (`employee_id`),
  KEY `payslips_payroll_run_id_index` (`payroll_run_id`),
  KEY `payslips_payslip_month_index` (`payslip_month`),
  CONSTRAINT `payslips_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payslips_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `payslips_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payslips_payroll_run_id_foreign` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`),
  CONSTRAINT `payslips_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `performance_analytics_cache`
--

DROP TABLE IF EXISTS `performance_analytics_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `performance_analytics_cache` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `metric_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metric_data` json NOT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `performance_analytics_cache_uuid_unique` (`uuid`),
  KEY `performance_analytics_cache_organization_id_index` (`organization_id`),
  KEY `performance_analytics_cache_metric_type_index` (`metric_type`),
  KEY `performance_analytics_cache_generated_at_index` (`generated_at`),
  CONSTRAINT `performance_analytics_cache_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `performance_improvement_plans`
--

DROP TABLE IF EXISTS `performance_improvement_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `performance_improvement_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','completed','passed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `performance_improvement_plans_uuid_unique` (`uuid`),
  KEY `performance_improvement_plans_created_by_foreign` (`created_by`),
  KEY `performance_improvement_plans_updated_by_foreign` (`updated_by`),
  KEY `performance_improvement_plans_organization_id_index` (`organization_id`),
  KEY `performance_improvement_plans_employee_id_index` (`employee_id`),
  KEY `performance_improvement_plans_status_index` (`status`),
  CONSTRAINT `performance_improvement_plans_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `performance_improvement_plans_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `performance_improvement_plans_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `performance_improvement_plans_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `performance_reviews`
--

DROP TABLE IF EXISTS `performance_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `performance_reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `reviewer_id` bigint unsigned NOT NULL,
  `cycle_id` bigint unsigned NOT NULL,
  `template_id` bigint unsigned NOT NULL,
  `status` enum('draft','submitted','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `overall_rating` decimal(5,2) DEFAULT NULL,
  `review_date` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `performance_reviews_uuid_unique` (`uuid`),
  KEY `performance_reviews_template_id_foreign` (`template_id`),
  KEY `performance_reviews_created_by_foreign` (`created_by`),
  KEY `performance_reviews_updated_by_foreign` (`updated_by`),
  KEY `performance_reviews_organization_id_index` (`organization_id`),
  KEY `performance_reviews_employee_id_index` (`employee_id`),
  KEY `performance_reviews_reviewer_id_index` (`reviewer_id`),
  KEY `performance_reviews_cycle_id_index` (`cycle_id`),
  KEY `performance_reviews_status_index` (`status`),
  CONSTRAINT `performance_reviews_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `performance_reviews_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `performance_reviews_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `performance_reviews_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `performance_reviews_reviewer_id_foreign` FOREIGN KEY (`reviewer_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `performance_reviews_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `review_templates` (`id`),
  CONSTRAINT `performance_reviews_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_code_unique` (`code`),
  KEY `permissions_module_index` (`module`),
  KEY `permissions_resource_index` (`resource`),
  KEY `permissions_action_index` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pip_goals`
--

DROP TABLE IF EXISTS `pip_goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pip_goals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `pip_id` bigint unsigned NOT NULL,
  `goal_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_date` date NOT NULL,
  `status` enum('pending','in_progress','achieved','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pip_goals_uuid_unique` (`uuid`),
  KEY `pip_goals_organization_id_index` (`organization_id`),
  KEY `pip_goals_pip_id_index` (`pip_id`),
  CONSTRAINT `pip_goals_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `pip_goals_pip_id_foreign` FOREIGN KEY (`pip_id`) REFERENCES `performance_improvement_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pip_reviews`
--

DROP TABLE IF EXISTS `pip_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pip_reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `pip_id` bigint unsigned NOT NULL,
  `review_date` date NOT NULL,
  `status` enum('in_progress','completed','passed','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pip_reviews_uuid_unique` (`uuid`),
  KEY `pip_reviews_created_by_foreign` (`created_by`),
  KEY `pip_reviews_organization_id_index` (`organization_id`),
  KEY `pip_reviews_pip_id_index` (`pip_id`),
  CONSTRAINT `pip_reviews_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pip_reviews_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `pip_reviews_pip_id_foreign` FOREIGN KEY (`pip_id`) REFERENCES `performance_improvement_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pipeline_stages`
--

DROP TABLE IF EXISTS `pipeline_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pipeline_stages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `stage_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence_order` int NOT NULL,
  `is_rejection_stage` tinyint(1) NOT NULL DEFAULT '0',
  `stage_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pipeline_stages_uuid_unique` (`uuid`),
  KEY `pipeline_stages_organization_id_index` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_assignments`
--

DROP TABLE IF EXISTS `policy_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_assignments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `policy_id` bigint unsigned NOT NULL,
  `role_code` varchar(100) NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `policy_assignments_policy_id_role_code_index` (`policy_id`,`role_code`),
  KEY `policy_assignments_role_code_organization_id_index` (`role_code`,`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_attachments`
--

DROP TABLE IF EXISTS `policy_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `policy_document_id` bigint unsigned NOT NULL,
  `policy_version_id` bigint unsigned DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_size` int NOT NULL,
  `storage_path` longtext NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `is_main_document` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_by` bigint unsigned NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_attachments_uuid_unique` (`uuid`),
  KEY `policy_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `policy_attachments_organization_id_index` (`organization_id`),
  KEY `policy_attachments_company_id_index` (`company_id`),
  KEY `policy_attachments_policy_document_id_index` (`policy_document_id`),
  KEY `policy_attachments_policy_version_id_index` (`policy_version_id`),
  KEY `policy_attachments_is_main_document_index` (`is_main_document`),
  CONSTRAINT `policy_attachments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_attachments_policy_document_id_foreign` FOREIGN KEY (`policy_document_id`) REFERENCES `policy_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_attachments_policy_version_id_foreign` FOREIGN KEY (`policy_version_id`) REFERENCES `policy_document_versions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_categories`
--

DROP TABLE IF EXISTS `policy_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `policy_categories_organization_id_deleted_at_index` (`organization_id`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_document_role_mappings`
--

DROP TABLE IF EXISTS `policy_document_role_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_document_role_mappings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `policy_document_id` bigint unsigned NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `role_id` bigint unsigned DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_document_role_mappings_uuid_unique` (`uuid`),
  UNIQUE KEY `unq_policy_role_org` (`policy_document_id`,`role_code`,`organization_id`),
  KEY `policy_document_role_mappings_organization_id_index` (`organization_id`),
  KEY `policy_document_role_mappings_company_id_index` (`company_id`),
  KEY `policy_document_role_mappings_policy_document_id_index` (`policy_document_id`),
  KEY `policy_document_role_mappings_role_code_index` (`role_code`),
  CONSTRAINT `policy_document_role_mappings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_document_role_mappings_policy_document_id_foreign` FOREIGN KEY (`policy_document_id`) REFERENCES `policy_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_document_versions`
--

DROP TABLE IF EXISTS `policy_document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_document_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `policy_document_id` bigint unsigned NOT NULL,
  `version` varchar(20) NOT NULL DEFAULT '1.0',
  `title` varchar(255) NOT NULL,
  `description` text,
  `file_url` longtext NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `change_description` text,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_document_versions_uuid_unique` (`uuid`),
  KEY `policy_document_versions_created_by_foreign` (`created_by`),
  KEY `policy_document_versions_organization_id_index` (`organization_id`),
  KEY `policy_document_versions_policy_document_id_index` (`policy_document_id`),
  KEY `policy_document_versions_version_index` (`version`),
  CONSTRAINT `policy_document_versions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_document_versions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_document_versions_policy_document_id_foreign` FOREIGN KEY (`policy_document_id`) REFERENCES `policy_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_documents`
--

DROP TABLE IF EXISTS `policy_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) NOT NULL DEFAULT 'General',
  `file_url` longtext NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `version` varchar(20) NOT NULL DEFAULT '1.0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `applicable_gender` varchar(20) NOT NULL DEFAULT 'all',
  `applicable_department_ids` text,
  `applicable_employee_ids` text,
  `applicable_designation_ids` text,
  `custom_scope` text,
  `signature_mode` varchar(30) NOT NULL DEFAULT 'ACKNOWLEDGEMENT',
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_documents_uuid_unique` (`uuid`),
  KEY `policy_documents_created_by_foreign` (`created_by`),
  KEY `policy_documents_updated_by_foreign` (`updated_by`),
  KEY `policy_documents_organization_id_index` (`organization_id`),
  KEY `policy_documents_company_id_index` (`company_id`),
  KEY `policy_documents_is_active_index` (`is_active`),
  KEY `policy_documents_category_index` (`category`),
  CONSTRAINT `policy_documents_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_documents_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_documents_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_signatures`
--

DROP TABLE IF EXISTS `policy_signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_signatures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `policy_document_id` bigint unsigned NOT NULL,
  `policy_version_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'docusign',
  `provider_transaction_id` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `authentication_method` varchar(100) DEFAULT NULL,
  `initiated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `signed_at` timestamp NULL DEFAULT NULL,
  `document_hash` varchar(255) DEFAULT NULL,
  `signed_document_ref` longtext,
  `evidence_ref` longtext,
  `provider_metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_signatures_uuid_unique` (`uuid`),
  UNIQUE KEY `policy_signatures_provider_transaction_id_unique` (`provider_transaction_id`),
  KEY `policy_signatures_organization_id_index` (`organization_id`),
  KEY `policy_signatures_company_id_index` (`company_id`),
  KEY `policy_signatures_policy_document_id_index` (`policy_document_id`),
  KEY `policy_signatures_policy_version_id_index` (`policy_version_id`),
  KEY `policy_signatures_user_id_index` (`user_id`),
  KEY `policy_signatures_provider_transaction_id_index` (`provider_transaction_id`),
  KEY `policy_signatures_status_index` (`status`),
  CONSTRAINT `policy_signatures_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_signatures_policy_document_id_foreign` FOREIGN KEY (`policy_document_id`) REFERENCES `policy_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_signatures_policy_version_id_foreign` FOREIGN KEY (`policy_version_id`) REFERENCES `policy_document_versions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `policy_signatures_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recognitions`
--

DROP TABLE IF EXISTS `recognitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recognitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `recognized_by` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `recognition_type` enum('team_work','innovation','leadership','customer_focus','quality','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_awarded` int DEFAULT '0',
  `message` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recognitions_uuid_unique` (`uuid`),
  KEY `recognitions_recognized_by_foreign` (`recognized_by`),
  KEY `recognitions_organization_id_index` (`organization_id`),
  KEY `recognitions_employee_id_index` (`employee_id`),
  KEY `recognitions_recognition_type_index` (`recognition_type`),
  CONSTRAINT `recognitions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `recognitions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `recognitions_recognized_by_foreign` FOREIGN KEY (`recognized_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recruitment_analytics_cache`
--

DROP TABLE IF EXISTS `recruitment_analytics_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recruitment_analytics_cache` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `metric_month` date NOT NULL,
  `total_applications` int NOT NULL,
  `total_hired` int NOT NULL,
  `total_rejected` int NOT NULL,
  `average_time_to_hire` int DEFAULT NULL,
  `average_time_to_fill` int DEFAULT NULL,
  `cost_per_hire` decimal(15,2) DEFAULT NULL,
  `source_wise_hires` json DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recruitment_analytics_cache_organization_id_metric_month_unique` (`organization_id`,`metric_month`),
  KEY `recruitment_analytics_cache_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `referral_rewards`
--

DROP TABLE IF EXISTS `referral_rewards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referral_rewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `referral_id` int unsigned NOT NULL,
  `reward_amount` decimal(15,2) NOT NULL,
  `reward_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','paid','forfeited') COLLATE utf8mb4_unicode_ci NOT NULL,
  `paid_date` date DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referral_rewards_uuid_unique` (`uuid`),
  KEY `referral_rewards_referral_id_foreign` (`referral_id`),
  KEY `referral_rewards_organization_id_index` (`organization_id`),
  CONSTRAINT `referral_rewards_referral_id_foreign` FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `referrals`
--

DROP TABLE IF EXISTS `referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referrals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `referrer_employee_id` int unsigned NOT NULL,
  `candidate_id` int unsigned NOT NULL,
  `application_id` int unsigned DEFAULT NULL,
  `referral_date` date NOT NULL,
  `referral_reward_amount` decimal(15,2) DEFAULT NULL,
  `referral_status` enum('pending','hired','rejected') COLLATE utf8mb4_unicode_ci NOT NULL,
  `hired_date` date DEFAULT NULL,
  `reward_status` enum('pending','paid','forfeited') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `mrf_request_id` bigint unsigned DEFAULT NULL,
  `referring_employee_id` bigint unsigned DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `referrals_uuid_unique` (`uuid`),
  KEY `referrals_candidate_id_foreign` (`candidate_id`),
  KEY `referrals_organization_id_index` (`organization_id`),
  CONSTRAINT `referrals_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `report_templates`
--

DROP TABLE IF EXISTS `report_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `module` varchar(50) NOT NULL,
  `selected_fields` text NOT NULL,
  `filters` text NOT NULL,
  `column_order` text,
  `is_shared` tinyint DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_templates_uuid_unique` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resignations`
--

DROP TABLE IF EXISTS `resignations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resignations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `resignation_date` date NOT NULL,
  `last_working_day` date NOT NULL,
  `notice_period_days` int DEFAULT '30',
  `status` varchar(50) DEFAULT 'submitted',
  `reason_for_resignation` text,
  `reason_category` varchar(100) DEFAULT 'other',
  `accepted_by` varchar(255) DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `exit_interview_conducted` tinyint(1) DEFAULT '0',
  `exit_interview_date` date DEFAULT NULL,
  `exit_feedback` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resignations_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resource_plans`
--

DROP TABLE IF EXISTS `resource_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_plans` (
  `id` varchar(255) NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` varchar(255) NOT NULL,
  `location_id` varchar(255) DEFAULT NULL,
  `department_id` varchar(255) NOT NULL,
  `designation_id` varchar(255) NOT NULL,
  `staff_required` int NOT NULL DEFAULT '1',
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `resource_plans_org_idx` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resume_ats_scores`
--

DROP TABLE IF EXISTS `resume_ats_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resume_ats_scores` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `candidate_id` int unsigned NOT NULL,
  `resume_id` int unsigned DEFAULT NULL,
  `job_id` int unsigned NOT NULL,
  `ats_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `keyword_score` decimal(5,2) DEFAULT '0.00',
  `skill_score` decimal(5,2) DEFAULT '0.00',
  `experience_score` decimal(5,2) DEFAULT '0.00',
  `structure_score` decimal(5,2) DEFAULT '0.00',
  `format_score` decimal(5,2) DEFAULT '0.00',
  `education_score` decimal(5,2) DEFAULT '0.00',
  `matched_keywords` json DEFAULT NULL,
  `missing_keywords` json DEFAULT NULL,
  `section_details` json DEFAULT NULL,
  `analysis_version` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resume_ats_scores_uuid_unique` (`uuid`),
  UNIQUE KEY `resume_ats_scores_candidate_id_job_id_unique` (`candidate_id`,`job_id`),
  KEY `resume_ats_scores_organization_id_index` (`organization_id`),
  KEY `resume_ats_scores_candidate_id_index` (`candidate_id`),
  KEY `resume_ats_scores_job_id_index` (`job_id`),
  CONSTRAINT `resume_ats_scores_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `resume_ats_scores_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resume_bank`
--

DROP TABLE IF EXISTS `resume_bank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resume_bank` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `tracker_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `candidate_id` bigint unsigned DEFAULT NULL,
  `job_id` bigint unsigned DEFAULT NULL,
  `mrf_request_id` bigint unsigned DEFAULT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Applied','Screening','Interview','Offered','Hired','Rejected','On Hold') COLLATE utf8mb4_unicode_ci DEFAULT 'Applied',
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `ats_score` int DEFAULT NULL,
  `matched_skills` text COLLATE utf8mb4_unicode_ci,
  `missing_skills` text COLLATE utf8mb4_unicode_ci,
  `resume_text` text COLLATE utf8mb4_unicode_ci,
  `resume_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ats_scored_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resume_bank_uuid_unique` (`uuid`),
  KEY `resume_bank_organization_id_index` (`organization_id`),
  KEY `resume_bank_tracker_id_index` (`tracker_id`),
  KEY `resume_bank_status_index` (`status`),
  CONSTRAINT `resume_bank_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resume_upload_logs`
--

DROP TABLE IF EXISTS `resume_upload_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resume_upload_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_records` int DEFAULT '0',
  `success_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `status` enum('Processing','Completed','Failed') COLLATE utf8mb4_unicode_ci DEFAULT 'Processing',
  `error_log_json` json DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `target_job_id` int unsigned DEFAULT NULL,
  `ats_passed_count` int DEFAULT '0',
  `jd_match_passed_count` int DEFAULT '0',
  `ai_shortlisted_count` int DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resume_upload_logs_uuid_unique` (`uuid`),
  KEY `resume_upload_logs_organization_id_index` (`organization_id`),
  CONSTRAINT `resume_upload_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review_cycles`
--

DROP TABLE IF EXISTS `review_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_cycles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_type` enum('annual','semi_annual','quarterly','monthly') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('planning','active','review','completed','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'planning',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_cycles_uuid_unique` (`uuid`),
  KEY `review_cycles_created_by_foreign` (`created_by`),
  KEY `review_cycles_updated_by_foreign` (`updated_by`),
  KEY `review_cycles_organization_id_index` (`organization_id`),
  KEY `review_cycles_cycle_type_index` (`cycle_type`),
  KEY `review_cycles_status_index` (`status`),
  CONSTRAINT `review_cycles_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `review_cycles_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `review_cycles_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review_responses`
--

DROP TABLE IF EXISTS `review_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_responses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `review_id` bigint unsigned NOT NULL,
  `section` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `response_text` text COLLATE utf8mb4_unicode_ci,
  `score` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_responses_uuid_unique` (`uuid`),
  KEY `review_responses_organization_id_index` (`organization_id`),
  KEY `review_responses_review_id_index` (`review_id`),
  CONSTRAINT `review_responses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `review_responses_review_id_foreign` FOREIGN KEY (`review_id`) REFERENCES `performance_reviews` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review_templates`
--

DROP TABLE IF EXISTS `review_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `cycle_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sections` json DEFAULT NULL,
  `max_score` decimal(5,2) DEFAULT '100.00',
  `status` enum('active','inactive','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_templates_uuid_unique` (`uuid`),
  KEY `review_templates_created_by_foreign` (`created_by`),
  KEY `review_templates_updated_by_foreign` (`updated_by`),
  KEY `review_templates_organization_id_index` (`organization_id`),
  KEY `review_templates_cycle_id_index` (`cycle_id`),
  KEY `review_templates_status_index` (`status`),
  CONSTRAINT `review_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `review_templates_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `review_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `review_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reward_points`
--

DROP TABLE IF EXISTS `reward_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_points` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `points_balance` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reward_points_uuid_unique` (`uuid`),
  UNIQUE KEY `reward_points_organization_id_employee_id_unique` (`organization_id`,`employee_id`),
  KEY `reward_points_organization_id_index` (`organization_id`),
  KEY `reward_points_employee_id_index` (`employee_id`),
  CONSTRAINT `reward_points_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `reward_points_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_id_permission_id_unique` (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  KEY `role_permissions_role_id_index` (`role_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=250 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_policies`
--

DROP TABLE IF EXISTS `role_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_policies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_code` varchar(100) NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `document_ref` varchar(50) DEFAULT 'POL-001',
  `title` varchar(255) NOT NULL,
  `description` text,
  `sections` text NOT NULL,
  `status` varchar(20) DEFAULT 'published',
  `effective_date` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT '0',
  `is_platform_role` tinyint(1) DEFAULT '0',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_uuid_unique` (`uuid`),
  UNIQUE KEY `roles_organization_id_code_unique` (`organization_id`,`code`),
  KEY `roles_organization_id_index` (`organization_id`),
  KEY `roles_code_index` (`code`),
  CONSTRAINT `roles_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles_responsibilities`
--

DROP TABLE IF EXISTS `roles_responsibilities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_responsibilities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `department_name` varchar(150) DEFAULT NULL,
  `designation_id` bigint unsigned DEFAULT NULL,
  `designation_name` varchar(150) DEFAULT NULL,
  `kra_form_id` bigint unsigned DEFAULT NULL,
  `kra_form` varchar(150) DEFAULT NULL,
  `responsibilities` text NOT NULL,
  `is_active` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_responsibilities_uuid_unique` (`uuid`),
  KEY `roles_responsibilities_organization_id_index` (`organization_id`),
  KEY `roles_responsibilities_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  KEY `roles_responsibilities_organization_id_is_active_index` (`organization_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_advances`
--

DROP TABLE IF EXISTS `salary_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_advances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `advance_amount` decimal(15,2) NOT NULL,
  `advance_date` date NOT NULL,
  `recovery_months` int NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `status` enum('pending','approved','rejected','recovered') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `recovery_completed_date` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_advances_uuid_unique` (`uuid`),
  KEY `salary_advances_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `salary_advances_approved_by_foreign` (`approved_by`),
  KEY `salary_advances_created_by_foreign` (`created_by`),
  KEY `salary_advances_updated_by_foreign` (`updated_by`),
  KEY `salary_advances_organization_id_index` (`organization_id`),
  KEY `salary_advances_employee_id_index` (`employee_id`),
  KEY `salary_advances_status_index` (`status`),
  CONSTRAINT `salary_advances_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_advances_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_advances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `salary_advances_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `salary_advances_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_advances_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_components`
--

DROP TABLE IF EXISTS `salary_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_components` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `component_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_type` enum('earnings','deductions') COLLATE utf8mb4_unicode_ci NOT NULL,
  `earnings_type` enum('basic','hra','allowance','bonus','variable','overtime','lta') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deduction_type` enum('pf','esi','pt','tds','lwf','loan','advance','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_taxable` tinyint(1) DEFAULT '0',
  `is_recurring` tinyint(1) DEFAULT '1',
  `is_monthly` tinyint(1) DEFAULT '1',
  `percentage_of_basic` decimal(5,2) DEFAULT NULL,
  `calculation_method` enum('fixed','percentage','formula','formula_based') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `calculation_formula` text COLLATE utf8mb4_unicode_ci,
  `min_limit` decimal(12,2) DEFAULT NULL,
  `max_limit` decimal(12,2) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_components_uuid_unique` (`uuid`),
  UNIQUE KEY `salary_components_organization_id_component_code_unique` (`organization_id`,`component_code`),
  KEY `salary_components_created_by_foreign` (`created_by`),
  KEY `salary_components_updated_by_foreign` (`updated_by`),
  KEY `salary_components_organization_id_index` (`organization_id`),
  KEY `salary_components_component_type_index` (`component_type`),
  KEY `salary_components_status_index` (`status`),
  CONSTRAINT `salary_components_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_components_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `salary_components_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_revision_components`
--

DROP TABLE IF EXISTS `salary_revision_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_revision_components` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `revision_id` bigint unsigned NOT NULL,
  `component_id` bigint unsigned NOT NULL,
  `old_value` decimal(12,2) NOT NULL,
  `new_value` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_revision_components_uuid_unique` (`uuid`),
  KEY `salary_revision_components_organization_id_index` (`organization_id`),
  KEY `salary_revision_components_revision_id_index` (`revision_id`),
  KEY `salary_revision_components_component_id_index` (`component_id`),
  CONSTRAINT `salary_revision_components_component_id_foreign` FOREIGN KEY (`component_id`) REFERENCES `salary_components` (`id`),
  CONSTRAINT `salary_revision_components_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `salary_revision_components_revision_id_foreign` FOREIGN KEY (`revision_id`) REFERENCES `salary_revisions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_revisions`
--

DROP TABLE IF EXISTS `salary_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_revisions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `revision_type` enum('increment','promotion','compensation_change','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `effective_from` date NOT NULL,
  `old_ctc` decimal(15,2) NOT NULL,
  `new_ctc` decimal(15,2) NOT NULL,
  `increment_percentage` decimal(5,2) DEFAULT NULL,
  `increment_amount` decimal(15,2) DEFAULT NULL,
  `reason_description` text COLLATE utf8mb4_unicode_ci,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected','implemented') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `implemented_date` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_revisions_uuid_unique` (`uuid`),
  KEY `salary_revisions_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `salary_revisions_approved_by_foreign` (`approved_by`),
  KEY `salary_revisions_created_by_foreign` (`created_by`),
  KEY `salary_revisions_updated_by_foreign` (`updated_by`),
  KEY `salary_revisions_organization_id_index` (`organization_id`),
  KEY `salary_revisions_employee_id_index` (`employee_id`),
  KEY `salary_revisions_status_index` (`status`),
  KEY `salary_revisions_effective_from_index` (`effective_from`),
  CONSTRAINT `salary_revisions_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_revisions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_revisions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `salary_revisions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `salary_revisions_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_revisions_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_structure_components`
--

DROP TABLE IF EXISTS `salary_structure_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_structure_components` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `structure_id` bigint unsigned NOT NULL,
  `component_id` bigint unsigned NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_structure_components_uuid_unique` (`uuid`),
  UNIQUE KEY `salary_structure_components_structure_id_component_id_unique` (`structure_id`,`component_id`),
  KEY `salary_structure_components_created_by_foreign` (`created_by`),
  KEY `salary_structure_components_updated_by_foreign` (`updated_by`),
  KEY `salary_structure_components_organization_id_index` (`organization_id`),
  KEY `salary_structure_components_structure_id_index` (`structure_id`),
  KEY `salary_structure_components_component_id_index` (`component_id`),
  CONSTRAINT `salary_structure_components_component_id_foreign` FOREIGN KEY (`component_id`) REFERENCES `salary_components` (`id`),
  CONSTRAINT `salary_structure_components_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_structure_components_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `salary_structure_components_structure_id_foreign` FOREIGN KEY (`structure_id`) REFERENCES `salary_structures` (`id`),
  CONSTRAINT `salary_structure_components_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_structures`
--

DROP TABLE IF EXISTS `salary_structures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_structures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `structure_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `structure_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `annual_ctc` decimal(15,2) DEFAULT '0.00',
  `basic_monthly` decimal(15,2) DEFAULT '0.00',
  `hra_monthly` decimal(15,2) DEFAULT '0.00',
  `special_allowance_monthly` decimal(15,2) DEFAULT '0.00',
  `gross_monthly` decimal(15,2) DEFAULT '0.00',
  `total_deductions` decimal(15,2) DEFAULT '0.00',
  `pf_deduction` decimal(15,2) DEFAULT '0.00',
  `esi_deduction` decimal(15,2) DEFAULT '0.00',
  `tds_deduction` decimal(15,2) DEFAULT '0.00',
  `net_take_home` decimal(15,2) DEFAULT '0.00',
  `earnings_breakup` json DEFAULT NULL,
  `deductions_breakup` json DEFAULT NULL,
  `cycle_id` bigint unsigned DEFAULT NULL,
  `slab_id` bigint unsigned DEFAULT NULL,
  `custom_components` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_structures_uuid_unique` (`uuid`),
  UNIQUE KEY `salary_structures_organization_id_structure_code_unique` (`organization_id`,`structure_code`),
  KEY `salary_structures_created_by_foreign` (`created_by`),
  KEY `salary_structures_updated_by_foreign` (`updated_by`),
  KEY `salary_structures_organization_id_index` (`organization_id`),
  KEY `salary_structures_status_index` (`status`),
  KEY `salary_structures_cycle_id_foreign` (`cycle_id`),
  KEY `salary_structures_slab_id_foreign` (`slab_id`),
  CONSTRAINT `salary_structures_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_structures_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles` (`id`),
  CONSTRAINT `salary_structures_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `salary_structures_slab_id_foreign` FOREIGN KEY (`slab_id`) REFERENCES `payroll_slabs` (`id`),
  CONSTRAINT `salary_structures_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `setting_versions`
--

DROP TABLE IF EXISTS `setting_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `setting_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `version_number` int NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `change_type` enum('create','update','delete','restore') COLLATE utf8mb4_unicode_ci DEFAULT 'update',
  `changed_by_user_id` bigint unsigned NOT NULL,
  `change_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_versions_uuid_unique` (`uuid`),
  KEY `setting_versions_changed_by_user_id_foreign` (`changed_by_user_id`),
  KEY `setting_versions_organization_id_index` (`organization_id`),
  KEY `setting_versions_entity_type_entity_id_index` (`entity_type`,`entity_id`),
  KEY `setting_versions_change_type_index` (`change_type`),
  KEY `setting_versions_created_at_index` (`created_at`),
  CONSTRAINT `setting_versions_changed_by_user_id_foreign` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `setting_versions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shift_rotations`
--

DROP TABLE IF EXISTS `shift_rotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_rotations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `rotation_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rotation_pattern` json NOT NULL,
  `rotation_duration_days` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shift_rotations_uuid_unique` (`uuid`),
  KEY `shift_rotations_created_by_foreign` (`created_by`),
  KEY `shift_rotations_updated_by_foreign` (`updated_by`),
  KEY `shift_rotations_organization_id_index` (`organization_id`),
  KEY `shift_rotations_created_at_index` (`created_at`),
  CONSTRAINT `shift_rotations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `shift_rotations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `shift_rotations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shift_swap_requests`
--

DROP TABLE IF EXISTS `shift_swap_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_swap_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `request_shift_date` date NOT NULL,
  `requested_shift_id` bigint unsigned NOT NULL,
  `swap_with_employee_id` bigint unsigned NOT NULL,
  `swap_shift_date` date DEFAULT NULL,
  `swap_shift_id` bigint unsigned DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `workflow_instance_id` bigint unsigned DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shift_swap_requests_uuid_unique` (`uuid`),
  KEY `shift_swap_requests_swap_with_employee_id_foreign` (`swap_with_employee_id`),
  KEY `shift_swap_requests_requested_shift_id_foreign` (`requested_shift_id`),
  KEY `shift_swap_requests_swap_shift_id_foreign` (`swap_shift_id`),
  KEY `shift_swap_requests_workflow_instance_id_foreign` (`workflow_instance_id`),
  KEY `shift_swap_requests_approved_by_foreign` (`approved_by`),
  KEY `shift_swap_requests_created_by_foreign` (`created_by`),
  KEY `shift_swap_requests_updated_by_foreign` (`updated_by`),
  KEY `shift_swap_requests_organization_id_index` (`organization_id`),
  KEY `shift_swap_requests_employee_id_index` (`employee_id`),
  KEY `shift_swap_requests_status_index` (`status`),
  KEY `shift_swap_requests_request_shift_date_index` (`request_shift_date`),
  CONSTRAINT `shift_swap_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `shift_swap_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `shift_swap_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `shift_swap_requests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `shift_swap_requests_requested_shift_id_foreign` FOREIGN KEY (`requested_shift_id`) REFERENCES `shift_templates` (`id`),
  CONSTRAINT `shift_swap_requests_swap_shift_id_foreign` FOREIGN KEY (`swap_shift_id`) REFERENCES `shift_templates` (`id`),
  CONSTRAINT `shift_swap_requests_swap_with_employee_id_foreign` FOREIGN KEY (`swap_with_employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `shift_swap_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `shift_swap_requests_workflow_instance_id_foreign` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shift_templates`
--

DROP TABLE IF EXISTS `shift_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned NOT NULL DEFAULT '1',
  `company_id` bigint unsigned DEFAULT NULL,
  `shift_name` varchar(100) NOT NULL,
  `shift_code` varchar(50) NOT NULL,
  `shift_type` enum('fixed','flexible','night','roster') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'fixed',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `duration_hours` decimal(5,2) DEFAULT '8.00',
  `grace_period_minutes` int DEFAULT '15',
  `break_duration_minutes` int DEFAULT '60',
  `is_night_shift` tinyint(1) DEFAULT '0',
  `is_flexible` tinyint(1) DEFAULT '0',
  `flexible_start_range_start` time DEFAULT NULL,
  `flexible_start_range_end` time DEFAULT NULL,
  `color` varchar(20) DEFAULT '#10B981',
  `description` text,
  `roster_pattern` text,
  `is_default` tinyint(1) DEFAULT '0',
  `status` varchar(20) DEFAULT 'active',
  `created_by` int DEFAULT '1',
  `updated_by` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shift_templates_uuid_unique` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `skill_aliases`
--

DROP TABLE IF EXISTS `skill_aliases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_aliases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `skill_id` int unsigned NOT NULL,
  `alias` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `skill_aliases_uuid_unique` (`uuid`),
  KEY `skill_aliases_skill_id_index` (`skill_id`),
  KEY `skill_aliases_alias_index` (`alias`),
  KEY `skill_aliases_organization_id_index` (`organization_id`),
  CONSTRAINT `skill_aliases_skill_id_foreign` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` int unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(100) DEFAULT 'Technical',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `skills_uuid_unique` (`uuid`),
  KEY `skills_organization_id_index` (`organization_id`),
  KEY `skills_name_index` (`name`),
  KEY `skills_category_index` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `software_licenses`
--

DROP TABLE IF EXISTS `software_licenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `software_licenses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `software_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_type` enum('perpetual','subscription','trial') COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_licenses` int NOT NULL,
  `used_licenses` int DEFAULT '0',
  `purchase_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `cost` decimal(15,2) DEFAULT NULL,
  `vendor_id` int unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','expired','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `software_licenses_uuid_unique` (`uuid`),
  KEY `software_licenses_vendor_id_foreign` (`vendor_id`),
  KEY `software_licenses_organization_id_software_name_index` (`organization_id`,`software_name`),
  KEY `software_licenses_organization_id_status_index` (`organization_id`,`status`),
  KEY `software_licenses_organization_id_expiry_date_index` (`organization_id`,`expiry_date`),
  KEY `software_licenses_organization_id_deleted_at_index` (`organization_id`,`deleted_at`),
  CONSTRAINT `software_licenses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `software_licenses_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `asset_vendors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sso_identities`
--

DROP TABLE IF EXISTS `sso_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sso_identities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `provider` enum('google','microsoft') COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_token_encrypted` text COLLATE utf8mb4_unicode_ci,
  `refresh_token_encrypted` text COLLATE utf8mb4_unicode_ci,
  `raw_profile` json DEFAULT NULL,
  `linked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sso_identities_provider_provider_user_id_unique` (`provider`,`provider_user_id`),
  KEY `sso_identities_user_id_index` (`user_id`),
  KEY `sso_identities_organization_id_index` (`organization_id`),
  CONSTRAINT `sso_identities_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sso_identities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `billing_cycle` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'monthly',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `modules` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `succession_positions`
--

DROP TABLE IF EXISTS `succession_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `succession_positions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `position_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `critical` tinyint(1) DEFAULT '0',
  `num_successors` int DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `succession_positions_uuid_unique` (`uuid`),
  KEY `succession_positions_created_by_foreign` (`created_by`),
  KEY `succession_positions_updated_by_foreign` (`updated_by`),
  KEY `succession_positions_organization_id_index` (`organization_id`),
  KEY `succession_positions_critical_index` (`critical`),
  CONSTRAINT `succession_positions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `succession_positions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `succession_positions_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `successors`
--

DROP TABLE IF EXISTS `successors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `successors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `position_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `readiness_level` enum('not_ready','emerging','ready_now','high_potential') COLLATE utf8mb4_unicode_ci DEFAULT 'not_ready',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `successors_uuid_unique` (`uuid`),
  KEY `successors_created_by_foreign` (`created_by`),
  KEY `successors_updated_by_foreign` (`updated_by`),
  KEY `successors_organization_id_index` (`organization_id`),
  KEY `successors_position_id_index` (`position_id`),
  KEY `successors_employee_id_index` (`employee_id`),
  KEY `successors_readiness_level_index` (`readiness_level`),
  CONSTRAINT `successors_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `successors_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `successors_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `successors_position_id_foreign` FOREIGN KEY (`position_id`) REFERENCES `succession_positions` (`id`),
  CONSTRAINT `successors_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suggestion_attachments`
--

DROP TABLE IF EXISTS `suggestion_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suggestion_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `suggestion_id` bigint unsigned NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `suggestion_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `suggestion_attachments_suggestion_id_index` (`suggestion_id`),
  CONSTRAINT `suggestion_attachments_suggestion_id_foreign` FOREIGN KEY (`suggestion_id`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `suggestion_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suggestion_comments`
--

DROP TABLE IF EXISTS `suggestion_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suggestion_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suggestion_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned NOT NULL,
  `comment_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suggestion_comments_uuid_unique` (`uuid`),
  KEY `suggestion_comments_created_by_foreign` (`created_by`),
  KEY `suggestion_comments_updated_by_foreign` (`updated_by`),
  KEY `suggestion_comments_suggestion_id_index` (`suggestion_id`),
  KEY `suggestion_comments_author_id_index` (`author_id`),
  CONSTRAINT `suggestion_comments_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `suggestion_comments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `suggestion_comments_suggestion_id_foreign` FOREIGN KEY (`suggestion_id`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `suggestion_comments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suggestion_votes`
--

DROP TABLE IF EXISTS `suggestion_votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suggestion_votes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `suggestion_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `vote_type` enum('upvote','downvote') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_suggestion_vote_employee` (`suggestion_id`,`employee_id`),
  KEY `suggestion_votes_suggestion_id_index` (`suggestion_id`),
  KEY `suggestion_votes_employee_id_index` (`employee_id`),
  CONSTRAINT `suggestion_votes_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `suggestion_votes_suggestion_id_foreign` FOREIGN KEY (`suggestion_id`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suggestions`
--

DROP TABLE IF EXISTS `suggestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suggestions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `author_id` bigint unsigned DEFAULT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` enum('process','workplace','product','cost_saving','innovation','culture','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `submission_type` enum('anonymous','public','private') COLLATE utf8mb4_unicode_ci DEFAULT 'public',
  `status` enum('submitted','under_review','approved','rejected','implemented','duplicate') COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `visibility_level` enum('private','department','all') COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `upvote_count` int unsigned DEFAULT '0',
  `downvote_count` int unsigned DEFAULT '0',
  `impact_score` decimal(5,2) DEFAULT NULL,
  `implementation_priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_to_user_id` bigint unsigned DEFAULT NULL,
  `hr_response` text COLLATE utf8mb4_unicode_ci,
  `hr_responded_by` bigint unsigned DEFAULT NULL,
  `hr_responded_at` datetime DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `implementation_date` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suggestions_uuid_unique` (`uuid`),
  KEY `suggestions_assigned_to_user_id_foreign` (`assigned_to_user_id`),
  KEY `suggestions_hr_responded_by_foreign` (`hr_responded_by`),
  KEY `suggestions_created_by_foreign` (`created_by`),
  KEY `suggestions_updated_by_foreign` (`updated_by`),
  KEY `suggestions_organization_id_index` (`organization_id`),
  KEY `idx_suggestions_org_status_date` (`organization_id`,`status`,`created_at`),
  KEY `suggestions_author_id_index` (`author_id`),
  KEY `suggestions_implementation_priority_index` (`implementation_priority`),
  KEY `idx_suggestions_trending` (`upvote_count`,`created_at`),
  CONSTRAINT `suggestions_assigned_to_user_id_foreign` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `suggestions_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `suggestions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `suggestions_hr_responded_by_foreign` FOREIGN KEY (`hr_responded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `suggestions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `suggestions_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `super_admins`
--

DROP TABLE IF EXISTS `super_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `super_admins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Super',
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Admin',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `access_level` enum('owner','superadmin','auditor') COLLATE utf8mb4_unicode_ci DEFAULT 'superadmin',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  KEY `user_id` (`user_id`),
  KEY `email_2` (`email`),
  KEY `status` (`status`),
  CONSTRAINT `super_admins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `survey_analytics_cache`
--

DROP TABLE IF EXISTS `survey_analytics_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_analytics_cache` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `survey_id` bigint unsigned NOT NULL,
  `metric_type` enum('completion_rate','by_department','by_branch','by_gender','by_role') COLLATE utf8mb4_unicode_ci NOT NULL,
  `metric_value` json DEFAULT NULL,
  `cached_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_survey_metric` (`survey_id`,`metric_type`),
  CONSTRAINT `survey_analytics_cache_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `survey_answers`
--

DROP TABLE IF EXISTS `survey_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_answers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `response_id` bigint unsigned NOT NULL,
  `question_id` bigint unsigned NOT NULL,
  `answer_value` json DEFAULT NULL,
  `answered_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_answers_response_id_index` (`response_id`),
  KEY `idx_survey_answers_response_question` (`response_id`,`question_id`),
  KEY `survey_answers_question_id_index` (`question_id`),
  CONSTRAINT `survey_answers_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `survey_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_answers_response_id_foreign` FOREIGN KEY (`response_id`) REFERENCES `survey_responses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `survey_questions`
--

DROP TABLE IF EXISTS `survey_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `survey_id` bigint unsigned NOT NULL,
  `question_text` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('short_text','long_text','rating','nps','multiple_choice','checkbox','matrix','ranking','date','file_upload') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_required` tinyint(1) DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `min_scale` int unsigned DEFAULT NULL,
  `max_scale` int unsigned DEFAULT NULL,
  `scale_labels` json DEFAULT NULL,
  `options` json DEFAULT NULL,
  `matrix_rows` json DEFAULT NULL,
  `matrix_columns` json DEFAULT NULL,
  `file_accept_types` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_file_size` bigint unsigned DEFAULT NULL,
  `branching_logic_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `survey_questions_survey_id_index` (`survey_id`),
  KEY `idx_survey_questions_order` (`survey_id`,`sort_order`),
  CONSTRAINT `survey_questions_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `survey_reminders`
--

DROP TABLE IF EXISTS `survey_reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_reminders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `survey_id` bigint unsigned NOT NULL,
  `recipient_employee_id` bigint unsigned DEFAULT NULL,
  `scheduled_send_at` datetime NOT NULL,
  `sent_at` datetime DEFAULT NULL,
  `status` enum('pending','sent','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `survey_reminders_recipient_employee_id_foreign` (`recipient_employee_id`),
  KEY `survey_reminders_survey_id_index` (`survey_id`),
  KEY `idx_reminders_pending` (`scheduled_send_at`,`status`),
  CONSTRAINT `survey_reminders_recipient_employee_id_foreign` FOREIGN KEY (`recipient_employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_reminders_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `survey_responses`
--

DROP TABLE IF EXISTS `survey_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_responses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned DEFAULT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `survey_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `role_id` bigint unsigned DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `is_complete` tinyint(1) DEFAULT '0',
  `completion_time_seconds` int unsigned DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `survey_responses_uuid_unique` (`uuid`),
  UNIQUE KEY `uq_survey_response_employee` (`survey_id`,`employee_id`),
  KEY `survey_responses_branch_id_foreign` (`branch_id`),
  KEY `survey_responses_survey_id_index` (`survey_id`),
  KEY `idx_survey_responses_date` (`survey_id`,`submitted_at`),
  KEY `survey_responses_employee_id_index` (`employee_id`),
  KEY `survey_responses_is_complete_index` (`is_complete`),
  KEY `idx_survey_responses_dept` (`department_id`,`submitted_at`),
  CONSTRAINT `survey_responses_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `survey_responses_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `survey_responses_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `survey_responses_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `surveys`
--

DROP TABLE IF EXISTS `surveys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `surveys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `survey_type` enum('standard','pulse','enps') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `status` enum('draft','scheduled','active','closed','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `is_anonymous` tinyint(1) DEFAULT '0',
  `visibility_level` enum('public','department','team','branch','private') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `visible_to_department_ids` json DEFAULT NULL,
  `visible_to_team_ids` json DEFAULT NULL,
  `visible_to_branch_ids` json DEFAULT NULL,
  `visible_to_role_ids` json DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `recurrence_pattern` enum('once','weekly','biweekly','monthly','quarterly','custom') COLLATE utf8mb4_unicode_ci DEFAULT 'once',
  `recurrence_custom_days` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recurrence_end_date` datetime DEFAULT NULL,
  `send_reminders` tinyint(1) DEFAULT '0',
  `reminder_frequency` enum('daily','2_days','3_days','weekly') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `show_progress_bar` tinyint(1) DEFAULT '1',
  `randomize_questions` tinyint(1) DEFAULT '0',
  `show_branching_logic` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `total_responses` int unsigned DEFAULT '0',
  `completed_responses` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `surveys_uuid_unique` (`uuid`),
  KEY `surveys_created_by_foreign` (`created_by`),
  KEY `surveys_updated_by_foreign` (`updated_by`),
  KEY `surveys_organization_id_index` (`organization_id`),
  KEY `idx_surveys_org_status_date` (`organization_id`,`status`,`starts_at`),
  KEY `surveys_survey_type_index` (`survey_type`),
  KEY `surveys_scheduled_at_index` (`scheduled_at`),
  KEY `idx_surveys_active` (`status`,`ends_at`),
  CONSTRAINT `surveys_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `surveys_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `surveys_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `talent_matrix`
--

DROP TABLE IF EXISTS `talent_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `talent_matrix` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `performance_rating` decimal(5,2) NOT NULL,
  `potential_rating` decimal(5,2) NOT NULL,
  `quadrant` enum('emerging','solid_performer','rising_star','superstar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `talent_matrix_uuid_unique` (`uuid`),
  KEY `talent_matrix_created_by_foreign` (`created_by`),
  KEY `talent_matrix_organization_id_index` (`organization_id`),
  KEY `talent_matrix_employee_id_index` (`employee_id`),
  KEY `talent_matrix_quadrant_index` (`quadrant`),
  CONSTRAINT `talent_matrix_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `talent_matrix_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `talent_matrix_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_declarations`
--

DROP TABLE IF EXISTS `tax_declarations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_declarations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `financial_year` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pan_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declaration_date` date NOT NULL,
  `status` enum('pending','declared','finalized') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_declarations_uuid_unique` (`uuid`),
  UNIQUE KEY `tax_declarations_org_emp_year_unique` (`organization_id`,`employee_id`,`financial_year`),
  KEY `tax_declarations_created_by_foreign` (`created_by`),
  KEY `tax_declarations_updated_by_foreign` (`updated_by`),
  KEY `tax_declarations_organization_id_index` (`organization_id`),
  KEY `tax_declarations_employee_id_index` (`employee_id`),
  KEY `tax_declarations_financial_year_index` (`financial_year`),
  CONSTRAINT `tax_declarations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `tax_declarations_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `tax_declarations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `tax_declarations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_investments`
--

DROP TABLE IF EXISTS `tax_investments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_investments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `tax_declaration_id` bigint unsigned NOT NULL,
  `investment_type` enum('80c','80d','80tta','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `investment_amount` decimal(15,2) NOT NULL,
  `investment_proof_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_investments_uuid_unique` (`uuid`),
  KEY `tax_investments_created_by_foreign` (`created_by`),
  KEY `tax_investments_updated_by_foreign` (`updated_by`),
  KEY `tax_investments_organization_id_index` (`organization_id`),
  KEY `tax_investments_tax_declaration_id_index` (`tax_declaration_id`),
  KEY `tax_investments_investment_type_index` (`investment_type`),
  CONSTRAINT `tax_investments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `tax_investments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `tax_investments_tax_declaration_id_foreign` FOREIGN KEY (`tax_declaration_id`) REFERENCES `tax_declarations` (`id`),
  CONSTRAINT `tax_investments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `timesheet_entries`
--

DROP TABLE IF EXISTS `timesheet_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timesheet_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `timesheet_id` bigint unsigned NOT NULL,
  `entry_date` date NOT NULL,
  `project_id` bigint unsigned DEFAULT NULL,
  `task_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_description` text COLLATE utf8mb4_unicode_ci,
  `hours_spent` decimal(4,2) NOT NULL,
  `is_billable` tinyint(1) DEFAULT '1',
  `billable_rate` decimal(8,2) DEFAULT NULL,
  `effort_category` enum('development','design','qa','documentation','support') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entry_status` enum('draft','submitted') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `timesheet_entries_uuid_unique` (`uuid`),
  KEY `timesheet_entries_created_by_foreign` (`created_by`),
  KEY `timesheet_entries_updated_by_foreign` (`updated_by`),
  KEY `timesheet_entries_organization_id_index` (`organization_id`),
  KEY `timesheet_entries_timesheet_id_index` (`timesheet_id`),
  KEY `timesheet_entries_entry_date_index` (`entry_date`),
  KEY `timesheet_entries_entry_status_index` (`entry_status`),
  CONSTRAINT `timesheet_entries_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `timesheet_entries_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `timesheet_entries_timesheet_id_foreign` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets` (`id`),
  CONSTRAINT `timesheet_entries_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `timesheets`
--

DROP TABLE IF EXISTS `timesheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timesheets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `timesheet_period_start` date NOT NULL,
  `timesheet_period_end` date NOT NULL,
  `total_hours` decimal(6,2) DEFAULT '0.00',
  `billable_hours` decimal(6,2) DEFAULT '0.00',
  `non_billable_hours` decimal(6,2) DEFAULT '0.00',
  `status` enum('draft','submitted','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `submitted_by` bigint unsigned DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `timesheets_uuid_unique` (`uuid`),
  UNIQUE KEY `timesheets_org_emp_period_unique` (`organization_id`,`employee_id`,`timesheet_period_start`,`timesheet_period_end`),
  KEY `timesheets_submitted_by_foreign` (`submitted_by`),
  KEY `timesheets_approved_by_foreign` (`approved_by`),
  KEY `timesheets_created_by_foreign` (`created_by`),
  KEY `timesheets_updated_by_foreign` (`updated_by`),
  KEY `timesheets_organization_id_index` (`organization_id`),
  KEY `timesheets_employee_id_index` (`employee_id`),
  KEY `timesheets_status_index` (`status`),
  KEY `timesheets_timesheet_period_start_index` (`timesheet_period_start`),
  CONSTRAINT `timesheets_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `timesheets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `timesheets_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `timesheets_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `timesheets_submitted_by_foreign` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `timesheets_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transfers`
--

DROP TABLE IF EXISTS `transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `from_department` varchar(100) DEFAULT NULL,
  `to_department` varchar(100) DEFAULT NULL,
  `from_branch` varchar(100) DEFAULT NULL,
  `to_branch` varchar(100) DEFAULT NULL,
  `from_reporting_manager_id` bigint unsigned DEFAULT NULL,
  `to_reporting_manager_id` bigint unsigned DEFAULT NULL,
  `transfer_type` varchar(50) DEFAULT 'lateral',
  `transfer_date` date NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `approval_status` varchar(50) DEFAULT 'pending',
  `reason` text,
  `approved_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfers_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `travel_advances`
--

DROP TABLE IF EXISTS `travel_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `travel_advances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `advance_number` varchar(50) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `travel_request_id` bigint unsigned DEFAULT NULL,
  `advance_amount` decimal(15,2) DEFAULT '0.00',
  `approved_amount` decimal(15,2) DEFAULT '0.00',
  `settled_amount` decimal(15,2) DEFAULT '0.00',
  `balance_amount` decimal(15,2) DEFAULT '0.00',
  `purpose` text,
  `status` varchar(50) DEFAULT 'requested',
  `disbursed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_by_user_id` bigint unsigned DEFAULT NULL,
  `submitted_by_role` varchar(50) DEFAULT NULL,
  `finance_approver_id` bigint unsigned DEFAULT NULL,
  `finance_notes` text,
  `rejection_reason` text,
  `finance_approved_at` timestamp NULL DEFAULT NULL,
  `current_level` int DEFAULT '1',
  `current_approver_role` varchar(255) DEFAULT NULL,
  `workflow_id` bigint unsigned DEFAULT NULL,
  `approval_run_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_advances_uuid_unique` (`uuid`),
  UNIQUE KEY `travel_advances_advance_number_unique` (`advance_number`),
  KEY `travel_advances_organization_id_index` (`organization_id`),
  KEY `travel_advances_employee_id_index` (`employee_id`),
  KEY `travel_advances_status_index` (`status`),
  KEY `travel_advances_approval_run_id_index` (`approval_run_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `travel_requests`
--

DROP TABLE IF EXISTS `travel_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `travel_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `request_number` varchar(50) NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `from_location` varchar(150) NOT NULL,
  `to_location` varchar(150) NOT NULL,
  `purpose` text NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `estimated_budget` decimal(15,2) DEFAULT '0.00',
  `status` varchar(50) DEFAULT 'pending',
  `approver_id` bigint unsigned DEFAULT NULL,
  `approver_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_by_user_id` bigint unsigned DEFAULT NULL,
  `current_level` int DEFAULT '1',
  `current_approver_role` varchar(255) DEFAULT NULL,
  `workflow_id` bigint unsigned DEFAULT NULL,
  `submitted_by_role` varchar(50) DEFAULT NULL,
  `rejection_reason` text,
  `approval_run_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_requests_uuid_unique` (`uuid`),
  UNIQUE KEY `travel_requests_request_number_unique` (`request_number`),
  KEY `travel_requests_organization_id_index` (`organization_id`),
  KEY `travel_requests_employee_id_index` (`employee_id`),
  KEY `travel_requests_status_index` (`status`),
  KEY `travel_requests_approval_run_id_index` (`approval_run_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `assigned_by` bigint unsigned NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_id_unique` (`user_id`,`role_id`),
  KEY `user_roles_assigned_by_foreign` (`assigned_by`),
  KEY `user_roles_organization_id_index` (`organization_id`),
  KEY `user_roles_user_id_index` (`user_id`),
  KEY `user_roles_role_id_index` (`role_id`),
  CONSTRAINT `user_roles_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `user_roles_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=797 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_country_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','suspended','deleted') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `mobile_verified_at` timestamp NULL DEFAULT NULL,
  `mfa_enabled` tinyint(1) DEFAULT '0',
  `mfa_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mfa_recovery_codes` json DEFAULT NULL,
  `failed_login_attempts` int DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_password_changed_at` timestamp NULL DEFAULT NULL,
  `must_change_password` tinyint(1) DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` longtext COLLATE utf8mb4_unicode_ci,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `designation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `policy_accepted` tinyint(1) NOT NULL DEFAULT '0',
  `policy_accepted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_uuid_unique` (`uuid`),
  UNIQUE KEY `users_organization_id_email_unique` (`organization_id`,`email`),
  UNIQUE KEY `users_organization_id_mobile_unique` (`organization_id`,`mobile`),
  KEY `users_created_by_foreign` (`created_by`),
  KEY `users_organization_id_index` (`organization_id`),
  KEY `users_email_index` (`email`),
  KEY `users_status_index` (`status`),
  KEY `users_created_at_index` (`created_at`),
  CONSTRAINT `users_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=682 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_off_rules`
--

DROP TABLE IF EXISTS `weekly_off_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_off_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `calendar_id` bigint unsigned NOT NULL,
  `week_day` varchar(20) NOT NULL,
  `off_type` varchar(20) NOT NULL DEFAULT 'Full Day',
  `is_alternate` tinyint(1) DEFAULT '0',
  `alternate_weeks` varchar(50) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `weekly_off_rules_uuid_unique` (`uuid`),
  KEY `weekly_off_rules_calendar_id_index` (`calendar_id`),
  KEY `weekly_off_rules_week_day_index` (`week_day`),
  CONSTRAINT `weekly_off_rules_calendar_id_foreign` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_policies`
--

DROP TABLE IF EXISTS `work_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `policy_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `policy_type` enum('office','hybrid','remote') COLLATE utf8mb4_unicode_ci DEFAULT 'office',
  `applicable_to_all` tinyint(1) DEFAULT '0',
  `rules` json DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_policies_uuid_unique` (`uuid`),
  KEY `work_policies_created_by_foreign` (`created_by`),
  KEY `work_policies_updated_by_foreign` (`updated_by`),
  KEY `work_policies_organization_id_index` (`organization_id`),
  KEY `work_policies_policy_type_index` (`policy_type`),
  KEY `work_policies_effective_from_index` (`effective_from`),
  KEY `work_policies_status_index` (`status`),
  KEY `work_policies_created_at_index` (`created_at`),
  CONSTRAINT `work_policies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `work_policies_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `work_policies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_actions`
--

DROP TABLE IF EXISTS `workflow_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_actions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `instance_id` bigint unsigned NOT NULL,
  `action_type` enum('email_notification','create_task','update_field','call_webhook') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_params` json DEFAULT NULL,
  `status` enum('pending','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `executed_at` timestamp NULL DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_actions_uuid_unique` (`uuid`),
  KEY `workflow_actions_organization_id_index` (`organization_id`),
  KEY `workflow_actions_instance_id_index` (`instance_id`),
  KEY `workflow_actions_action_type_index` (`action_type`),
  KEY `workflow_actions_status_index` (`status`),
  KEY `workflow_actions_created_at_index` (`created_at`),
  CONSTRAINT `workflow_actions_instance_id_foreign` FOREIGN KEY (`instance_id`) REFERENCES `workflow_instances` (`id`),
  CONSTRAINT `workflow_actions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_approvals`
--

DROP TABLE IF EXISTS `workflow_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_approvals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `organization_id` int NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `module_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int NOT NULL,
  `applicant_id` int NOT NULL,
  `approver_role` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approver_id` int DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_approvals_uuid_unique` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_conditions`
--

DROP TABLE IF EXISTS `workflow_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_conditions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `condition_type` enum('field_value','numeric_comparison','date_comparison','approval_count') COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator` enum('equals','not_equals','greater_than','less_than','in_list','contains') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `next_step_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_conditions_uuid_unique` (`uuid`),
  KEY `workflow_conditions_next_step_id_foreign` (`next_step_id`),
  KEY `workflow_conditions_created_by_foreign` (`created_by`),
  KEY `workflow_conditions_updated_by_foreign` (`updated_by`),
  KEY `workflow_conditions_organization_id_index` (`organization_id`),
  KEY `workflow_conditions_workflow_id_index` (`workflow_id`),
  KEY `workflow_conditions_condition_type_index` (`condition_type`),
  KEY `workflow_conditions_created_at_index` (`created_at`),
  CONSTRAINT `workflow_conditions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_conditions_next_step_id_foreign` FOREIGN KEY (`next_step_id`) REFERENCES `workflow_steps` (`id`),
  CONSTRAINT `workflow_conditions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_conditions_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_conditions_workflow_id_foreign` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_delegations`
--

DROP TABLE IF EXISTS `workflow_delegations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_delegations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `instance_step_id` bigint unsigned NOT NULL,
  `delegated_from_user_id` bigint unsigned NOT NULL,
  `delegated_to_user_id` bigint unsigned NOT NULL,
  `delegation_reason` text COLLATE utf8mb4_unicode_ci,
  `delegation_start_date` date NOT NULL,
  `delegation_end_date` date NOT NULL,
  `status` enum('active','expired','revoked') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_delegations_uuid_unique` (`uuid`),
  KEY `workflow_delegations_created_by_foreign` (`created_by`),
  KEY `workflow_delegations_updated_by_foreign` (`updated_by`),
  KEY `workflow_delegations_organization_id_index` (`organization_id`),
  KEY `workflow_delegations_instance_step_id_index` (`instance_step_id`),
  KEY `workflow_delegations_delegated_from_user_id_index` (`delegated_from_user_id`),
  KEY `workflow_delegations_delegated_to_user_id_index` (`delegated_to_user_id`),
  KEY `workflow_delegations_status_index` (`status`),
  KEY `workflow_delegations_created_at_index` (`created_at`),
  CONSTRAINT `workflow_delegations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_delegations_delegated_from_user_id_foreign` FOREIGN KEY (`delegated_from_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_delegations_delegated_to_user_id_foreign` FOREIGN KEY (`delegated_to_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_delegations_instance_step_id_foreign` FOREIGN KEY (`instance_step_id`) REFERENCES `workflow_instance_steps` (`id`),
  CONSTRAINT `workflow_delegations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_delegations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_escalations`
--

DROP TABLE IF EXISTS `workflow_escalations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_escalations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `instance_step_id` bigint unsigned NOT NULL,
  `escalated_from_user_id` bigint unsigned NOT NULL,
  `escalated_to_user_id` bigint unsigned NOT NULL,
  `escalation_level` int NOT NULL,
  `escalation_reason` text COLLATE utf8mb4_unicode_ci,
  `escalation_date` timestamp NOT NULL,
  `status` enum('pending','resolved') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_escalations_uuid_unique` (`uuid`),
  KEY `workflow_escalations_escalated_from_user_id_foreign` (`escalated_from_user_id`),
  KEY `workflow_escalations_escalated_to_user_id_foreign` (`escalated_to_user_id`),
  KEY `workflow_escalations_created_by_foreign` (`created_by`),
  KEY `workflow_escalations_updated_by_foreign` (`updated_by`),
  KEY `workflow_escalations_organization_id_index` (`organization_id`),
  KEY `workflow_escalations_instance_step_id_index` (`instance_step_id`),
  KEY `workflow_escalations_escalation_level_index` (`escalation_level`),
  KEY `workflow_escalations_status_index` (`status`),
  KEY `workflow_escalations_created_at_index` (`created_at`),
  CONSTRAINT `workflow_escalations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_escalations_escalated_from_user_id_foreign` FOREIGN KEY (`escalated_from_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_escalations_escalated_to_user_id_foreign` FOREIGN KEY (`escalated_to_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_escalations_instance_step_id_foreign` FOREIGN KEY (`instance_step_id`) REFERENCES `workflow_instance_steps` (`id`),
  CONSTRAINT `workflow_escalations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_escalations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_history`
--

DROP TABLE IF EXISTS `workflow_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `instance_id` bigint unsigned NOT NULL,
  `action` enum('created','step_assigned','approved','rejected','delegated','escalated','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned NOT NULL,
  `actor_role` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_changes` json DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_history_uuid_unique` (`uuid`),
  KEY `workflow_history_organization_id_index` (`organization_id`),
  KEY `workflow_history_instance_id_index` (`instance_id`),
  KEY `workflow_history_action_index` (`action`),
  KEY `workflow_history_actor_id_index` (`actor_id`),
  KEY `workflow_history_timestamp_index` (`timestamp`),
  CONSTRAINT `workflow_history_actor_id_foreign` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_history_instance_id_foreign` FOREIGN KEY (`instance_id`) REFERENCES `workflow_instances` (`id`),
  CONSTRAINT `workflow_history_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_instance_steps`
--

DROP TABLE IF EXISTS `workflow_instance_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_instance_steps` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `instance_id` bigint unsigned NOT NULL,
  `step_id` bigint unsigned NOT NULL,
  `step_number` int NOT NULL,
  `status` enum('pending','approved','rejected','skipped','in_progress') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approver_id` bigint unsigned DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `approval_action` enum('approve','reject','delegate','escalate') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approval_comment` text COLLATE utf8mb4_unicode_ci,
  `approver_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_instance_steps_uuid_unique` (`uuid`),
  UNIQUE KEY `workflow_instance_steps_instance_id_step_number_unique` (`instance_id`,`step_number`),
  KEY `workflow_instance_steps_step_id_foreign` (`step_id`),
  KEY `workflow_instance_steps_created_by_foreign` (`created_by`),
  KEY `workflow_instance_steps_updated_by_foreign` (`updated_by`),
  KEY `workflow_instance_steps_organization_id_index` (`organization_id`),
  KEY `workflow_instance_steps_instance_id_index` (`instance_id`),
  KEY `workflow_instance_steps_approver_id_index` (`approver_id`),
  KEY `workflow_instance_steps_status_index` (`status`),
  KEY `workflow_instance_steps_created_at_index` (`created_at`),
  CONSTRAINT `workflow_instance_steps_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_instance_steps_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_instance_steps_instance_id_foreign` FOREIGN KEY (`instance_id`) REFERENCES `workflow_instances` (`id`),
  CONSTRAINT `workflow_instance_steps_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_instance_steps_step_id_foreign` FOREIGN KEY (`step_id`) REFERENCES `workflow_steps` (`id`),
  CONSTRAINT `workflow_instance_steps_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_instances`
--

DROP TABLE IF EXISTS `workflow_instances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_instances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `initiator_id` bigint unsigned NOT NULL,
  `status` enum('pending','approved','rejected','cancelled','reopened') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `current_step_number` int DEFAULT NULL,
  `approval_count` int DEFAULT '0',
  `rejection_count` int DEFAULT '0',
  `started_at` timestamp NOT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `completion_status` enum('approved','rejected','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_instances_uuid_unique` (`uuid`),
  KEY `workflow_instances_created_by_foreign` (`created_by`),
  KEY `workflow_instances_updated_by_foreign` (`updated_by`),
  KEY `workflow_instances_organization_id_index` (`organization_id`),
  KEY `workflow_instances_workflow_id_index` (`workflow_id`),
  KEY `workflow_instances_entity_type_index` (`entity_type`),
  KEY `workflow_instances_status_index` (`status`),
  KEY `workflow_instances_initiator_id_index` (`initiator_id`),
  KEY `workflow_instances_created_at_index` (`created_at`),
  CONSTRAINT `workflow_instances_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_instances_initiator_id_foreign` FOREIGN KEY (`initiator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_instances_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_instances_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_instances_workflow_id_foreign` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_rules`
--

DROP TABLE IF EXISTS `workflow_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `rule_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_description` text COLLATE utf8mb4_unicode_ci,
  `rule_type` enum('auto_approval','auto_rejection','skip_step','escalation_trigger') COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_json` json NOT NULL,
  `action_json` json NOT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_rules_uuid_unique` (`uuid`),
  KEY `workflow_rules_created_by_foreign` (`created_by`),
  KEY `workflow_rules_updated_by_foreign` (`updated_by`),
  KEY `workflow_rules_organization_id_index` (`organization_id`),
  KEY `workflow_rules_workflow_id_index` (`workflow_id`),
  KEY `workflow_rules_rule_type_index` (`rule_type`),
  KEY `workflow_rules_is_enabled_index` (`is_enabled`),
  KEY `workflow_rules_created_at_index` (`created_at`),
  CONSTRAINT `workflow_rules_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_rules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_rules_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_rules_workflow_id_foreign` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_steps`
--

DROP TABLE IF EXISTS `workflow_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_steps` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `step_number` int NOT NULL,
  `step_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_description` text COLLATE utf8mb4_unicode_ci,
  `approval_mode` enum('single_person','any_one_person','all_people','manager_chain','department_head','role_based','dynamic_resolver') COLLATE utf8mb4_unicode_ci DEFAULT 'single_person',
  `approver_type` enum('specific_user','user_role','reporting_manager','department_head','dynamic_group') COLLATE utf8mb4_unicode_ci NOT NULL,
  `approver_id` bigint unsigned DEFAULT NULL,
  `approver_role_id` bigint unsigned DEFAULT NULL,
  `max_approvers` int DEFAULT NULL,
  `can_delegate` tinyint(1) DEFAULT '1',
  `can_reject` tinyint(1) DEFAULT '1',
  `can_reassign` tinyint(1) DEFAULT '1',
  `timeout_days` int DEFAULT NULL,
  `sla_days` int DEFAULT NULL,
  `is_final_step` tinyint(1) DEFAULT '0',
  `action_on_approval` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'approve_workflow',
  `action_on_rejection` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'terminate_workflow',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `approver_department_id` bigint unsigned DEFAULT NULL,
  `form_permissions` text COLLATE utf8mb4_unicode_ci,
  `escalation_config` text COLLATE utf8mb4_unicode_ci,
  `notification_config` text COLLATE utf8mb4_unicode_ci,
  `resolver_config` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_steps_uuid_unique` (`uuid`),
  UNIQUE KEY `workflow_steps_workflow_id_step_number_unique` (`workflow_id`,`step_number`),
  KEY `workflow_steps_approver_id_foreign` (`approver_id`),
  KEY `workflow_steps_approver_role_id_foreign` (`approver_role_id`),
  KEY `workflow_steps_created_by_foreign` (`created_by`),
  KEY `workflow_steps_updated_by_foreign` (`updated_by`),
  KEY `workflow_steps_organization_id_index` (`organization_id`),
  KEY `workflow_steps_workflow_id_index` (`workflow_id`),
  KEY `workflow_steps_approver_type_index` (`approver_type`),
  KEY `workflow_steps_created_at_index` (`created_at`),
  CONSTRAINT `workflow_steps_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_steps_approver_role_id_foreign` FOREIGN KEY (`approver_role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `workflow_steps_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_steps_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_steps_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_steps_workflow_id_foreign` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=214 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_templates`
--

DROP TABLE IF EXISTS `workflow_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_description` text COLLATE utf8mb4_unicode_ci,
  `category` enum('leave','expense','recruitment','hr','finance','operations') COLLATE utf8mb4_unicode_ci DEFAULT 'operations',
  `is_default` tinyint(1) DEFAULT '0',
  `template_data` json NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_templates_uuid_unique` (`uuid`),
  KEY `workflow_templates_created_by_foreign` (`created_by`),
  KEY `workflow_templates_updated_by_foreign` (`updated_by`),
  KEY `workflow_templates_organization_id_index` (`organization_id`),
  KEY `workflow_templates_category_index` (`category`),
  KEY `workflow_templates_is_default_index` (`is_default`),
  KEY `workflow_templates_created_at_index` (`created_at`),
  CONSTRAINT `workflow_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_versions`
--

DROP TABLE IF EXISTS `workflow_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_id` bigint unsigned NOT NULL,
  `version_number` int NOT NULL,
  `status` enum('draft','published') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `published_by` bigint unsigned DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_versions_uuid_unique` (`uuid`),
  UNIQUE KEY `workflow_versions_workflow_id_version_number_unique` (`workflow_id`,`version_number`),
  KEY `workflow_versions_created_by_foreign` (`created_by`),
  KEY `workflow_versions_published_by_foreign` (`published_by`),
  KEY `workflow_versions_organization_id_index` (`organization_id`),
  KEY `workflow_versions_workflow_id_index` (`workflow_id`),
  KEY `workflow_versions_status_index` (`status`),
  KEY `workflow_versions_created_at_index` (`created_at`),
  CONSTRAINT `workflow_versions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_versions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflow_versions_published_by_foreign` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflow_versions_workflow_id_foreign` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflows`
--

DROP TABLE IF EXISTS `workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflows` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `company_id` bigint unsigned DEFAULT NULL,
  `workflow_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflow_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `version_number` int DEFAULT '1',
  `is_published` tinyint(1) DEFAULT '0',
  `published_by` bigint unsigned DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `approval_pattern` enum('sequential','parallel','conditional') COLLATE utf8mb4_unicode_ci DEFAULT 'sequential',
  `max_escalation_levels` int DEFAULT '3',
  `sla_days` int DEFAULT NULL,
  `notify_on_completion` tinyint(1) DEFAULT '1',
  `auto_approve_after_days` int DEFAULT NULL,
  `auto_reject_after_days` int DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `approval_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `is_active` tinyint(1) DEFAULT '1',
  `applicability_filters` text COLLATE utf8mb4_unicode_ci,
  `expense_config` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflows_uuid_unique` (`uuid`),
  UNIQUE KEY `workflows_organization_id_workflow_code_unique` (`organization_id`,`workflow_code`),
  KEY `workflows_created_by_foreign` (`created_by`),
  KEY `workflows_updated_by_foreign` (`updated_by`),
  KEY `workflows_published_by_foreign` (`published_by`),
  KEY `workflows_organization_id_index` (`organization_id`),
  KEY `workflows_status_index` (`status`),
  KEY `workflows_type_index` (`type`),
  KEY `workflows_created_at_index` (`created_at`),
  CONSTRAINT `workflows_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflows_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `workflows_published_by_foreign` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`),
  CONSTRAINT `workflows_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-23 16:41:44
