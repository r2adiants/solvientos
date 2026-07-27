// /api/auth/me.js
// Reads the session cookie set during OAuth and returns it as JSON
// so the frontend can display "logged in as ..." without exposing tokens.

export default function handler(req, res) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/solviento_session=([^;]+)/);

  if (!match) {
    return res.status(200).json({ loggedIn: false });
  }

  try {
    const payload = JSON.parse(Buffer.from(match[1], "base64").toString("utf-8"));
    return res.status(200).json({ loggedIn: true, ...payload });
  } catch (err) {
    return res.status(200).json({ loggedIn: false });
  }
}
