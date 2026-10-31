"use client";

import { useState, useEffect } from "react";
import type { Submission } from "../../../app/api/tugas/store";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface SubmissionListProps {
  assignmentId: string;
}

// ✅ Fix: Use z.number() instead of z.coerce.number()
const gradeSchema = z.object({
  grade: z.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
  feedback: z.string().optional(),
});

type GradeFormInputs = z.infer<typeof gradeSchema>;

export default function SubmissionList({ assignmentId }: SubmissionListProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GradeFormInputs>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      grade: 0,
      feedback: "",
    },
  });

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/tugas/submissions?taskId=${assignmentId}`
        );
        if (!response.ok) {
          throw new Error("Gagal memuat data pengumpulan");
        }
        const data = await response.json();
        setSubmissions(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmissions();
  }, [assignmentId]);

  const handleGradeSubmit = async (data: GradeFormInputs) => {
    if (!selectedSubmission) return;
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/tugas/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          ...data,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Gagal memberikan nilai";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const updatedSubmission = result.submission || result;

      // Update the local state
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id ? updatedSubmission : sub
        )
      );

      setSuccess("Nilai berhasil disimpan!");

      // Auto close modal after success
      setTimeout(() => {
        closeModal();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setError(null);
    setSuccess(null);
    reset({
      grade: submission.grade || 0,
      feedback: submission.feedback || "",
    });
  };

  const closeModal = () => {
    setSelectedSubmission(null);
    setError(null);
    setSuccess(null);
    reset();
  };

  const downloadFile = (submission: Submission) => {
    try {
      if (!submission.data) return;
      const arrayBuffer = new ArrayBuffer(submission.data.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(submission.data);

      const blob = new Blob([arrayBuffer], { type: submission.mimeType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = submission.filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Gagal mengunduh file. Silakan coba lagi.");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2">Memuat data pengumpulan...</span>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Pengumpulan Tugas
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {submissions.length} siswa telah mengumpulkan tugas
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada pengumpulan
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Belum ada siswa yang mengumpulkan tugas ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold text-sm">
                        {submission.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {submission.userName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(submission.submittedAt).toLocaleDateString(
                          "id-ID",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {submission.filename}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(submission.size)} •{" "}
                            {submission.mimeType.split("/")[1].toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(submission)}
                        className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors duration-200"
                      >
                        Unduh
                      </button>
                    </div>
                  </div>

                  {submission.feedback && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Feedback:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-6 text-right">
                  {submission.grade !== null ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Nilai:
                        </span>
                        <span className="text-2xl font-bold text-green-600">
                          {submission.grade}
                        </span>
                      </div>
                      <button
                        onClick={() => openModal(submission)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors duration-200"
                      >
                        Edit Nilai
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openModal(submission)}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm"
                    >
                      Beri Nilai
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Penilaian Tugas
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedSubmission.userName}
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="m-6 mb-0 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {success}
                </div>
              </div>
            )}

            {/* Modal Body */}
            <form onSubmit={handleSubmit(handleGradeSubmit)} className="p-6">
              <div className="space-y-6">
                {/* Grade Input */}
                <div>
                  <label
                    htmlFor="grade"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Nilai (0-100) *
                  </label>
                  <input
                    id="grade"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    {...register("grade", { valueAsNumber: true })} // ✅ Key fix: valueAsNumber
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-xl font-semibold"
                    placeholder="0-100"
                  />
                  {errors.grade && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.grade.message}
                    </p>
                  )}
                </div>

                {/* Feedback Textarea */}
                <div>
                  <label
                    htmlFor="feedback"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Umpan Balik (Opsional)
                  </label>
                  <textarea
                    id="feedback"
                    {...register("feedback")}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Berikan feedback untuk siswa..."
                  />
                  {errors.feedback && (
                    <p className="text-red-500 text-sm mt-2">
                      {errors.feedback.message}
                    </p>
                  )}
                </div>

                {/* File Info */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File yang dikumpulkan:
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSubmission.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedSubmission.size)} • Dikumpulkan pada{" "}
                    {new Date(selectedSubmission.submittedAt).toLocaleString(
                      "id-ID"
                    )}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 min-w-[120px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Menyimpan...
                    </div>
                  ) : (
                    "Simpan Nilai"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
