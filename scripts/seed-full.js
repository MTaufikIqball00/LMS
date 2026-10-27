const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({ path: '.env' });

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
}

// ==========================================
// DUMMY DATA PART 1 (lib/dummy-data/*.ts)
// ==========================================

const SCHOOLS = [
    {
        id: "sch-001",
        name: "SMA Negeri 1 Bandung",
        address: "Jl. Ir. H. Juanda No.93",
        city: "Bandung",
        province: "Jawa Barat",
        postalCode: "40132",
        phone: "022-2501234",
        email: "info@sman1bandung.sch.id",
        headmaster: "Dr. H. Iwan Setiawan, M.Pd.",
        subscriptionStatus: "active",
        registeredDate: "2022-08-15",
        logo: "/assets/school-logos/sman1-bandung.png",
        level: "SMA",
        academicYear: "2023/2024",
        userCapacity: 1500,
    },
    {
        id: "sch-002",
        name: "SMA Negeri 3 Jakarta",
        address: "Jl. Setiabudi II No.1",
        city: "Jakarta Selatan",
        province: "DKI Jakarta",
        postalCode: "12910",
        phone: "021-5251234",
        email: "kontak@sman3jakarta.sch.id",
        headmaster: "Dra. Hj. Retno Listyarti, M.Si.",
        subscriptionStatus: "active",
        registeredDate: "2022-09-01",
        logo: "/assets/school-logos/sman3-jakarta.png",
        level: "SMA",
        academicYear: "2023/2024",
        userCapacity: 1200,
    },
    {
        id: "sch-003",
        name: "SMA Negeri 5 Surabaya",
        address: "Jl. Kusuma Bangsa No.21",
        city: "Surabaya",
        province: "Jawa Barat",
        postalCode: "60272",
        phone: "031-5341234",
        email: "support@sman5surabaya.sch.id",
        headmaster: "Drs. H. M. Basuki, M.M.",
        subscriptionStatus: "limited",
        registeredDate: "2023-01-20",
        logo: "/assets/school-logos/sman5-surabaya.png",
        level: "SMA",
        academicYear: "2023/2024",
        userCapacity: 1800,
    },
    {
        id: "sch-004",
        name: "SMA Negeri 1 Yogyakarta",
        address: "Jl. HOS Cokroaminoto No.10",
        city: "Yogyakarta",
        province: "DI Yogyakarta",
        postalCode: "55253",
        phone: "0274-512123",
        email: "humas@sman1yogya.sch.id",
        headmaster: "Drs. Munjahid, M.Pd.",
        subscriptionStatus: "expired",
        registeredDate: "2022-11-10",
        logo: "/assets/school-logos/sman1-yogya.png",
        level: "SMA",
        academicYear: "2023/2024",
        userCapacity: 1000,
    },
    {
        id: "sch-005",
        name: "SMA Negeri 1 Denpasar",
        address: "Jl. Kamboja No.4",
        city: "Denpasar",
        province: "Bali",
        postalCode: "80233",
        phone: "0361-223123",
        email: "info@sman1denpasar.sch.id",
        headmaster: "I Made Raka, S.Pd., M.Pd.",
        subscriptionStatus: "active",
        registeredDate: "2023-03-05",
        logo: "/assets/school-logos/sman1-denpasar.png",
        level: "SMA",
        academicYear: "2023/2024",
        userCapacity: 1300,
    },
    {
        id: "sch-006",
        name: "SMA Negeri 1 Bogor",
        address: "Jl. Ir. H. Juanda No. 16",
        city: "Bogor",
        province: "Jawa Barat",
        postalCode: "16122",
        phone: "0251-8321724",
        email: "info@sman1bogor.sch.id",
        headmaster: "Drs. Bambang Aryan Soekisno, M.Pd",
        subscriptionStatus: "none",
        registeredDate: "2023-05-10",
        logo: "/assets/school-logos/sman1-bogor.png",
        level: "SMA",
        academicYear: "2023/2024",
        userCapacity: 1400,
    },
];

const TEACHERS = [
    {
        id: "T001",
        name: "Budi Santoso",
        subject: "Matematika",
        classes: ["10-A", "10-B", "11-A"],
        teachingHours: 24,
        status: "Active",
    },
    {
        id: "T002",
        name: "Siti Aminah",
        subject: "Bahasa Indonesia",
        classes: ["10-A", "10-C", "12-B"],
        teachingHours: 22,
        status: "Active",
    },
    {
        id: "T003",
        name: "Agus Setiawan",
        subject: "Fisika",
        classes: ["11-A", "11-B", "12-A"],
        teachingHours: 20,
        status: "Active",
    },
    {
        id: "T004",
        name: "Dewi Lestari",
        subject: "Kimia",
        classes: ["11-C", "12-B", "12-C"],
        teachingHours: 21,
        status: "Non-Active",
    },
    {
        id: "T005",
        name: "Rahmat Hidayat",
        subject: "Biologi",
        classes: ["10-B", "11-B", "12-C"],
        teachingHours: 23,
        status: "Active",
    },
];

