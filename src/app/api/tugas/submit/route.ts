import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";
import { submissions, type Submission } from "../store";
import fs from "fs";
import path from "path";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXT = [
  ".zip",
  ".rar",
  ".7z",
  ".txt",
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".xlsx",
  ".xls",
];

function extFromName(name = "") {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function validateFile(file: File) {
  const errors: string[] = [];

  const ext = extFromName(file.name);
  if (!ALLOWED_EXT.includes(ext)) {
    errors.push(
      `File type '${ext}' is not allowed. Allowed types: ${ALLOWED_EXT.join(
        ", "
      )}`
    );
  }

  if (file.size > MAX_SIZE) {
    const sizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    const maxSizeMB = Math.round(MAX_SIZE / (1024 * 1024));
    errors.push(
      `File size ${sizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`
    );
  }

  if (file.size === 0) {
    errors.push("File cannot be empty");
  }

  return errors;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Only students can submit assignments.",
        },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const taskId = (form.get("taskId") as string) || "";

    // Enhanced validation
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Validate file
    const fileErrors = validateFile(file);
    if (fileErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File validation failed",
          details: fileErrors,
        },
        { status: 400 }
      );
    }

    // Check for duplicate submission
    const existingSubmission = Array.from(submissions.values()).find(
      (sub) => sub.userId === session.userId && sub.taskId === taskId
    );

    if (existingSubmission) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already submitted for this assignment",
          existingSubmissionId: existingSubmission.id,
        },
        { status: 409 } // Conflict
      );
    }

    // Save uploaded file to disk instead of keeping large buffers in memory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "submissions");
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeFilename);
    const fileUrl = `/uploads/submissions/${safeFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);

    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create submission object matching Submission interface
    const newSubmission: Submission = {
      id,
      taskId,
      userId: session.userId,
      userName: session.name || "Unknown User",
      filename: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      fileUrl: fileUrl,
      submittedAt: new Date().toISOString(),
      grade: null,
      feedback: null,
    };

    submissions.set(id, newSubmission);

    console.log(
      `✅ Submission successful: ${id} for user ${session.userId} (${session.name}) for task ${taskId}`
    );

    return NextResponse.json({
      success: true,
      submissionId: id,
      message: "File uploaded successfully",
      filename: file.name,
      fileSize: file.size,
      submittedAt: newSubmission.submittedAt,
    });
  } catch (err) {
    console.error("Submission failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
        message:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
