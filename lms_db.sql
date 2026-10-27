-- ========================================================
-- Comprehensive Unified Database Schema for LMS (Learning Management System)
-- Synchronized with All Application Routes, Models, and Seed Data
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Table structure for table `schools`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `schools`;
CREATE TABLE `schools` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `province` VARCHAR(100) DEFAULT NULL,
  `postal_code` VARCHAR(20) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `headmaster` VARCHAR(100) DEFAULT NULL,
  `subscription_status` ENUM('active', 'limited', 'expired', 'none') DEFAULT 'active',
  `registered_date` DATE DEFAULT NULL,
  `logo` VARCHAR(255) DEFAULT '/assets/school-logos/default.png',
  `level` VARCHAR(20) DEFAULT 'SMA',
  `academic_year` VARCHAR(20) DEFAULT '2023/2024',
  `user_capacity` INT DEFAULT 1500,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schools` (`id`, `name`, `address`, `city`, `province`, `postal_code`, `phone`, `email`, `headmaster`, `subscription_status`, `registered_date`, `logo`, `level`, `academic_year`, `user_capacity`) VALUES
('sch-001', 'SMA Negeri 1 Bandung', 'Jl. Ir. H. Juanda No.93', 'Bandung', 'Jawa Barat', '40132', '022-2501234', 'info@sman1bandung.sch.id', 'Dr. H. Iwan Setiawan, M.Pd.', 'active', '2022-08-15', '/assets/school-logos/sman1-bandung.png', 'SMA', '2023/2024', 1500),
('sch-002', 'SMA Negeri 3 Jakarta', 'Jl. Setiabudi II No.1', 'Jakarta Selatan', 'DKI Jakarta', '12910', '021-5251234', 'kontak@sman3jakarta.sch.id', 'Dra. Hj. Retno Listyarti, M.Si.', 'active', '2022-09-01', '/assets/school-logos/sman3-jakarta.png', 'SMA', '2023/2024', 1200),
('sch-003', 'SMA Negeri 5 Surabaya', 'Jl. Kusuma Bangsa No.21', 'Surabaya', 'Jawa Timur', '60272', '031-5341234', 'support@sman5surabaya.sch.id', 'Drs. H. M. Basuki, M.M.', 'limited', '2023-01-20', '/assets/school-logos/sman5-surabaya.png', 'SMA', '2023/2024', 1800),
('sch-004', 'SMA Negeri 1 Medan', 'Jl. Teuku Cik Ditiro No.1', 'Medan', 'Sumatera Utara', '20152', '061-4511234', 'info@sman1medan.sch.id', 'Drs. H. Sabar, M.Pd.', 'limited', '2023-02-10', '/assets/school-logos/default.png', 'SMA', '2023/2024', 1200);

-- --------------------------------------------------------
-- 2. Table structure for table `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student','teacher','admin_langganan','admin_sekolah','kepala_sekolah','school_admin','parent') NOT NULL,
  `school_id` VARCHAR(50) DEFAULT NULL,
  `school_name` VARCHAR(100) DEFAULT NULL,
  `school_province` VARCHAR(100) DEFAULT NULL,
  `school_subscription_status` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('active','inactive','pending') DEFAULT 'active',
  `last_login` DATETIME DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT '/assets/Avatar.png',
  `grade` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `fk_users_schools` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default password is 'password123' hashed with scrypt
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `school_id`, `school_name`, `school_province`, `school_subscription_status`, `status`, `avatar`, `grade`) VALUES
('1', 'Siswa Jabar (Kelas 12)', 'murid.jabar@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'student', 'sch-001', 'SMA Negeri 1 Bandung', 'Jawa Barat', 'active', 'active', '/assets/Avatar.png', 12),
('2', 'Guru Jabar', 'guru.jabar@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'teacher', 'sch-001', 'SMA Negeri 1 Bandung', 'Jawa Barat', 'active', 'active', '/assets/Avatar2.png', NULL),
('3', 'Admin Langganan', 'admin@langganan.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'admin_langganan', NULL, NULL, NULL, NULL, 'active', '/assets/Avatar.png', NULL),
('4', 'Siswa Luar Jabar (Kelas 11)', 'murid.luar@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'student', 'sch-004', 'SMA Negeri 1 Medan', 'Sumatera Utara', 'limited', 'active', '/assets/Avatar.png', 11),
('5', 'Siswa Kelas 10', 'murid.kelas10@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'student', 'sch-002', 'SMA Negeri 3 Jakarta', 'DKI Jakarta', 'active', 'active', '/assets/Avatar3.png', 10),
('6', 'Guru Luar Jabar', 'guru.luar@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'teacher', 'sch-004', 'SMA Negeri 1 Medan', 'Sumatera Utara', 'limited', 'active', '/assets/Avatar.png', NULL),
('7', 'Kepala Sekolah Bandung', 'kepala@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'kepala_sekolah', 'sch-001', 'SMA Negeri 1 Bandung', 'Jawa Barat', 'active', 'active', '/assets/Avatar.png', NULL),
('8', 'Admin Sekolah Bandung', 'admin.sekolah@sekolah.id', 'scrypt:a1b2c3d4e5f60718:727f8db552c02678ae459f0140467c684667d4a61536b753e84400ec91b283afe6db298f8ad900c1df61fd513b3149084ad81ad2b8c828380cdca0d1eadb7974', 'admin_sekolah', 'sch-001', 'SMA Negeri 1 Bandung', 'Jawa Barat', 'active', 'active', '/assets/Avatar.png', NULL);

-- --------------------------------------------------------
-- 3. Table structure for table `students`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) DEFAULT NULL, -- NIS / NIM
  `nisn` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT '/assets/Avatar.png',
  `semester` INT DEFAULT 1,
  `grade` INT DEFAULT 10,
  `school_name` VARCHAR(100) DEFAULT NULL,
  `school_province` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `class_name` VARCHAR(50) DEFAULT NULL,
  `class` VARCHAR(50) DEFAULT NULL,
  `major` VARCHAR(100) DEFAULT 'Umum',
  `enrollment_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('active','inactive','suspended') DEFAULT 'active',
  `gpa` DECIMAL(4,2) DEFAULT 0.00,
  `average_score` DECIMAL(5,2) DEFAULT 0.00,
  `activity_level` INT DEFAULT 0,
  `total_credits` INT DEFAULT 0,
  `completed_credits` INT DEFAULT 0,
  `address` TEXT,
  `gender` VARCHAR(20) DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `parent_name` VARCHAR(100) DEFAULT NULL,
  `parent_phone` VARCHAR(20) DEFAULT NULL,
  `attendance_rate` DECIMAL(5,2) DEFAULT 100.00,
  `assignment_completion` DECIMAL(5,2) DEFAULT 100.00,
  `quiz_average` DECIMAL(5,2) DEFAULT 0.00,
  `risk_status` VARCHAR(50) DEFAULT 'Aman',
  `risk_score` DECIMAL(5,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `fk_students_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `students` (`id`, `user_id`, `student_id`, `nisn`, `name`, `email`, `avatar`, `semester`, `grade`, `school_name`, `school_province`, `phone`, `class_name`, `class`, `major`, `status`, `gpa`, `average_score`, `activity_level`, `attendance_rate`, `assignment_completion`, `quiz_average`, `risk_status`, `risk_score`) VALUES
('s1', '1', 'NIM001', '0051234567', 'Siswa Jabar (Kelas 12)', 'murid.jabar@sekolah.id', '/assets/Avatar.png', 5, 12, 'SMA Negeri 1 Bandung', 'Jawa Barat', '081234567890', 'Kelas 12A', 'Kelas 12A', 'IPA', 'active', 3.85, 88.50, 85, 95.50, 98.00, 88.20, 'Aman', 15.00),
('s2', '4', 'NIM002', '0061234568', 'Siswa Luar Jabar (Kelas 11)', 'murid.luar@sekolah.id', '/assets/Avatar2.png', 3, 11, 'SMA Negeri 1 Medan', 'Sumatera Utara', '081234567891', 'Kelas 11B', 'Kelas 11B', 'IPS', 'active', 3.20, 75.00, 60, 90.00, 85.00, 78.50, 'Aman', 25.00),
('s3', '5', 'NIM003', '0071234569', 'Siswa Kelas 10', 'murid.kelas10@sekolah.id', '/assets/Avatar3.png', 1, 10, 'SMA Negeri 3 Jakarta', 'DKI Jakarta', '081234567892', 'Kelas 10C', 'Kelas 10C', 'IPA', 'active', 2.80, 62.00, 40, 78.00, 70.00, 65.00, 'Berisiko Sedang', 55.00);

-- --------------------------------------------------------
-- 4. Table structure for table `teachers`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `teachers`;
CREATE TABLE `teachers` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) DEFAULT NULL,
  `subject` VARCHAR(100) DEFAULT 'Umum',
  `subjects` VARCHAR(100) DEFAULT 'Umum',
  `classes` JSON DEFAULT NULL,
  `teaching_hours` INT DEFAULT 24,
  `status` ENUM('Active', 'Non-Active') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_teachers_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `teachers` (`id`, `user_id`, `school_id`, `subject`, `subjects`, `classes`, `teaching_hours`, `status`) VALUES
('t1', '2', 'sch-001', 'Matematika', 'Matematika', '["12A", "11B"]', 24, 'Active'),
('t2', '6', 'sch-004', 'Fisika', 'Fisika', '["11B", "10C"]', 20, 'Active');

-- --------------------------------------------------------
-- 5. Table structure for table `courses`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `teacher_id` VARCHAR(50) NOT NULL,
  `semester` ENUM('ganjil', 'genap') DEFAULT 'ganjil',
  `academic_year` VARCHAR(20) DEFAULT '2023/2024',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `fk_courses_teachers` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `courses` (`id`, `code`, `name`, `description`, `teacher_id`, `semester`, `academic_year`) VALUES
('c1', 'BIO101', 'Biologi Dasar', 'Pengenalan Biologi', '2', 'ganjil', '2023/2024'),
('c2', 'MAT201', 'Matematika Lanjut', 'Kalkulus dan Aljabar', '2', 'ganjil', '2023/2024'),
('c3', 'FIS101', 'Fisika Dasar', 'Mekanika dan Termodinamika', '6', 'ganjil', '2023/2024');

-- --------------------------------------------------------
-- 6. Table structure for table `enrollments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `enrollments`;
CREATE TABLE `enrollments` (
  `id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) NOT NULL,
  `enrolled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `fk_enrollments_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_courses` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `enrollments` (`id`, `student_id`, `course_id`) VALUES
('en-1', 's1', 'c1'),
('en-2', 's1', 'c2'),
('en-3', 's2', 'c2');

-- --------------------------------------------------------
-- 7. Table structure for table `modules`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) DEFAULT NULL,
  `teacher_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `type` ENUM('video', 'pdf', 'quiz', 'document') NOT NULL DEFAULT 'document',
  `content_url` TEXT NOT NULL,
  `subject` VARCHAR(100) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `file_type` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `fk_modules_teachers` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `modules` (`id`, `teacher_id`, `title`, `description`, `type`, `content_url`, `subject`, `created_at`) VALUES
('mod-1', '2', 'Pengenalan Aljabar', 'Materi dasar aljabar semester ganjil', 'pdf', 'https://example.com/aljabar.pdf', 'Matematika', NOW()),
('mod-2', '2', 'Kalkulus Diferensial', 'Video pengantar turunan fungsi', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Matematika', NOW());

-- --------------------------------------------------------
-- 8. Table structure for table `assignments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) DEFAULT NULL,
  `teacher_id` VARCHAR(50) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `subject` VARCHAR(100) DEFAULT 'Umum',
  `target_class` VARCHAR(50) DEFAULT NULL,
  `priority` ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  `due_date` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `assignments` (`id`, `teacher_id`, `title`, `description`, `subject`, `target_class`, `due_date`) VALUES
('asg-1', '2', 'Tugas Aljabar 1', 'Kerjakan soal 1 sampai 10 di buku modul.', 'Matematika', 'Kelas 12A', DATE_ADD(NOW(), INTERVAL 7 DAY)),
('asg-2', '2', 'Praktikum Biologi Sel', 'Laporan hasil pengamatan preparat sel bawang merah.', 'Biologi', 'Kelas 12A', DATE_ADD(NOW(), INTERVAL 5 DAY));

-- --------------------------------------------------------
-- 9. Table structure for table `submissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `submissions`;
CREATE TABLE `submissions` (
  `id` VARCHAR(50) NOT NULL,
  `assignment_id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `file_url` TEXT,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `file_size` INT DEFAULT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `grade` DECIMAL(5,2) DEFAULT NULL,
  `feedback` TEXT,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `fk_submissions_assignments` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Table structure for table `quizzes`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `quizzes`;
CREATE TABLE `quizzes` (
  `id` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) DEFAULT NULL,
  `teacher_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `subject` VARCHAR(100) DEFAULT 'Umum',
  `duration` INT NOT NULL DEFAULT 60,
  `max_attempts` INT DEFAULT 1,
  `passing_score` INT DEFAULT 70,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `quizzes` (`id`, `teacher_id`, `title`, `description`, `subject`, `duration`, `is_active`) VALUES
('quiz-1', '2', 'Kuis Kalkulus Bab 1', 'Evaluasi pemahaman konsep turunan fungsi', 'Matematika', 45, TRUE);

-- --------------------------------------------------------
-- 11. Table structure for table `quiz_questions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `quiz_questions`;
CREATE TABLE `quiz_questions` (
  `id` VARCHAR(50) NOT NULL,
  `quiz_id` VARCHAR(50) NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` ENUM('multiple_choice', 'essay', 'true_false') NOT NULL,
  `points` INT DEFAULT 10,
  `choices` JSON DEFAULT NULL,
  `correct_answer` VARCHAR(255) DEFAULT NULL,
  `rubric` TEXT,
  PRIMARY KEY (`id`),
  KEY `quiz_id` (`quiz_id`),
  CONSTRAINT `fk_quiz_questions_quizzes` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Table structure for table `quiz_attempts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `quiz_attempts`;
CREATE TABLE `quiz_attempts` (
  `id` VARCHAR(50) NOT NULL,
  `quiz_id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `score` DECIMAL(5,2) DEFAULT NULL,
  `answers` JSON DEFAULT NULL,
  `started_at` DATETIME NOT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `fk_quiz_attempts_quizzes` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quiz_attempts_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. Table structure for table `grades`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `grades`;
CREATE TABLE `grades` (
  `id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `score` DECIMAL(5,2) NOT NULL,
  `max_score` DECIMAL(5,2) DEFAULT 100.00,
  `percentage` DECIMAL(5,2) DEFAULT 0.00,
  `grade_letter` VARCHAR(5) DEFAULT 'A',
  `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `graded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `fk_grades_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `grades` (`id`, `student_id`, `subject`, `type`, `title`, `score`, `max_score`, `percentage`, `grade_letter`, `submitted_at`) VALUES
('g1', 's1', 'Fisika', 'Tugas', 'Hukum Newton', 90.00, 100.00, 90.00, 'A', NOW()),
('g2', 's1', 'Matematika', 'Kuis', 'Kalkulus Dasar', 85.00, 100.00, 85.00, 'A-', NOW()),
('g3', 's2', 'Kimia', 'Tugas', 'Struktur Atom', 88.00, 100.00, 88.00, 'A-', NOW()),
('g4', 's2', 'Biologi', 'Kuis', 'Sistem Sel', 92.00, 100.00, 92.00, 'A', NOW()),
('g5', 's3', 'Matematika', 'Tugas', 'Aljabar', 65.00, 100.00, 65.00, 'C', NOW());

-- --------------------------------------------------------
-- 14. Table structure for table `attendance`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `date` DATETIME NOT NULL,
  `status` ENUM('present','absent','late','excused','permission','sick','early_leave') NOT NULL DEFAULT 'present',
  `subject` VARCHAR(100) NOT NULL DEFAULT 'General',
  `check_in_time` TIME DEFAULT NULL,
  `check_out_time` TIME DEFAULT NULL,
  `location_lat` DECIMAL(10,8) DEFAULT NULL,
  `location_lng` DECIMAL(11,8) DEFAULT NULL,
  `location_address` TEXT,
  `notes` TEXT,
  `method` ENUM('qr_code','manual','geolocation','face_recognition') DEFAULT 'manual',
  `semester` VARCHAR(50) DEFAULT 'Ganjil 2024',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `fk_attendance_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `attendance` (`id`, `student_id`, `date`, `status`, `subject`, `check_in_time`, `location_address`, `notes`) VALUES
('att1', 's1', NOW(), 'present', 'Fisika', '08:05:00', 'Ruang Kelas 12A', 'Hadir tepat waktu'),
('att2', 's1', DATE_SUB(NOW(), INTERVAL 1 DAY), 'late', 'Matematika', '09:15:00', 'Ruang Kelas 12A', 'Terlambat 15 menit'),
('att3', 's2', NOW(), 'present', 'Kimia', '08:03:00', 'Ruang Kelas 11B', 'Hadir tepat waktu'),
('att4', 's3', NOW(), 'absent', 'Matematika', NULL, NULL, 'Alpa tanpa keterangan');

-- --------------------------------------------------------
-- 15. Table structure for table `activities`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `activities`;
CREATE TABLE `activities` (
  `id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `metadata` JSON DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `fk_activities_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `activities` (`id`, `student_id`, `type`, `title`, `description`) VALUES
('act1', 's1', 'assignment_submit', 'Tugas Fisika Dikumpulkan', 'Menyerahkan tugas Hukum Newton'),
('act2', 's1', 'quiz_complete', 'Kuis Matematika Selesai', 'Menyelesaikan kuis kalkulus dasar dengan skor 85'),
('act3', 's2', 'login', 'Login ke Sistem', 'Siswa aktif');

-- --------------------------------------------------------
-- 16. Table structure for table `forum_rooms`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `forum_rooms`;
CREATE TABLE `forum_rooms` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `subject` VARCHAR(100) DEFAULT NULL,
  `class_id` VARCHAR(50) DEFAULT NULL,
  `call_id` VARCHAR(100) DEFAULT NULL,
  `participants` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `forum_rooms` (`id`, `name`, `subject`, `class_id`, `call_id`, `participants`, `is_active`) VALUES
('umum-general', 'Forum Umum', 'umum', 'general', 'general-meeting', 120, TRUE),
('matematika', 'Matematika', 'matematika', NULL, 'matematika-main-call', 45, TRUE),
('fisika', 'Fisika', 'fisika', NULL, 'fisika-main-call', 30, TRUE);

-- --------------------------------------------------------
-- 17. Table structure for table `forum_threads`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `forum_threads`;
CREATE TABLE `forum_threads` (
  `id` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) DEFAULT NULL,
  `author_id` VARCHAR(50) NOT NULL,
  `author_name` VARCHAR(100) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `zoom_link` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `fk_forum_threads_authors` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `forum_threads` (`id`, `author_id`, `author_name`, `title`, `content`) VALUES
('th-1', '2', 'Guru Jabar', 'Diskusi Bab 1: Aljabar Linear', 'Silakan ajukan pertanyaan seputar materi aljabar linear pada thread ini.');

-- --------------------------------------------------------
-- 18. Table structure for table `forum_posts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `forum_posts`;
CREATE TABLE `forum_posts` (
  `id` VARCHAR(50) NOT NULL,
  `thread_id` VARCHAR(50) NOT NULL,
  `author_id` VARCHAR(50) NOT NULL,
  `author_name` VARCHAR(100) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thread_id` (`thread_id`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `fk_forum_posts_threads` FOREIGN KEY (`thread_id`) REFERENCES `forum_threads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_forum_posts_authors` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `forum_posts` (`id`, `thread_id`, `author_id`, `author_name`, `content`) VALUES
('pst-1', 'th-1', '1', 'Siswa Jabar (Kelas 12)', 'Pak, bagaimana cara cepat menentukan determinan matriks 3x3?');

-- --------------------------------------------------------
-- 19. Table structure for table `packages`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `packages`;
CREATE TABLE `packages` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `duration` VARCHAR(50) DEFAULT '1 Tahun',
  `features` JSON DEFAULT NULL,
  `max_users` INT DEFAULT 500,
  `type` VARCHAR(50) DEFAULT 'Standard',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `packages` (`id`, `name`, `description`, `price`, `duration`, `features`, `max_users`, `type`) VALUES
('pkg-basic', 'Paket Basic', 'Akses LMS esensial untuk sekolah kecil', 5000000.00, '1 Tahun', '["Dashboard Guru & Siswa", "Modul Belajar", "Forum Diskusi"]', 500, 'Basic'),
('pkg-pro', 'Paket Pro', 'LMS komprehensif dengan AI Early Warning & Video Call', 12000000.00, '1 Tahun', '["Semua Fitur Basic", "AI Early Warning System", "Stream Video Call Terintegrasi", "Tryout Online"]', 2000, 'Pro');

-- --------------------------------------------------------
-- 20. Table structure for table `payments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) DEFAULT 'success',
  `method` VARCHAR(50) DEFAULT 'Bank Transfer',
  `invoice_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `fk_payments_schools` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payments` (`id`, `school_id`, `amount`, `status`, `method`) VALUES
('pay-001', 'sch-001', 12000000.00, 'success', 'Bank Transfer BCA'),
('pay-002', 'sch-002', 12000000.00, 'success', 'Bank Transfer Mandiri');

-- --------------------------------------------------------
-- 21. Table structure for table `subscriptions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `package_id` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` VARCHAR(50) DEFAULT 'active',
  `auto_renew` BOOLEAN DEFAULT TRUE,
  `payment_status` VARCHAR(50) DEFAULT 'paid',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `school_id` (`school_id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `fk_sub_schools` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sub_packages` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subscriptions` (`id`, `school_id`, `package_id`, `start_date`, `end_date`, `status`, `payment_status`) VALUES
('sub-001', 'sch-001', 'pkg-pro', '2023-01-01', '2024-01-01', 'active', 'paid'),
('sub-002', 'sch-002', 'pkg-pro', '2023-02-01', '2024-02-01', 'active', 'paid');

-- --------------------------------------------------------
-- 22. Table structure for table `tryouts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tryouts`;
CREATE TABLE `tryouts` (
  `id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `duration` INT NOT NULL DEFAULT 90,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tryouts` (`id`, `title`, `subject`, `duration`) VALUES
('tryout-matematika-01', 'Tryout UTBK - Matematika Dasar', 'Matematika', 90),
('tryout-fisika-01', 'Tryout UTBK - Fisika', 'Fisika', 90);

-- --------------------------------------------------------
-- 23. Table structure for table `tryout_questions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tryout_questions`;
CREATE TABLE `tryout_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tryout_id` VARCHAR(50) NOT NULL,
  `question` TEXT NOT NULL,
  `options` JSON NOT NULL,
  `correct_answer` VARCHAR(255) NOT NULL,
  `points` INT DEFAULT 10,
  KEY `tryout_id` (`tryout_id`),
  CONSTRAINT `fk_tryout_questions_tryouts` FOREIGN KEY (`tryout_id`) REFERENCES `tryouts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tryout_questions` (`tryout_id`, `question`, `options`, `correct_answer`, `points`) VALUES
('tryout-matematika-01', 'Jika x + 2 = 5, berapa nilai dari 2x + 1?', '["5", "6", "7", "8"]', '7', 10),
('tryout-matematika-01', 'Turunan pertama dari f(x) = 3x^2 + 4x - 5 adalah...', '["6x + 4", "3x + 4", "6x - 5", "3x^2 + 4"]', '6x + 4', 10);

-- --------------------------------------------------------
-- 24. Table structure for table `notifications`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `type` ENUM('success','error','warning','info') NOT NULL DEFAULT 'info',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_notifications_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`) VALUES
('notif-1', '1', 'info', 'Selamat Datang', 'Selamat datang di portal Learning Management System.');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