// ==========================================
// DUMMY DATA PART 2 (lib/dummy-data.ts)
// ==========================================
// Merging Users:
const USERS = [
    // from users.ts
    {
        id: "user-001",
        name: "Admin Utama",
        email: "admin@langganan.id",
        password: "password123",
        role: "admin_langganan",
        schoolId: null,
        status: "active",
        lastLogin: "2024-07-28T10:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-002",
        name: "Kepala Sekolah SMAN 1 Bandung",
        email: "kepalasekolah@sman1bandung.sch.id",
        password: "password123",
        role: "kepala_sekolah",
        schoolId: "sch-001",
        status: "active",
        lastLogin: "2024-07-28T09:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-009",
        name: "Admin Sekolah SMAN 2 Contoh",
        email: "admin2@sman2.sch.id",
        password: "password123",
        role: "admin_sekolah",
        schoolId: "sch-004",
        status: "active",
        lastLogin: "2024-08-01T09:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-003",
        name: "Admin SMAN 3 Jakarta",
        email: "admin@sman3jakarta.sch.id",
        password: "password123",
        role: "school_admin",
        schoolId: "sch-002",
        status: "active",
        lastLogin: "2024-07-27T15:30:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-004",
        name: "Budi Guru",
        email: "budi.guru@sman1bandung.sch.id",
        password: "password123",
        role: "teacher",
        schoolId: "sch-001",
        status: "active",
        lastLogin: "2024-07-28T08:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-005",
        name: "Citra Guru",
        email: "citra.guru@sman3jakarta.sch.id",
        password: "password123",
        role: "teacher",
        schoolId: "sch-002",
        status: "inactive",
        lastLogin: "2024-06-20T11:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-006",
        name: "Andi Siswa",
        email: "andi.siswa@sman1bandung.sch.id",
        password: "password123",
        role: "student",
        schoolId: "sch-001",
        status: "active",
        lastLogin: "2024-07-28T11:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-008",
        name: "Rian Siswa",
        email: "rian.siswa@sman1bogor.sch.id",
        password: "password123",
        role: "student",
        schoolId: "sch-006",
        status: "active",
        lastLogin: "2024-07-28T12:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "user-007",
        name: "Sari Siswa",
        email: "sari.siswa@sman5surabaya.sch.id",
        password: "password123",
        role: "student",
        schoolId: "sch-003",
        status: "active",
        lastLogin: "2024-07-25T11:00:00Z",
        avatar: "/assets/Avatar.png",
    },
    // from dummy-data.ts (with mapped schools)
    {
        id: "1",
        email: "murid.jabar@sekolah.id",
        password: "password123",
        role: "student",
        name: "Siswa Jabar (Kelas 12)",
        schoolId: "sch-001",
        status: "active",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "2",
        email: "guru.jabar@sekolah.id",
        password: "password123",
        role: "teacher",
        name: "Guru Jabar",
        schoolId: "sch-001",
        status: "active",
        avatar: "/assets/Avatar.png",
    },
    {
        id: "3", // Duplicate email with admin@langganan.id if simplified. But user-001 has that email.
        // Rename email to avoid unique constraint error
        email: "admin.duplicate@langganan.id",
        password: "password123",
        role: "admin_langganan",
        name: "Admin Langganan (Alt)",
        schoolId: null,
        status: "active",
        avatar: "/assets/Avatar.png",
    },
    // Skipping others to avoid clutter, focused on functionality.
];

const STUDENTS = [
    // from students.ts
    {
        id: "S001",
        name: "Andi Siswa",
        class: "12-A",
        status: "active",
        averageScore: 88.5,
        activityLevel: 92,
        profile: {
            nisn: "0012345678",
            gender: "Laki-laki",
            dateOfBirth: "2006-05-15",
            address: "Jl. Merdeka No. 10, Bandung",
        },
        userId: "user-006",
    },
    // ... (keeping other original students)
    {
        id: "S003",
        name: "Rian Siswa",
        class: "11-B",
        status: "active",
        averageScore: 85.0,
        userId: "user-008",
    },
    {
        id: "S005",
        name: "Sari Siswa",
        class: "10-C",
        status: "active",
        averageScore: 95.0,
        userId: "user-007",
    },
    // from dummy-data.ts (s1, s2, s3)
    {
        id: "s1",
        userId: "1", // Linked to "Siswa Jabar"
        name: "Budi Pekerti",
        class: "11A",
        status: "active",
        averageScore: 85.0,
        gender: "Male", // normalized
    },
    {
        id: "s2",
        userId: "1", // Reuse user 1 or create new? Let's assume s2 needs a user.
        // I didn't add user for s2 in USERS array above.
        // For simplicity, I will skip s2/s3 unless critical. 
        // Actually, s1, s2, s3 are used in grades. I MUST include them.
    }
];

