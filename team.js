let currentUser = null;
let teamData = { sections: [] };
let editingContext = null;

function isAdminUser() {
  return currentUser && currentUser.discord && currentUser.discord.id === "1367884161393758381";
}

async function fetchTeamData() {
  const res = await fetch("/api/team");
  teamData = await res.json();
}

async function postTeamAction(payload) {
  try {
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      alert("Save failed: " + (errBody.error || res.status + " " + res.statusText));
      return null;
    }
    teamData = await res.json();
    return teamData;
  } catch (err) {
    alert("Save failed: network error. Check your connection and try again.");
    return null;
  }
}

function cardDiscordUrl(discordUserId) {
  return `https://discord.com/users/${discordUserId}`;
}

function renderCard(card, section) {
  const wrap = document.createElement("div");
  wrap.className = "team-card";

  const avatar = document.createElement("div");
  avatar.className = "team-card-avatar";
  if (card.robloxAvatarUrl) {
    const img = document.createElement("img");
    img.src = card.robloxAvatarUrl;
    img.alt = card.name;
    avatar.appendChild(img);
  }

  const info = document.createElement("div");
  info.className = "team-card-info";

  const name = document.createElement("span");
  name.className = "team-card-name";
  name.textContent = card.name;
  info.appendChild(name);

  if (card.role) {
    const role = document.createElement("span");
    role.className = "team-card-role";
    role.textContent = card.role;
    info.appendChild(role);
  }

  if (card.robloxUsername) {
    const roblox = document.createElement("span");
    roblox.className = "team-card-sub";
    roblox.textContent = "@" + card.robloxUsername;
    info.appendChild(roblox);
  }

  const actions = document.createElement("div");
  actions.className = "team-card-actions";

  if (card.discordUserId) {
    const discordBtn = document.createElement("a");
    discordBtn.href = cardDiscordUrl(card.discordUserId);
    discordBtn.target = "_blank";
    discordBtn.rel = "noopener";
    discordBtn.className = "chip-btn";
    discordBtn.textContent = "Discord";
    actions.appendChild(discordBtn);
  }

  if (card.email) {
    const emailBtn = document.createElement("a");
    emailBtn.href = "mailto:" + card.email;
    emailBtn.className = "chip-btn";
    emailBtn.textContent = "Email";
    actions.appendChild(emailBtn);
  }

  wrap.appendChild(avatar);
  wrap.appendChild(info);
  wrap.appendChild(actions);

  if (isAdminUser()) {
    const editBtn = document.createElement("button");
    editBtn.className = "team-card-edit";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openCardModal(section, card));
    wrap.appendChild(editBtn);
  }

  return wrap;
}

function renderSection(section) {
  const wrap = document.createElement("div");
  wrap.className = "team-section";

  const header = document.createElement("div");
  header.className = "team-section-header";

  const title = document.createElement("h2");
  title.className = "font-display";
  title.textContent = section.name;
  header.appendChild(title);

  if (isAdminUser()) {
    const controls = document.createElement("div");
    controls.className = "team-section-controls";

    const addCardBtn = document.createElement("button");
    addCardBtn.className = "btn btn-outline btn-small";
    addCardBtn.type = "button";
    addCardBtn.textContent = "+ Add card";
    addCardBtn.addEventListener("click", () => openCardModal(section, null));
    controls.appendChild(addCardBtn);

    const renameBtn = document.createElement("button");
    renameBtn.className = "btn btn-outline btn-small";
    renameBtn.type = "button";
    renameBtn.textContent = "Rename";
    renameBtn.addEventListener("click", async () => {
      const newName = prompt("Section name:", section.name);
      if (newName) await postTeamAction({ action: "renameSection", sectionId: section.id, name: newName });
      renderTeam();
    });
    controls.appendChild(renameBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-outline btn-small btn-danger";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete section";
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this section and all its cards?")) {
        await postTeamAction({ action: "deleteSection", sectionId: section.id });
        renderTeam();
      }
    });
    controls.appendChild(deleteBtn);

    header.appendChild(controls);
  }

  wrap.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "team-cards-grid";

  const rendered = new Set();
  section.cards.forEach((card) => {
    if (rendered.has(card.id)) return;

    const pairedCard = section.cards.find((c) => c.inlineWith === card.id);
    const isPairedTarget = section.cards.some((c) => c.id === card.inlineWith);

    if (isPairedTarget) return;

    if (pairedCard) {
      const row = document.createElement("div");
      row.className = "team-card-row";
      row.appendChild(renderCard(card, section));
      row.appendChild(renderCard(pairedCard, section));
      grid.appendChild(row);
      rendered.add(card.id);
      rendered.add(pairedCard.id);
    } else {
      grid.appendChild(renderCard(card, section));
      rendered.add(card.id);
    }
  });

  wrap.appendChild(grid);
  return wrap;
}

