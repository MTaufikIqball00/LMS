-- ========================================================
-- Supabase (PostgreSQL) Comprehensive Schema & Seed Data for LMS
-- Learning Management System (LMS)
-- Compatible with Supabase SQL Editor and Postgres 14+
-- ========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to automatically update `updated_at` timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 1. Table structure for table `schools`
-- --------------------------------------------------------
DROP TABLE IF EXISTS schools CASCADE;
CREATE TABLE schools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    province VARCHAR(100) DEFAULT NULL,
    postal_code VARCHAR(20) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    headmaster VARCHAR(100) DEFAULT NULL,
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'limited', 'expired', 'none')),
    registered_date DATE DEFAULT NULL,
    logo VARCHAR(255) DEFAULT '/assets/school-logos/default.png',
    level VARCHAR(20) DEFAULT 'SMA',
    academic_year VARCHAR(20) DEFAULT '2023/2024',
    user_capacity INT DEFAULT 1500,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schools (id, name, address, city, province, postal_code, phone, email, headmaster, subscription_status, registered_date, logo, level, academic_year, user_capacity) VALUES
('sch-001', 'SMA Negeri 1 Bandung', 'Jl. Ir. H. Juanda No.93', 'Bandung', 'Jawa Barat', '40132', '022-2501234', 'info@sman1bandung.sch.id', 'Dr. H. Iwan Setiawan, M.Pd.', 'active', '2022-08-15', '/assets/school-logos/sman1-bandung.png', 'SMA', '2023/2024', 1500),
('sch-002', 'SMA Negeri 3 Jakarta', 'Jl. Setiabudi II No.1', 'Jakarta Selatan', 'DKI Jakarta', '12910', '021-5251234', 'kontak@sman3jakarta.sch.id', 'Dra. Hj. Retno Listyarti, M.Si.', 'active', '2022-09-01', '/assets/school-logos/sman3-jakarta.png', 'SMA', '2023/2024', 1200),
('sch-003', 'SMA Negeri 5 Surabaya', 'Jl. Kusuma Bangsa No.21', 'Surabaya', 'Jawa Timur', '60272', '031-5341234', 'support@sman5surabaya.sch.id', 'Drs. H. M. Basuki, M.M.', 'limited', '2023-01-20', '/assets/school-logos/sman5-surabaya.png', 'SMA', '2023/2024', 1800),
('sch-004', 'SMA Negeri 1 Medan', 'Jl. Teuku Cik Ditiro No.1', 'Medan', 'Sumatera Utara', '20152', '061-4511234', 'info@sman1medan.sch.id', 'Drs. H. Sabar, M.Pd.', 'limited', '2023-02-10', '/assets/school-logos/default.png', 'SMA', '2023/2024', 1200);