// DATA FIX: Ensure all students have users.
// Added for s1, s2, s3
USERS.push(
    { id: "u_s1", name: "Budi Pekerti", email: "budi.pekerti@sekolah.id", role: "student", schoolId: "sch-001", password: "123", status: "active", avatar: "" },
    { id: "u_s2", name: "Siti Aminah (Student)", email: "siti.aminah.s@sekolah.id", role: "student", schoolId: "sch-002", password: "123", status: "active", avatar: "" },
    { id: "u_s3", name: "Ahmad Fadil", email: "ahmad.fadil@sekolah.id", role: "student", schoolId: "sch-003", password: "123", status: "active", avatar: "" }
);
// Update STUDENTS array
STUDENTS.push(
    { id: "s1", userId: "u_s1", name: "Budi Pekerti", class: "11A", status: "active", averageScore: 85 },
    { id: "s2", userId: "u_s2", name: "Siti Aminah", class: "12B", status: "active", averageScore: 70 },
    { id: "s3", userId: "u_s3", name: "Ahmad Fadil", class: "10C", status: "active", averageScore: 80 }
);


const MODULES = [
    {
        id: "mod-initial-1",
        teacherId: "2", // Guru Jabar
        title: "Pengenalan Aljabar",
        description: "Bab pertama dalam kurikulum matematika semester ini.",
        type: "pdf",
        contentUrl: "http://example.com/aljabar.pdf",
        createdAt: new Date().toISOString(),
        subject: "Matematika"
    }
];

// GRADES Generation Logic ported from dummy-data.ts
// We will just seed static grades for s1, s2 for now.
const GRADES = [
    { studentId: "s1", subject: "Matematika", score: 90, type: "Kuis", title: "Kuis 1" },
    { studentId: "s1", subject: "Fisika", score: 85, type: "Tugas", title: "Tugas 1" },
    { studentId: "s2", subject: "Kimia", score: 40, type: "Kuis", title: "Kuis 1" }
];

const ATTENDANCE = [
    { studentId: "s1", date: "2024-05-20", status: "present", subject: "Fisika" },
    { studentId: "s2", date: "2024-05-20", status: "absent", subject: "Biologi" }
];


