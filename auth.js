const DISCORD_CLIENT_ID = "1530349314625507409";
const REDIRECT_URI = window.location.origin + "/api/auth/callback";
const DISCORD_AUTH_URL =
  "https://discord.com/api/oauth2/authorize" +
  "?client_id=" + DISCORD_CLIENT_ID +
  "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) +
  "&response_type=code" +
  "&scope=identify";

function initAccountWidget(onLoggedIn) {
  const loginButtons = document.querySelectorAll(
    "#discord-login-nav, #discord-login-hero, #discord-login-footer"
  );
  loginButtons.forEach((btn) => {
    btn.href = DISCORD_AUTH_URL;
  });

  const accountWidget = document.getElementById("account-widget");
  const accountToggle = document.getElementById("account-toggle");
  const accountMenu = document.getElementById("account-menu");
  const accountAvatar = document.getElementById("account-avatar");
  const accountName = document.getElementById("account-name");
  const accountDisconnect = document.getElementById("account-disconnect");

  if (accountToggle) {
    accountToggle.addEventListener("click", () => {
      accountMenu.hidden = !accountMenu.hidden;
    });
  }

  document.addEventListener("click", (e) => {
    if (accountWidget && !accountWidget.contains(e.target)) {
      accountMenu.hidden = true;
    }
  });

  if (accountDisconnect) {
    accountDisconnect.addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  }

  fetch("/api/auth/me")
    .then((r) => r.json())
    .then((data) => {
      if (data.loggedIn) {
        const discordName = data.discord.global_name || data.discord.username;
        const discordAvatarUrl = data.discord.avatar
          ? `https://cdn.discordapp.com/avatars/${data.discord.id}/${data.discord.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/0.png`;

        loginButtons.forEach((btn) => (btn.hidden = true));

        if (accountWidget) {
          accountWidget.hidden = false;
          accountName.textContent = discordName;
          accountAvatar.src = discordAvatarUrl;
        }

        if (typeof onLoggedIn === "function") {
          onLoggedIn(data, discordName, discordAvatarUrl);
        }
      } else if (typeof onLoggedIn === "function") {
        onLoggedIn(null);
      }
    })
    .catch(() => {
      if (typeof onLoggedIn === "function") onLoggedIn(null);
    });
}