-- --------------------------------------------------------
-- 2. Table structure for table `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student','teacher','admin_langganan','admin_sekolah','kepala_sekolah','school_admin','parent')),
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
    school_name VARCHAR(100) DEFAULT NULL,
    school_province VARCHAR(100) DEFAULT NULL,
    school_subscription_status VARCHAR(50) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
    last_login TIMESTAMPTZ DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT '/assets/Avatar.png',
    grade INT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);

-- Password is 'password123' hashed with scrypt
INSERT INTO users (id, name, email, password, role, school_id, school_name, school_province, school_subscription_status, status, avatar, grade) VALUES
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
DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) DEFAULT NULL,
    nisn VARCHAR(50) DEFAULT NULL,
    name VARCHAR(100) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT '/assets/Avatar.png',
    semester INT DEFAULT 1,
    grade INT DEFAULT 10,
    school_name VARCHAR(100) DEFAULT NULL,
    school_province VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    class_name VARCHAR(50) DEFAULT NULL,
    class VARCHAR(50) DEFAULT NULL,
    major VARCHAR(100) DEFAULT 'Umum',
    enrollment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
    gpa NUMERIC(4,2) DEFAULT 0.00,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    activity_level INT DEFAULT 0,
    total_credits INT DEFAULT 0,
    completed_credits INT DEFAULT 0,
    address TEXT,
    gender VARCHAR(20) DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    parent_name VARCHAR(100) DEFAULT NULL,
    parent_phone VARCHAR(20) DEFAULT NULL,
    attendance_rate NUMERIC(5,2) DEFAULT 100.00,
    assignment_completion NUMERIC(5,2) DEFAULT 100.00,
    quiz_average NUMERIC(5,2) DEFAULT 0.00,
    risk_status VARCHAR(50) DEFAULT 'Aman',
    risk_score NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);

CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO students (id, user_id, student_id, nisn, name, email, avatar, semester, grade, school_name, school_province, phone, class_name, class, major, status, gpa, average_score, activity_level, attendance_rate, assignment_completion, quiz_average, risk_status, risk_score) VALUES
('s1', '1', 'NIM001', '0051234567', 'Siswa Jabar (Kelas 12)', 'murid.jabar@sekolah.id', '/assets/Avatar.png', 5, 12, 'SMA Negeri 1 Bandung', 'Jawa Barat', '081234567890', 'Kelas 12A', 'Kelas 12A', 'IPA', 'active', 3.85, 88.50, 85, 95.50, 98.00, 88.20, 'Aman', 15.00),
('s2', '4', 'NIM002', '0061234568', 'Siswa Luar Jabar (Kelas 11)', 'murid.luar@sekolah.id', '/assets/Avatar2.png', 3, 11, 'SMA Negeri 1 Medan', 'Sumatera Utara', '081234567891', 'Kelas 11B', 'Kelas 11B', 'IPS', 'active', 3.20, 75.00, 60, 90.00, 85.00, 78.50, 'Aman', 25.00),
('s3', '5', 'NIM003', '0071234569', 'Siswa Kelas 10', 'murid.kelas10@sekolah.id', '/assets/Avatar3.png', 1, 10, 'SMA Negeri 3 Jakarta', 'DKI Jakarta', '081234567892', 'Kelas 10C', 'Kelas 10C', 'IPA', 'active', 2.80, 62.00, 40, 78.00, 70.00, 65.00, 'Berisiko Sedang', 55.00);

-- --------------------------------------------------------
-- 4. Table structure for table `teachers`
-- --------------------------------------------------------
DROP TABLE IF EXISTS teachers CASCADE;
CREATE TABLE teachers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id VARCHAR(50) DEFAULT NULL,
    subject VARCHAR(100) DEFAULT 'Umum',
    subjects VARCHAR(100) DEFAULT 'Umum',
    classes JSONB DEFAULT '[]'::jsonb,
    teaching_hours INT DEFAULT 24,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Non-Active')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teachers_user_id ON teachers(user_id);

INSERT INTO teachers (id, user_id, school_id, subject, subjects, classes, teaching_hours, status) VALUES
('t1', '2', 'sch-001', 'Matematika', 'Matematika', '["12A", "11B"]'::jsonb, 24, 'Active'),
('t2', '6', 'sch-004', 'Fisika', 'Fisika', '["11B", "10C"]'::jsonb, 20, 'Active');

-- --------------------------------------------------------
-- 5. Table structure for table `courses`
-- --------------------------------------------------------
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    teacher_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    semester VARCHAR(20) DEFAULT 'ganjil' CHECK (semester IN ('ganjil', 'genap')),
    academic_year VARCHAR(20) DEFAULT '2023/2024',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);

INSERT INTO courses (id, code, name, description, teacher_id, semester, academic_year) VALUES
('c1', 'BIO101', 'Biologi Dasar', 'Pengenalan Biologi', '2', 'ganjil', '2023/2024'),
('c2', 'MAT201', 'Matematika Lanjut', 'Kalkulus dan Aljabar', '2', 'ganjil', '2023/2024'),
('c3', 'FIS101', 'Fisika Dasar', 'Mekanika dan Termodinamika', '6', 'ganjil', '2023/2024');

-- --------------------------------------------------------
-- 6. Table structure for table `enrollments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS enrollments CASCADE;
CREATE TABLE enrollments (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id VARCHAR(50) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);

INSERT INTO enrollments (id, student_id, course_id) VALUES
('en-1', 's1', 'c1'),
('en-2', 's1', 'c2'),
('en-3', 's2', 'c2');

-- --------------------------------------------------------
-- 7. Table structure for table `modules`
-- --------------------------------------------------------
DROP TABLE IF EXISTS modules CASCADE;
CREATE TABLE modules (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) DEFAULT NULL,
    teacher_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'document' CHECK (type IN ('video', 'pdf', 'quiz', 'document')),
    content_url TEXT NOT NULL,
    subject VARCHAR(100) DEFAULT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    file_type VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_teacher_id ON modules(teacher_id);

