import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";
import { quizzes, Quiz, Question, AnswerChoice } from "./store";
import pool from "../../../../lib/db";
import { z } from "zod";
import crypto from "crypto";

// ✅ Fixed validation schema to match Quiz interface exactly
const answerChoiceSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Choice text is required"),
});

const questionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(["multiple_choice", "essay"]),
  points: z.number().min(1).optional().default(10),
  choices: z.array(answerChoiceSchema).optional(),
  correctAnswer: z.string().optional(),
  // Essay specific fields - optional to match store
  sampleAnswer: z.string().optional(),
  maxScore: z.number().min(1).max(100).optional(),
  weight: z.number().min(1).max(100).optional(),
  rubric: z.string().optional(),
});

const createQuizSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long").max(200),
  description: z.string().max(1000).optional().default(""),
  subject: z.string().min(1, "Subject is required").max(100),
  duration: z.number().min(5).max(300).optional().default(60),
  maxAttempts: z.number().min(1).max(10).optional().default(1),
  showResults: z.boolean().optional().default(true),
  randomizeQuestions: z.boolean().optional().default(false),
  passingScore: z.number().min(0).max(100).optional().default(70),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  instructions: z.string().max(2000).optional(),
  allowReview: z.boolean().optional().default(true),
  shuffleAnswers: z.boolean().optional().default(false),
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required"),
});

