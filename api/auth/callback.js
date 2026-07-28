// /api/auth/callback.js
// Vercel serverless function. Handles the Discord OAuth2 redirect,
// exchanges the code for a token, fetches the Discord profile,
// then looks up the linked Roblox account via Bloxlink.
//
// Required environment variables (set these in Vercel Project Settings > Environment Variables):
//   DISCORD_CLIENT_ID     - your Discord application's client ID
//   DISCORD_CLIENT_SECRET - your Discord application's client secret
//   DISCORD_REDIRECT_URI  - must exactly match what's set in the Discord Developer Portal,
//                            e.g. https://yourdomain.com/api/auth/callback
//   BLOXLINK_API_KEY      - your Bloxlink API key

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing OAuth code.");
  }

  try {
    // 1. Exchange the authorization code for an access token
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

    // 2. Fetch the Discord user's profile
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("Discord user fetch failed:", errText);
      return res.status(502).send("Failed to fetch Discord profile.");
    }

    const discordUser = await userRes.json();

    // 3. Look up the linked Roblox account via Bloxlink (Server API — requires guild ID)
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

    // 4. Package up a small session payload.
    // NOTE: this demo stores the session client-side in a cookie for simplicity.
    // For anything beyond a prototype, swap this for a signed/opaque session
    // (e.g. a database-backed session id) rather than trusting a raw cookie.
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

    // 5. Redirect back to the homepage
    res.writeHead(302, { Location: "/" });
    res.end();
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Something went wrong during login.");
  }
}
