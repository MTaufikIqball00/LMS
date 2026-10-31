export interface TestRoleAccount {
  roleName: 'student' | 'teacher' | 'kepala_sekolah' | 'admin_sekolah' | 'admin_langganan';
  email: string;
  password: string;
  name: string;
  schoolId: string | null;
  schoolName: string | null;
  province: string | null;
  grade?: number;
  expectedLandingPage: string;
  permittedPages: string[];
  forbiddenPages: string[];
}

export const TEST_ACCOUNTS: Record<string, TestRoleAccount> = {
  student_jabar: {
    roleName: 'student',
    email: 'murid.jabar@sekolah.id',
    password: 'password123',
    name: 'Siswa Jabar (Kelas 12)',
    schoolId: 'sch-001',
    schoolName: 'SMA Negeri 1 Bandung',
    province: 'Jawa Barat',
    grade: 12,
    expectedLandingPage: '/dashboard',
    permittedPages: [
      '/dashboard',
      '/attendance',
      '/matapelajaran',
      '/tugas',
      '/tryout',
      '/nilai',
      '/forum',
      '/jadwal',
      '/notifikasi'
    ],
    forbiddenPages: [
      '/teacher/dashboard',
      '/teacher/assignment',
      '/teacher/quizzes',
      '/teacher/attendance',
      '/teacher/analysis',
      '/kepala/dashboard',
      '/admin-sekolah/dashboard',
      '/admin/langganan'
    ]
  },
  student_non_jabar: {
    roleName: 'student',
    email: 'murid.luar@sekolah.id',
    password: 'password123',
    name: 'Siswa Luar Jabar (Kelas 11)',
    schoolId: 'sch-004',
    schoolName: 'SMA Negeri 1 Medan',
    province: 'Sumatera Utara',
    grade: 11,
    expectedLandingPage: '/dashboard',
    permittedPages: [
      '/dashboard',
      '/attendance',
      '/matapelajaran',
      '/tugas',
      '/nilai',
      '/jadwal',
      '/notifikasi'
    ],
    forbiddenPages: [
      '/tryout', // Dibatasi lisensi non-Jabar
      '/forum',  // Dibatasi lisensi non-Jabar
      '/teacher/dashboard',
      '/kepala/dashboard',
      '/admin/langganan'
    ]
  },
  student_grade_10: {
    roleName: 'student',
    email: 'murid.kelas10@sekolah.id',
    password: 'password123',
    name: 'Siswa Kelas 10',
    schoolId: 'sch-002',
    schoolName: 'SMA Negeri 3 Jakarta',
    province: 'DKI Jakarta',
    grade: 10,
    expectedLandingPage: '/dashboard',
    permittedPages: [
      '/dashboard',
      '/attendance',
      '/matapelajaran',
      '/tugas',
      '/nilai',
      '/jadwal'
    ],
    forbiddenPages: [
      '/tryout', // Dibatasi grade & wilayah
      '/teacher/dashboard',
      '/admin/langganan'
    ]
  },
  teacher_jabar: {
    roleName: 'teacher',
    email: 'guru.jabar@sekolah.id',
    password: 'password123',
    name: 'Guru Jabar',
    schoolId: 'sch-001',
    schoolName: 'SMA Negeri 1 Bandung',
    province: 'Jawa Barat',
    expectedLandingPage: '/teacher/dashboard',
    permittedPages: [
      '/teacher/dashboard',
      '/teacher/modules',
      '/teacher/assignment',
      '/teacher/quizzes',
      '/teacher/attendance',
      '/teacher/analysis',
      '/teacher/students',
      '/teacher/discussion'
    ],
    forbiddenPages: [
      '/dashboard', // Halaman khusus murid
      '/attendance',
      '/tryout',
      '/kepala/dashboard',
      '/admin-sekolah/dashboard',
      '/admin/langganan'
    ]
  },
  principal: {
    roleName: 'kepala_sekolah',
    email: 'kepala@sekolah.id',
    password: 'password123',
    name: 'Kepala Sekolah Bandung',
    schoolId: 'sch-001',
    schoolName: 'SMA Negeri 1 Bandung',
    province: 'Jawa Barat',
    expectedLandingPage: '/kepala/dashboard',
    permittedPages: [
      '/kepala/dashboard',
      '/kepala/leaderboard',
      '/kepala/reports',
      '/kepala/teachers',
      '/kepala/students'
    ],
    forbiddenPages: [
      '/dashboard',
      '/teacher/assignment/new',
      '/admin-sekolah/dashboard',
      '/admin/langganan'
    ]
  },
  school_admin: {
    roleName: 'admin_sekolah',
    email: 'admin.sekolah@sekolah.id',
    password: 'password123',
    name: 'Admin Sekolah Bandung',
    schoolId: 'sch-001',
    schoolName: 'SMA Negeri 1 Bandung',
    province: 'Jawa Barat',
    expectedLandingPage: '/admin-sekolah/dashboard',
    permittedPages: [
      '/admin-sekolah/dashboard',
      '/admin-sekolah/students',
      '/admin-sekolah/teachers',
      '/admin-sekolah/headmaster',
      '/admin-sekolah/settings'
    ],
    forbiddenPages: [
      '/dashboard',
      '/teacher/dashboard',
      '/kepala/dashboard',
      '/admin/langganan'
    ]
  },
  super_admin: {
    roleName: 'admin_langganan',
    email: 'admin@langganan.id',
    password: 'password123',
    name: 'Admin Langganan',
    schoolId: null,
    schoolName: null,
    province: null,
    expectedLandingPage: '/admin/langganan',
    permittedPages: [
      '/admin/langganan',
      '/admin/langganan/schools',
      '/admin/langganan/subscriptions',
      '/admin/langganan/packages',
      '/admin/langganan/payments',
      '/admin/langganan/reports',
      '/admin/langganan/activity-logs',
      '/admin/langganan/users',
      // Super admin memiliki privilege bypass pada module sekolah
      '/teacher/dashboard',
      '/kepala/dashboard',
      '/admin-sekolah/dashboard'
    ],
    forbiddenPages: [
      '/dashboard', // Halaman khusus siswa
      '/attendance'
    ]
  }
};
