import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_DISCORD_ID = "1367884161393758381";
const DATA_KEY = "team:data";

function getSessionFromCookie(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/solviento_session=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(match[1], "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

function isAdmin(session) {
  return !!session && !!session.discord && session.discord.id === ADMIN_DISCORD_ID;
}

async function getData() {
  const data = await redis.get(DATA_KEY);
  if (!data) {
    return { sections: [] };
  }
  return typeof data === "string" ? JSON.parse(data) : data;
}

async function saveData(data) {
  await redis.set(DATA_KEY, JSON.stringify(data));
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const data = await getData();
    return res.status(200).json(data);
  }

  const session = getSessionFromCookie(req);
  if (!isAdmin(session)) {
    return res.status(403).json({ error: "Not authorized." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  const data = await getData();

  if (req.method === "POST" && body.action === "addSection") {
    data.sections.push({
      id: genId(),
      name: body.name || "New Section",
      cards: [],
    });
    await saveData(data);
    return res.status(200).json(data);
  }

  if (req.method === "POST" && body.action === "renameSection") {
    const section = data.sections.find((s) => s.id === body.sectionId);
    if (section) section.name = body.name;
    await saveData(data);
    return res.status(200).json(data);
  }

  if (req.method === "POST" && body.action === "deleteSection") {
    data.sections = data.sections.filter((s) => s.id !== body.sectionId);
    await saveData(data);
    return res.status(200).json(data);
  }

  if (req.method === "POST" && body.action === "reorderSections") {
    const order = body.order || [];
    data.sections.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    await saveData(data);
    return res.status(200).json(data);
  }

  if (req.method === "POST" && body.action === "addCard") {
    const section = data.sections.find((s) => s.id === body.sectionId);
    if (section) {
      section.cards.push({
        id: genId(),
        name: body.name || "New Member",
        role: body.role || "",
        photoUrl: body.photoUrl || "",
        robloxUsername: body.robloxUsername || "",
        discordUserId: body.discordUserId || "",
        email: body.email || "",
        inlineWith: body.inlineWith || null,
      });
    }
    await saveData(data);
    return res.status(200).json(data);
  }

  if (req.method === "POST" && body.action === "updateCard") {
    const section = data.sections.find((s) => s.id === body.sectionId);
    if (section) {
      const card = section.cards.find((c) => c.id === body.cardId);
      if (card) {
        card.name = body.name ?? card.name;
        card.role = body.role ?? card.role;
        card.photoUrl = body.photoUrl ?? card.photoUrl;
        card.robloxUsername = body.robloxUsername ?? card.robloxUsername;
        card.discordUserId = body.discordUserId ?? card.discordUserId;
        card.email = body.email ?? card.email;
        card.inlineWith = body.inlineWith !== undefined ? body.inlineWith : card.inlineWith;
      }
    }
    await saveData(data);
    return res.status(200).json(data);
  }

  if (req.method === "POST" && body.action === "deleteCard") {
    const section = data.sections.find((s) => s.id === body.sectionId);
    if (section) {
      section.cards = section.cards.filter((c) => c.id !== body.cardId);
      section.cards.forEach((c) => {
        if (c.inlineWith === body.cardId) c.inlineWith = null;
      });
    }
    await saveData(data);
    return res.status(200).json(data);
  }

  return res.status(400).json({ error: "Unknown action." });
}