// GET all quizzes for the logged-in teacher
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Query from MySQL database
    let connection;
    try {
      connection = await pool.getConnection();
      const [dbQuizzes]: [any[], any] = await connection.query(
        "SELECT * FROM quizzes WHERE teacher_id = ? ORDER BY created_at DESC",
        [session.userId]
      );

      if (dbQuizzes && dbQuizzes.length > 0) {
        // Sync with in-memory map
        dbQuizzes.forEach((q: any) => {
          if (!quizzes.has(q.id)) {
            quizzes.set(q.id, {
              id: q.id,
              teacherId: q.teacher_id,
              title: q.title,
              description: q.description || "",
              subject: q.subject || "Umum",
              questions: [],
              createdAt: q.created_at,
              updatedAt: q.updated_at,
              duration: q.duration || 60,
              isActive: Boolean(q.is_active),
            } as any);
          }
        });
      }
    } catch (dbErr) {
      console.warn("Could not query quizzes from MySQL, using store:", dbErr);
    } finally {
      if (connection) connection.release();
    }

    const allQuizzes = Array.from(quizzes.values());
    const teacherQuizzes = allQuizzes.filter(
      (quiz) => quiz.teacherId === session.userId
    );

    teacherQuizzes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(teacherQuizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST a new quiz
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const parseResult = createQuizSchema.safeParse(body);

    if (!parseResult.success) {
      console.error("Zod validation error:", JSON.stringify(parseResult.error.flatten().fieldErrors, null, 2));
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input data.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;

    // ✅ Process questions - Fixed essay handling
    const processedQuestions: Question[] = validatedData.questions.map(
      (q): Question => {
        const questionId = `q-${crypto.randomBytes(4).toString("hex")}`;

        if (q.questionType === "multiple_choice") {
          if (!q.choices || !q.correctAnswer) {
            throw new Error(
              "Multiple choice questions require choices and correctAnswer"
            );
          }

          const choices: AnswerChoice[] = q.choices.map((c) => ({
            id: c.id || `c-${crypto.randomBytes(4).toString("hex")}`,
            text: c.text,
          }));

          const correctAnswerId = choices.find(
            (c) => c.text === q.correctAnswer
          )?.id;

          return {
            id: questionId,
            questionText: q.questionText,
            questionType: "multiple_choice",
            choices: choices,
            correctAnswer: correctAnswerId,
            points: q.points,
          };
        } else {
          // Essay question - match store structure exactly
          return {
            id: questionId,
            questionText: q.questionText,
            questionType: "essay",
            points: q.points,
            sampleAnswer: q.sampleAnswer,
            maxScore: q.maxScore,
            weight: q.weight,
            rubric: q.rubric,
          };
        }
      }
    );

    const totalPoints = processedQuestions.reduce(
      (sum, q) => sum + (q.points || 10),
      0
    );

    const newQuiz: Quiz = {
      id: `quiz-${crypto.randomBytes(4).toString("hex")}`,
      teacherId: session.userId,
      title: validatedData.title,
      description: validatedData.description,
      subject: validatedData.subject,
      questions: processedQuestions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: 0,
      isActive: true,
      averageScore: 0,
      duration: validatedData.duration,
      maxAttempts: validatedData.maxAttempts,
      showResults: validatedData.showResults,
      randomizeQuestions: validatedData.randomizeQuestions,
      passingScore: validatedData.passingScore,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      instructions: validatedData.instructions,
      totalPoints,
      allowReview: validatedData.allowReview,
      shuffleAnswers: validatedData.shuffleAnswers,
    };

    quizzes.set(newQuiz.id, newQuiz);

    // Persist to MySQL database
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(
        `INSERT INTO quizzes (id, teacher_id, title, description, subject, duration, max_attempts, passing_score, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newQuiz.id,
          session.userId,
          newQuiz.title,
          newQuiz.description || null,
          newQuiz.subject,
          newQuiz.duration || 60,
          newQuiz.maxAttempts || 1,
          newQuiz.passingScore || 70,
          1,
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );

      for (const q of processedQuestions) {
        await conn.query(
          `INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, points, choices, correct_answer)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            q.id,
            newQuiz.id,
            q.questionText,
            q.questionType,
            q.points || 10,
            q.choices ? JSON.stringify(q.choices) : null,
            q.correctAnswer || null,
          ]
        );
      }
    } catch (dbErr) {
      console.warn("Could not persist quiz to MySQL:", dbErr);
    } finally {
      if (conn) conn.release();
    }

    console.log(
      `✅ Quiz created successfully: ${newQuiz.id} by teacher ${session.userId}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Quiz created successfully",
        quiz: newQuiz,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON format" },
        { status: 400 }
      );
    }

    console.error("Error creating quiz:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ Fixed PUT update method
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { quizId, ...updateData } = body;

    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const existingQuiz = quizzes.get(quizId);

    if (!existingQuiz) {
      return NextResponse.json(
        { success: false, message: "Quiz not found" },
        { status: 404 }
      );
    }

    if (existingQuiz.teacherId !== session.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You can only update your own quizzes",
        },
        { status: 403 }
      );
    }

    const updateSchema = createQuizSchema.partial();
    const parseResult = updateSchema.safeParse(updateData);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid update data.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedUpdates = parseResult.data;

    // ✅ Process questions if provided - Fixed essay handling
    let processedQuestions: Question[] | undefined = undefined;
    if (validatedUpdates.questions) {
      processedQuestions = validatedUpdates.questions.map((q): Question => {
        const questionId = q.id || `q-${crypto.randomBytes(4).toString("hex")}`;

        if (q.questionType === "multiple_choice") {
          if (!q.choices || !q.correctAnswer) {
            throw new Error(
              "Multiple choice questions require choices and correctAnswer"
            );
          }

          const choices: AnswerChoice[] = q.choices.map((c) => ({
            id: c.id || `c-${crypto.randomBytes(4).toString("hex")}`,
            text: c.text,
          }));

          const correctAnswerId = choices.find(
            (c) => c.text === q.correctAnswer
          )?.id;

          return {
            id: questionId,
            questionText: q.questionText,
            questionType: "multiple_choice",
            choices: choices,
            correctAnswer: correctAnswerId,
            points: q.points,
          };
        } else {
          // Essay question - match store structure exactly
          return {
            id: questionId,
            questionText: q.questionText,
            questionType: "essay",
            points: q.points,
            sampleAnswer: q.sampleAnswer,
            maxScore: q.maxScore,
            weight: q.weight,
            rubric: q.rubric,
          };
        }
      });
    }

    const updatedQuiz: Quiz = {
      ...existingQuiz,
      ...validatedUpdates,
      questions: processedQuestions || existingQuiz.questions,
      updatedAt: new Date().toISOString(),
      totalPoints: processedQuestions
        ? processedQuestions.reduce((sum, q) => sum + (q.points || 10), 0)
        : existingQuiz.totalPoints,
    };

    quizzes.set(quizId, updatedQuiz);

    return NextResponse.json({
      success: true,
      message: "Quiz updated successfully",
      quiz: updatedQuiz,
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH toggle quiz active status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const existingQuiz = quizzes.get(quizId);

    if (!existingQuiz) {
      return NextResponse.json(
        { success: false, message: "Quiz not found" },
        { status: 404 }
      );
    }

    if (existingQuiz.teacherId !== session.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You can only modify your own quizzes",
        },
        { status: 403 }
      );
    }

    let updatedQuiz: Quiz;

    if (action === "toggle-active") {
      updatedQuiz = {
        ...existingQuiz,
        isActive: !existingQuiz.isActive,
        updatedAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    quizzes.set(quizId, updatedQuiz);

    return NextResponse.json({
      success: true,
      message: `Quiz ${
        updatedQuiz.isActive ? "activated" : "deactivated"
      } successfully`,
      quiz: updatedQuiz,
    });
  } catch (error) {
    console.error("Error updating quiz status:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