function renderTeam() {
  const container = document.getElementById("team-sections");
  container.innerHTML = "";

  if (teamData.sections.length === 0) {
    const empty = document.createElement("p");
    empty.className = "team-empty";
    empty.textContent = isAdminUser()
      ? "No sections yet. Add one to get started."
      : "The team page hasn't been set up yet.";
    container.appendChild(empty);
  }

  teamData.sections.forEach((section) => {
    container.appendChild(renderSection(section));
  });

  const adminBar = document.getElementById("admin-bar");
  adminBar.hidden = !isAdminUser();
}

function openCardModal(section, card) {
  editingContext = { section, card };
  document.getElementById("card-modal-title").textContent = card ? "Edit member" : "Add member";
  document.getElementById("card-name").value = card ? card.name : "";
  document.getElementById("card-role").value = card ? (card.role || "") : "";
  document.getElementById("card-roblox-username").value = card ? card.robloxUsername : "";
  document.getElementById("card-roblox-id").value = card ? card.robloxUserId : "";
  document.getElementById("card-discord-id").value = card ? card.discordUserId : "";
  document.getElementById("card-email").value = card ? card.email : "";

  const inlineCheckbox = document.getElementById("card-inline");
  const inlineSelect = document.getElementById("card-inline-target");
  inlineSelect.innerHTML = "";

  section.cards
    .filter((c) => !card || c.id !== card.id)
    .forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      inlineSelect.appendChild(opt);
    });

  const hasInline = card && card.inlineWith;
  inlineCheckbox.checked = !!hasInline;
  inlineSelect.hidden = !hasInline;
  if (hasInline) inlineSelect.value = card.inlineWith;

  document.getElementById("card-modal").hidden = false;
}

function closeCardModal() {
  document.getElementById("card-modal").hidden = true;
  editingContext = null;
}

function wireModal() {
  document.getElementById("card-cancel").addEventListener("click", closeCardModal);

  document.getElementById("card-inline").addEventListener("change", (e) => {
    document.getElementById("card-inline-target").hidden = !e.target.checked;
  });

  document.getElementById("card-save").addEventListener("click", async () => {
    if (!editingContext) return;
    const { section, card } = editingContext;

    const payload = {
      name: document.getElementById("card-name").value.trim(),
      role: document.getElementById("card-role").value.trim(),
      robloxUsername: document.getElementById("card-roblox-username").value.trim(),
      robloxUserId: document.getElementById("card-roblox-id").value.trim(),
      discordUserId: document.getElementById("card-discord-id").value.trim(),
      email: document.getElementById("card-email").value.trim(),
      inlineWith: document.getElementById("card-inline").checked
        ? document.getElementById("card-inline-target").value
        : null,
    };

    if (!payload.name) {
      alert("Name is required.");
      return;
    }

    if (card) {
      await postTeamAction({ action: "updateCard", sectionId: section.id, cardId: card.id, ...payload });
    } else {
      await postTeamAction({ action: "addCard", sectionId: section.id, ...payload });
    }

    closeCardModal();
    await fetchTeamData();
    renderTeam();
  });
}

function wireAdminBar() {
  document.getElementById("add-section-btn").addEventListener("click", async () => {
    const name = prompt("Section name:");
    if (name) {
      await postTeamAction({ action: "addSection", name });
      renderTeam();
    }
  });
}

async function initTeamPage(data) {
  currentUser = data;
  await fetchTeamData();
  wireModal();
  wireAdminBar();
  renderTeam();
}
