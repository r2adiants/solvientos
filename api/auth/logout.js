export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    "solviento_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.status(200).json({ loggedOut: true });
}
