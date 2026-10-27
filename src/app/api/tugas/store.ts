
// This file acts as a mock in-memory database for development.
// In a real application, this would be replaced by a proper database like PostgreSQL, MongoDB, etc.

// This is the unified Assignment interface based on what the frontend components expect.
export type AssignmentType = "essay" | "quiz" | "project" | "presentation";
export type AssignmentPriority = "High" | "Medium" | "Low";

export interface Assignment {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  dueDate: string | undefined;
  createdAt: string;
  status: string; // "Aktif", "Selesai", "Telah Dinilai"
  submissions: number;
  totalStudents: number;
  priority: string; // "High", "Medium", "Low"
  type?: AssignmentType;
  points?: number;
}

export interface Submission {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  filename: string;
  size: number;
  mimeType: string;
  data?: Uint8Array; // In a real DB, this would be a URL to stored file
  fileUrl?: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
}

// Map to store assignments created by teachers
// Key: assignmentId (string), Value: Assignment (object)
export const assignments = new Map<string, Assignment>();

// Map to store student submissions
// Key: submissionId (string), Value: Submission (object)
export const submissions = new Map<string, Submission>();

// A teacher creates an assignment
const seedAssignmentId = "task-bio-01";
assignments.set(seedAssignmentId, {
  id: seedAssignmentId,
  teacherId: "2", // Corresponds to 'guru@sekolah.id'
  title: "Laporan Praktikum Sel",
  description:
    "Buatlah laporan praktikum mengenai pengamatan sel hewan dan tumbuhan.",
  subject: "Biologi",
  className: "Biologi-1",
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  status: "Aktif",
  submissions: 15,
  totalStudents: 25,
  priority: "High",
});

const seedAssignmentId2 = "task-mtk-01";
assignments.set(seedAssignmentId2, {
  id: seedAssignmentId2,
  teacherId: "2",
  title: "Latihan Soal Trigonometri",
  description: "Kerjakan soal-soal di buku paket halaman 50.",
  subject: "Matematika",
  className: "Matematika-1",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  status: "Aktif",
  submissions: 28,
  totalStudents: 30,
  priority: "Medium",
});

// A student submits their work
const seedSubmissionId = "sub-student-01";
submissions.set(seedSubmissionId, {
  id: seedSubmissionId,
  taskId: seedAssignmentId,
  userId: "1", // Corresponds to 'murid@sekolah.id'
  userName: "Siswa Rajin",
  filename: "laporan_praktikum_sel_siswa_rajin.pdf",
  size: 1024 * 500, // 500 KB
  mimeType: "application/pdf",
  data: new Uint8Array(), // Mock data
  submittedAt: new Date().toISOString(),
  grade: null,
  feedback: null,
});
