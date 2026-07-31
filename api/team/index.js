import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const DATA_KEY = "sessions:data";
const EXPIRE_AFTER_START_MS = 1000 * 60 * 60 * 3;

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

async function getSessions() {
  const data = await redis.get(DATA_KEY);
  const list = data ? (typeof data === "string" ? JSON.parse(data) : data) : [];
  const now = Date.now();
  const fresh = list.filter((s) => {
    const sessionStartMs = s.unixSeconds * 1000;
    return now - sessionStartMs < EXPIRE_AFTER_START_MS;
  });
  if (fresh.length !== list.length) {
    await redis.set(DATA_KEY, JSON.stringify(fresh));
  }
  return fresh;
}

async function saveSessions(list) {
  await redis.set(DATA_KEY, JSON.stringify(list));
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const sessions = await getSessions();
    return res.status(200).json({ sessions });
  }

  if (req.method === "POST") {
    const authHeader = req.headers.authorization || "";
    const providedKey = authHeader.replace("Bearer ", "");

    if (providedKey !== process.env.BOT_API_KEY) {
      return res.status(403).json({ error: "Invalid API key." });
    }

    const body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");

    if (!body.hostName || !body.category || !body.unixSeconds) {
      return res.status(400).json({ error: "hostName, category, and unixSeconds are required." });
    }

    const sessions = await getSessions();
    const newSession = {
      id: body.sessionId || genId(),
      hostName: body.hostName,
      hostId: body.hostId || null,
      category: body.category,
      unixSeconds: body.unixSeconds,
      description: body.description || "",
      status: body.status || "Pending",
      createdAt: Date.now(),
    };
    sessions.push(newSession);
    await saveSessions(sessions);

    return res.status(200).json({ session: newSession });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
