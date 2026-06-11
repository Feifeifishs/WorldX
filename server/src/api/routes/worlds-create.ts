import { Router } from "express";
import type { Request, Response } from "express";
import {
  createJobManager,
  JobConflictError,
  type JobEvent,
} from "../../core/create-job-manager.js";

const router = Router();

router.post("/create", (req, res) => {
  const mode = req.body?.mode === "proxy_classroom" ? "proxy_classroom" : "world";
  const proxyClassroom =
    mode === "proxy_classroom"
      ? sanitizeProxyClassroomPayload(req.body?.proxyClassroom)
      : undefined;
  const prompt =
    mode === "proxy_classroom" && proxyClassroom
      ? buildProxyClassroomPrompt(proxyClassroom)
      : typeof req.body?.prompt === "string"
        ? req.body.prompt
        : "";
  const sizeKRaw = req.body?.sizeK;
  const sizeK = Number(sizeKRaw) as 1 | 2 | 4;
  const keepArtifacts = req.body?.keepArtifacts === true;

  if (mode === "proxy_classroom" && (!proxyClassroom || proxyClassroom.students.length === 0)) {
    res.status(400).json({ error: "at least one student is required for proxy classroom mode" });
    return;
  }
  if (!prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (![1, 2, 4].includes(sizeK)) {
    res.status(400).json({ error: "sizeK must be 1, 2, or 4" });
    return;
  }

  try {
    const { jobId } = createJobManager.startJob({
      prompt,
      sizeK,
      keepArtifacts,
      mode,
      proxyClassroom,
    });
    res.json({ ok: true, jobId });
  } catch (err) {
    if (err instanceof JobConflictError) {
      res.status(409).json({
        error: "Another generation is already running",
        activeJobId: err.activeJobId,
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

type SocialSafetyLevel = "gentle" | "very_gentle" | "guided";

interface ProxyClassroomStudentPayload {
  name: string;
  interests: string;
  favoriteMusic: string;
  comfortTopics: string;
  socialSafetyLevel: SocialSafetyLevel;
  notes: string;
}

interface ProxyClassroomPayload {
  schoolName: string;
  schoolUrl: string;
  students: ProxyClassroomStudentPayload[];
}

function sanitizeProxyClassroomPayload(raw: unknown): ProxyClassroomPayload {
  const obj = isRecord(raw) ? raw : {};
  const studentsRaw = Array.isArray(obj.students) ? obj.students : [];
  const students = studentsRaw
    .slice(0, 12)
    .map((student, index) => sanitizeStudent(student, index))
    .filter((student) =>
      Boolean(
        student.name ||
        student.interests ||
        student.favoriteMusic ||
        student.comfortTopics ||
        student.notes,
      ),
    );

  return {
    schoolName: sanitizeText(obj.schoolName, 80) || "代理教室",
    schoolUrl: sanitizeHttpUrl(obj.schoolUrl),
    students,
  };
}

function sanitizeStudent(raw: unknown, index: number): ProxyClassroomStudentPayload {
  const obj = isRecord(raw) ? raw : {};
  return {
    name: sanitizeText(obj.name, 40) || `学生${index + 1}`,
    interests: sanitizeText(obj.interests, 160),
    favoriteMusic: sanitizeText(obj.favoriteMusic, 120),
    comfortTopics: sanitizeText(obj.comfortTopics, 160),
    socialSafetyLevel: normalizeSocialSafetyLevel(obj.socialSafetyLevel),
    notes: sanitizeText(obj.notes, 160),
  };
}

function buildProxyClassroomPrompt(payload: ProxyClassroomPayload): string {
  const studentLines = payload.students
    .map((student, index) =>
      [
        `${index + 1}. ${student.name}`,
        student.interests ? `兴趣: ${student.interests}` : "",
        student.favoriteMusic ? `喜欢的音乐: ${student.favoriteMusic}` : "",
        student.comfortTopics ? `想聊/舒适话题: ${student.comfortTopics}` : "",
        `交流安全等级: ${student.socialSafetyLevel}`,
        student.notes ? `备注: ${student.notes}` : "",
      ].filter(Boolean).join("；"),
    )
    .join("\n");

  const landmarkLine = payload.schoolUrl
    ? `学校地标建筑需要包含“${payload.schoolName}”，并把 externalUrl 设置为 ${payload.schoolUrl}。`
    : `学校地标建筑需要包含“${payload.schoolName}”。`;

  return [
    "创建一个独立的代理教室模式世界，而不是普通自由 prompt 世界。",
    "用户只提供了学生基础资料；请据此生成安全班级或校园兴趣小镇。",
    landmarkLine,
    "角色决策要基于共同兴趣、舒适话题和 socialSafetyLevel，避免排挤、羞辱、危险刺激和强迫深聊。",
    "学生资料：",
    studentLines,
  ].join("\n");
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeHttpUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeSocialSafetyLevel(value: unknown): SocialSafetyLevel {
  return value === "very_gentle" || value === "guided" || value === "gentle"
    ? value
    : "gentle";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

router.get("/jobs/current", (_req, res) => {
  const jobId = createJobManager.getCurrentJobId();
  if (!jobId) {
    res.json({ jobId: null });
    return;
  }
  res.json({ jobId, snapshot: createJobManager.getSnapshot(jobId) });
});

router.get("/jobs/:jobId", (req, res) => {
  const snapshot = createJobManager.getSnapshot(String(req.params.jobId));
  if (!snapshot) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(snapshot);
});

router.post("/jobs/:jobId/cancel", (req, res) => {
  try {
    createJobManager.cancelJob(String(req.params.jobId));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Job not found" ? 404 : 409;
    res.status(status).json({ error: message });
  }
});

router.get("/jobs/:jobId/events", (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);
  const snapshot = createJobManager.getSnapshot(jobId);
  if (!snapshot) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const writeEvent = (event: JobEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Socket likely closed; listener cleanup happens in close handler.
    }
  };

  for (const event of createJobManager.getHistory(jobId)) {
    writeEvent(event);
  }

  if (snapshot.status !== "running") {
    res.end();
    return;
  }

  const listener = (eventJobId: string, event: JobEvent) => {
    if (eventJobId !== jobId) return;
    writeEvent(event);
    if (event.kind === "job_done" || event.kind === "job_error") {
      // Give the client a moment to flush, then close the stream.
      setTimeout(() => res.end(), 50);
    }
  };

  createJobManager.on("event", listener);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping ${Date.now()}\n\n`);
    } catch {
      // Ignore; cleanup handled on close.
    }
  }, 15_000);
  heartbeat.unref?.();

  req.on("close", () => {
    createJobManager.off("event", listener);
    clearInterval(heartbeat);
  });
});

export default router;