INSERT INTO modules (id, teacher_id, title, description, type, content_url, subject, created_at) VALUES
('mod-1', '2', 'Pengenalan Aljabar', 'Materi dasar aljabar semester ganjil', 'pdf', 'https://example.com/aljabar.pdf', 'Matematika', CURRENT_TIMESTAMP),
('mod-2', '2', 'Kalkulus Diferensial', 'Video pengantar turunan fungsi', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Matematika', CURRENT_TIMESTAMP);

-- --------------------------------------------------------
-- 8. Table structure for table `assignments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS assignments CASCADE;
CREATE TABLE assignments (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) DEFAULT NULL,
    teacher_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100) DEFAULT 'Umum',
    target_class VARCHAR(50) DEFAULT NULL,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    due_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);

INSERT INTO assignments (id, teacher_id, title, description, subject, target_class, due_date) VALUES
('asg-1', '2', 'Tugas Aljabar 1', 'Kerjakan soal 1 sampai 10 di buku modul.', 'Matematika', 'Kelas 12A', CURRENT_TIMESTAMP + INTERVAL '7 days'),
('asg-2', '2', 'Praktikum Biologi Sel', 'Laporan hasil pengamatan preparat sel bawang merah.', 'Biologi', 'Kelas 12A', CURRENT_TIMESTAMP + INTERVAL '5 days');

-- --------------------------------------------------------
-- 9. Table structure for table `submissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS submissions CASCADE;
CREATE TABLE submissions (
    id VARCHAR(50) PRIMARY KEY,
    assignment_id VARCHAR(50) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT,
    file_name VARCHAR(255) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    grade NUMERIC(5,2) DEFAULT NULL,
    feedback TEXT
);

CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);

-- --------------------------------------------------------
-- 10. Table structure for table `quizzes`
-- --------------------------------------------------------
DROP TABLE IF EXISTS quizzes CASCADE;
CREATE TABLE quizzes (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) DEFAULT NULL,
    teacher_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100) DEFAULT 'Umum',
    duration INT NOT NULL DEFAULT 60,
    max_attempts INT DEFAULT 1,
    passing_score INT DEFAULT 70,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quizzes_teacher_id ON quizzes(teacher_id);

CREATE TRIGGER trg_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO quizzes (id, teacher_id, title, description, subject, duration, is_active) VALUES
('quiz-1', '2', 'Kuis Kalkulus Bab 1', 'Evaluasi pemahaman konsep turunan fungsi', 'Matematika', 45, TRUE);

-- --------------------------------------------------------
-- 11. Table structure for table `quiz_questions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS quiz_questions CASCADE;
CREATE TABLE quiz_questions (
    id VARCHAR(50) PRIMARY KEY,
    quiz_id VARCHAR(50) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'essay', 'true_false')),
    points INT DEFAULT 10,
    choices JSONB DEFAULT '[]'::jsonb,
    correct_answer VARCHAR(255) DEFAULT NULL,
    rubric TEXT
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- --------------------------------------------------------
-- 12. Table structure for table `quiz_attempts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS quiz_attempts CASCADE;
CREATE TABLE quiz_attempts (
    id VARCHAR(50) PRIMARY KEY,
    quiz_id VARCHAR(50) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score NUMERIC(5,2) DEFAULT NULL,
    answers JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);

-- --------------------------------------------------------
-- 13. Table structure for table `grades`
-- --------------------------------------------------------
DROP TABLE IF EXISTS grades CASCADE;
CREATE TABLE grades (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) DEFAULT 100.00,
    percentage NUMERIC(5,2) DEFAULT 0.00,
    grade_letter VARCHAR(5) DEFAULT 'A',
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grades_student_id ON grades(student_id);

INSERT INTO grades (id, student_id, subject, type, title, score, max_score, percentage, grade_letter, submitted_at) VALUES
('g1', 's1', 'Fisika', 'Tugas', 'Hukum Newton', 90.00, 100.00, 90.00, 'A', CURRENT_TIMESTAMP),
('g2', 's1', 'Matematika', 'Kuis', 'Kalkulus Dasar', 85.00, 100.00, 85.00, 'A-', CURRENT_TIMESTAMP),
('g3', 's2', 'Kimia', 'Tugas', 'Struktur Atom', 88.00, 100.00, 88.00, 'A-', CURRENT_TIMESTAMP),
('g4', 's2', 'Biologi', 'Kuis', 'Sistem Sel', 92.00, 100.00, 92.00, 'A', CURRENT_TIMESTAMP),
('g5', 's3', 'Matematika', 'Tugas', 'Aljabar', 65.00, 100.00, 65.00, 'C', CURRENT_TIMESTAMP);

