export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing OAuth code.");
  }

  try {

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Discord token exchange failed:", errText);
      return res.status(502).send("Discord token exchange failed.");
    }

    const tokenData = await tokenRes.json();


    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("Discord user fetch failed:", errText);
      return res.status(502).send("Failed to fetch Discord profile.");
    }

    const discordUser = await userRes.json();


    let roblox = null;
    try {
      const bloxRes = await fetch(
        `https://api.blox.link/v4/public/guilds/${process.env.DISCORD_GUILD_ID}/discord-to-roblox/${discordUser.id}`,
        { headers: { Authorization: process.env.BLOXLINK_API_KEY } }
      );
      const bloxData = await bloxRes.json();
      console.log("Bloxlink raw response:", JSON.stringify(bloxData));

      if (bloxRes.ok && bloxData.robloxID) {
        roblox = { robloxId: bloxData.robloxID };
      }
    } catch (bloxErr) {
      console.warn("Bloxlink lookup error:", bloxErr);
    }


    const sessionPayload = Buffer.from(
      JSON.stringify({
        discord: {
          id: discordUser.id,
          username: discordUser.username,
          global_name: discordUser.global_name,
          avatar: discordUser.avatar,
        },
        roblox,
      })
    ).toString("base64");

    res.setHeader(
      "Set-Cookie",
      `solviento_session=${sessionPayload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );


    res.writeHead(302, { Location: "/" });
    res.end();
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Something went wrong during login.");
  }
}