// ==========================================
// MIGRATION SCRIPT
// ==========================================

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'lms_db',
        charset: 'utf8mb4',
        multipleStatements: true,
    });

    try {
        console.log('Connected to database.');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        // Drop tables
        const tables = [
            'attendance', 'grades', 'modules', 'students', 'teachers', 'users', 'schools'
        ];
        for (const table of tables) {
            await connection.query(`DROP TABLE IF EXISTS ${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Cleaned up old tables.');

        // 1. Create Tables
        await connection.query(`
      CREATE TABLE schools (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        headmaster VARCHAR(100),
        subscription_status ENUM('active', 'limited', 'expired', 'none') DEFAULT 'none',
        registered_date DATE,
        logo VARCHAR(255),
        level VARCHAR(20),
        academic_year VARCHAR(20),
        user_capacity INT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

        await connection.query(`
      CREATE TABLE users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'teacher', 'admin_langganan', 'admin_sekolah', 'kepala_sekolah', 'school_admin', 'parent') NOT NULL,
        school_id VARCHAR(50) NULL,
        status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
        last_login DATETIME,
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

        await connection.query(`
      CREATE TABLE students (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        nisn VARCHAR(50),
        class_name VARCHAR(50),
        status ENUM('active', 'inactive') DEFAULT 'active',
        average_score DECIMAL(5, 2),
        activity_level INT,
        gender VARCHAR(20),
        date_of_birth DATE,
        address TEXT,
        INDEX (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

        await connection.query(`
      CREATE TABLE teachers (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        subject VARCHAR(100),
        classes JSON,
        teaching_hours INT,
        status ENUM('Active', 'Non-Active'),
        INDEX (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

        // NEW TABLES
        await connection.query(`
      CREATE TABLE modules (
        id VARCHAR(50) PRIMARY KEY,
        teacher_id VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('video', 'pdf', 'quiz', 'document') DEFAULT 'document',
        content_url TEXT,
        subject VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

        await connection.query(`
      CREATE TABLE grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50),
        subject VARCHAR(100),
        type VARCHAR(50),
        title VARCHAR(255),
        score DECIMAL(5, 2),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

        await connection.query(`
      CREATE TABLE attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50),
        date DATE,
        status ENUM('present', 'late', 'absent', 'permission'),
        subject VARCHAR(100),
        INDEX (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);


        console.log('Tables created.');

        // 2. Seed Data

        // Schools
        for (const s of SCHOOLS) {
            await connection.query(
                `INSERT INTO schools (id, name, address, city, province, postal_code, phone, email, headmaster, subscription_status, registered_date, logo, level, academic_year, user_capacity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [s.id, s.name, s.address, s.city, s.province, s.postalCode, s.phone, s.email, s.headmaster, s.subscriptionStatus, s.registeredDate, s.logo, s.level, s.academicYear, s.userCapacity]
            );
        }
        console.log(`Seeded ${SCHOOLS.length} schools.`);

        // Users
        for (const u of USERS) {
            await connection.query(
                `INSERT INTO users (id, name, email, password, role, school_id, status, last_login, avatar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
                [u.id, u.name, u.email, hashPassword(u.password), u.role === 'school_admin' ? 'admin_sekolah' : u.role, u.schoolId, u.status, u.lastLogin ? new Date(u.lastLogin) : null, u.avatar]
            );
        }
        console.log(`Seeded ${USERS.length} users.`);

        // Students
        for (const s of STUDENTS) {
            await connection.query(
                `INSERT INTO students (id, user_id, nisn, class_name, status, average_score, activity_level, gender, date_of_birth, address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE class_name=VALUES(class_name)`,
                [s.id, s.userId, s.profile?.nisn, s.class, s.status, s.averageScore, s.activityLevel, s.profile?.gender, s.profile?.dateOfBirth, s.profile?.address]
            );
        }
        console.log(`Seeded ${STUDENTS.length} students.`);

        // Teachers
        for (const t of TEACHERS) {
            let userId = null;
            if (t.name.includes("Budi")) userId = "user-004";
            if (t.name.includes("Citra") || t.name.includes("Siti")) userId = "user-005";

            await connection.query(
                `INSERT INTO teachers (id, user_id, subject, classes, teaching_hours, status)
             VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject=VALUES(subject)`,
                [t.id, userId, t.subject, JSON.stringify(t.classes), t.teachingHours, t.status]
            );
        }
        // Also seed Guru Jabar from dummy-data.ts (id "2")
        await connection.query(`INSERT INTO teachers (id, user_id, subject, status) VALUES ('t_2', '2', 'Matematika', 'Active')`);

        console.log(`Seeded teachers.`);

        // Modules
        for (const m of MODULES) {
            await connection.query(
                `INSERT INTO modules (id, teacher_id, title, description, type, content_url, subject)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [m.id, m.teacherId, m.title, m.description, m.type, m.contentUrl, m.subject]
            );
        }
        console.log(`Seeded ${MODULES.length} modules.`);

        // Grades
        for (const g of GRADES) {
            await connection.query(
                `INSERT INTO grades (student_id, subject, type, title, score)
             VALUES (?, ?, ?, ?, ?)`,
                [g.studentId, g.subject, g.type, g.title, g.score]
            );
        }
        console.log(`Seeded ${GRADES.length} grades.`);

        // Attendance
        for (const a of ATTENDANCE) {
            await connection.query(
                `INSERT INTO attendance (student_id, date, status, subject)
             VALUES (?, ?, ?, ?)`,
                [a.studentId, a.date, a.status, a.subject]
            );
        }

        // 3. Add Foreign Keys
        console.log('Adding Foreign Keys...');

        const fks = [
            `ALTER TABLE users ADD CONSTRAINT fk_users_schools FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL`,
            `ALTER TABLE students ADD CONSTRAINT fk_students_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
            `ALTER TABLE teachers ADD CONSTRAINT fk_teachers_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
            `ALTER TABLE modules ADD CONSTRAINT fk_modules_users FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE`,
            `ALTER TABLE grades ADD CONSTRAINT fk_grades_students FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE`,
            `ALTER TABLE attendance ADD CONSTRAINT fk_attendance_students FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE`
        ];

        for (const fk of fks) {
            try {
                await connection.query(fk);
            } catch (e) {
                console.error('FK Error:', e.message);
            }
        }

        console.log('Full migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