-- --------------------------------------------------------
-- 14. Table structure for table `attendance`
-- --------------------------------------------------------
DROP TABLE IF EXISTS attendance CASCADE;
CREATE TABLE attendance (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused','permission','sick','early_leave')),
    subject VARCHAR(100) NOT NULL DEFAULT 'General',
    check_in_time TIME DEFAULT NULL,
    check_out_time TIME DEFAULT NULL,
    location_lat NUMERIC(10,8) DEFAULT NULL,
    location_lng NUMERIC(11,8) DEFAULT NULL,
    location_address TEXT,
    notes TEXT,
    method VARCHAR(30) DEFAULT 'manual' CHECK (method IN ('qr_code','manual','geolocation','face_recognition')),
    semester VARCHAR(50) DEFAULT 'Ganjil 2024'
);

CREATE INDEX idx_attendance_student_id ON attendance(student_id);

INSERT INTO attendance (id, student_id, date, status, subject, check_in_time, location_address, notes) VALUES
('att1', 's1', CURRENT_TIMESTAMP, 'present', 'Fisika', '08:05:00', 'Ruang Kelas 12A', 'Hadir tepat waktu'),
('att2', 's1', CURRENT_TIMESTAMP - INTERVAL '1 day', 'late', 'Matematika', '09:15:00', 'Ruang Kelas 12A', 'Terlambat 15 menit'),
('att3', 's2', CURRENT_TIMESTAMP, 'present', 'Kimia', '08:03:00', 'Ruang Kelas 11B', 'Hadir tepat waktu'),
('att4', 's3', CURRENT_TIMESTAMP, 'absent', 'Matematika', NULL, NULL, 'Alpa tanpa keterangan');

-- --------------------------------------------------------
-- 15. Table structure for table `activities`
-- --------------------------------------------------------
DROP TABLE IF EXISTS activities CASCADE;
CREATE TABLE activities (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_activities_student_id ON activities(student_id);

INSERT INTO activities (id, student_id, type, title, description) VALUES
('act1', 's1', 'assignment_submit', 'Tugas Fisika Dikumpulkan', 'Menyerahkan tugas Hukum Newton'),
('act2', 's1', 'quiz_complete', 'Kuis Matematika Selesai', 'Menyelesaikan kuis kalkulus dasar dengan skor 85'),
('act3', 's2', 'login', 'Login ke Sistem', 'Siswa aktif');

-- --------------------------------------------------------
-- 16. Table structure for table `forum_rooms`
-- --------------------------------------------------------
DROP TABLE IF EXISTS forum_rooms CASCADE;
CREATE TABLE forum_rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) DEFAULT NULL,
    class_id VARCHAR(50) DEFAULT NULL,
    call_id VARCHAR(100) DEFAULT NULL,
    participants INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO forum_rooms (id, name, subject, class_id, call_id, participants, is_active) VALUES
('umum-general', 'Forum Umum', 'umum', 'general', 'general-meeting', 120, TRUE),
('matematika', 'Matematika', 'matematika', NULL, 'matematika-main-call', 45, TRUE),
('fisika', 'Fisika', 'fisika', NULL, 'fisika-main-call', 30, TRUE);

-- --------------------------------------------------------
-- 17. Table structure for table `forum_threads`
-- --------------------------------------------------------
DROP TABLE IF EXISTS forum_threads CASCADE;
CREATE TABLE forum_threads (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) DEFAULT NULL,
    author_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    zoom_link VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_threads_author_id ON forum_threads(author_id);

INSERT INTO forum_threads (id, author_id, author_name, title, content) VALUES
('th-1', '2', 'Guru Jabar', 'Diskusi Bab 1: Aljabar Linear', 'Silakan ajukan pertanyaan seputar materi aljabar linear pada thread ini.');

