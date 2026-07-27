-- Patch for Shift Management Roster Support
-- Database: hrms / apponexthrms

USE `hrms`;

-- 1. Modify shift_type ENUM: replace 'rotational'/'split' with 'roster'
ALTER TABLE `shift_templates` 
  MODIFY COLUMN `shift_type` ENUM('fixed', 'flexible', 'night', 'roster') 
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'fixed';

-- 2. Add roster_pattern JSON column to store drag-and-drop weekly day schedules
ALTER TABLE `shift_templates` 
  ADD COLUMN `roster_pattern` JSON NULL AFTER `description`;