-- --------------------------------------------------------
-- 18. Table structure for table `forum_posts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS forum_posts CASCADE;
CREATE TABLE forum_posts (
    id VARCHAR(50) PRIMARY KEY,
    thread_id VARCHAR(50) NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) DEFAULT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_posts_thread_id ON forum_posts(thread_id);
CREATE INDEX idx_forum_posts_author_id ON forum_posts(author_id);

INSERT INTO forum_posts (id, thread_id, author_id, author_name, content) VALUES
('pst-1', 'th-1', '1', 'Siswa Jabar (Kelas 12)', 'Pak, bagaimana cara cepat menentukan determinan matriks 3x3?');

-- --------------------------------------------------------
-- 19. Table structure for table `packages`
-- --------------------------------------------------------
DROP TABLE IF EXISTS packages CASCADE;
CREATE TABLE packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    duration VARCHAR(50) DEFAULT '1 Tahun',
    features JSONB DEFAULT '[]'::jsonb,
    max_users INT DEFAULT 500,
    type VARCHAR(50) DEFAULT 'Standard',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO packages (id, name, description, price, duration, features, max_users, type) VALUES
('pkg-basic', 'Paket Basic', 'Akses LMS esensial untuk sekolah kecil', 5000000.00, '1 Tahun', '["Dashboard Guru & Siswa", "Modul Belajar", "Forum Diskusi"]'::jsonb, 500, 'Basic'),
('pkg-pro', 'Paket Pro', 'LMS komprehensif dengan AI Early Warning & Video Call', 12000000.00, '1 Tahun', '["Semua Fitur Basic", "AI Early Warning System", "Stream Video Call Terintegrasi", "Tryout Online"]'::jsonb, 2000, 'Pro');

-- --------------------------------------------------------
-- 20. Table structure for table `payments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'success',
    method VARCHAR(50) DEFAULT 'Bank Transfer',
    invoice_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_school_id ON payments(school_id);

INSERT INTO payments (id, school_id, amount, status, method) VALUES
('pay-001', 'sch-001', 12000000.00, 'success', 'Bank Transfer BCA'),
('pay-002', 'sch-002', 12000000.00, 'success', 'Bank Transfer Mandiri');

-- --------------------------------------------------------
-- 21. Table structure for table `subscriptions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    package_id VARCHAR(50) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_status VARCHAR(50) DEFAULT 'paid',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX idx_subscriptions_package_id ON subscriptions(package_id);

INSERT INTO subscriptions (id, school_id, package_id, start_date, end_date, status, payment_status) VALUES
('sub-001', 'sch-001', 'pkg-pro', '2023-01-01', '2024-01-01', 'active', 'paid'),
('sub-002', 'sch-002', 'pkg-pro', '2023-02-01', '2024-02-01', 'active', 'paid');

-- --------------------------------------------------------
-- 22. Table structure for table `tryouts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS tryouts CASCADE;
CREATE TABLE tryouts (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    duration INT NOT NULL DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tryouts (id, title, subject, duration) VALUES
('tryout-matematika-01', 'Tryout UTBK - Matematika Dasar', 'Matematika', 90),
('tryout-fisika-01', 'Tryout UTBK - Fisika', 'Fisika', 90);

-- --------------------------------------------------------
-- 23. Table structure for table `tryout_questions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS tryout_questions CASCADE;
CREATE TABLE tryout_questions (
    id SERIAL PRIMARY KEY,
    tryout_id VARCHAR(50) NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    points INT DEFAULT 10
);

CREATE INDEX idx_tryout_questions_tryout_id ON tryout_questions(tryout_id);

INSERT INTO tryout_questions (tryout_id, question, options, correct_answer, points) VALUES
('tryout-matematika-01', 'Jika x + 2 = 5, berapa nilai dari 2x + 1?', '["5", "6", "7", "8"]'::jsonb, '7', 10),
('tryout-matematika-01', 'Turunan pertama dari f(x) = 3x^2 + 4x - 5 adalah...', '["6x + 4", "3x + 4", "6x - 5", "3x^2 + 4"]'::jsonb, '6x + 4', 10);

-- --------------------------------------------------------
-- 24. Table structure for table `notifications`
-- --------------------------------------------------------
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('success','error','warning','info')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

INSERT INTO notifications (id, user_id, type, title, message) VALUES
('notif-1', '1', 'info', 'Selamat Datang', 'Selamat datang di portal Learning Management System.');

-- ========================================================
-- End of Supabase Schema & Seed Data
-- ========================================================
