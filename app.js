const config = window.MUFC_CONFIG || {};
const hasSupabaseConfig =
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT_REF");

const client = hasSupabaseConfig
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

const demoSubmissions = [
  {
    id: "demo-1",
    title: "The Red Wall",
    description: "观赛会入口的红色灯牌和围巾墙。",
    image_url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=80",
    average_score: 9.2,
    rating_count: 18,
  },
  {
    id: "demo-2",
    title: "Matchday Table",
    description: "球迷桌牌、票根和赛前预测卡。",
    image_url: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80",
    average_score: 8.6,
    rating_count: 11,
  },
  {
    id: "demo-3",
    title: "Away Kit Corner",
    description: "复古客场球衣展示角。",
    image_url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80",
    average_score: 8.9,
    rating_count: 14,
  },
];

const state = {
  session: null,
  submissions: [],
  activeSubmission: null,
  authMode: "login",
};

const els = {
  authToggle: document.querySelector("#authToggle"),
  sessionLabel: document.querySelector("#sessionLabel"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  switchAuth: document.querySelector("#switchAuth"),
  authNotice: document.querySelector("#authNotice"),
  homeView: document.querySelector("#homeView"),
  submitView: document.querySelector("#submitView"),
  detailView: document.querySelector("#detailView"),
  galleryGrid: document.querySelector("#galleryGrid"),
  refreshGallery: document.querySelector("#refreshGallery"),
  submissionForm: document.querySelector("#submissionForm"),
  submitNotice: document.querySelector("#submitNotice"),
  detailContent: document.querySelector("#detailContent"),
  cardTemplate: document.querySelector("#submissionCardTemplate"),
};

function setNotice(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#8f0000" : "";
}

function formatScore(item) {
  if (!item.rating_count) return "暂无评分";
  return `${Number(item.average_score || 0).toFixed(1)} / 10 (${item.rating_count})`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateSessionUi() {
  const user = state.session?.user;
  els.sessionLabel.textContent = user ? user.email : "未登录";
  els.authToggle.textContent = user ? "退出" : "登录";
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.loginForm.classList.toggle("hidden", mode !== "login");
  els.registerForm.classList.toggle("hidden", mode !== "register");
  els.switchAuth.textContent = mode === "login" ? "需要邀请码注册？" : "已有账号登录";
  setNotice(els.authNotice, hasSupabaseConfig ? "" : "当前是演示模式：复制 config.example.js 为 config.js 并填写 Supabase 配置后接入真实后端。");
}

function showView(name) {
  els.homeView.classList.toggle("hidden", name !== "home");
  els.submitView.classList.toggle("hidden", name !== "submit");
  els.detailView.classList.toggle("hidden", name !== "detail");
  window.location.hash = name;
}

function renderGallery() {
  els.galleryGrid.innerHTML = "";

  if (!state.submissions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "还没有作品，成为第一个提交的人。";
    els.galleryGrid.append(empty);
    return;
  }

  state.submissions.forEach((item) => {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");
    const imageButton = node.querySelector(".image-button");
    const rateButton = node.querySelector(".secondary-button");

    image.src = item.image_url;
    image.alt = item.title;
    node.querySelector("h3").textContent = item.title;
    node.querySelector("p").textContent = item.description || "未填写说明";
    node.querySelector(".score-pill").textContent = formatScore(item);

    imageButton.addEventListener("click", () => openDetail(item.id));
    rateButton.addEventListener("click", () => openDetail(item.id));
    els.galleryGrid.append(node);
  });
}

async function loadSubmissions() {
  if (!client) {
    state.submissions = demoSubmissions;
    renderGallery();
    return;
  }

  const { data, error } = await client
    .from("submission_scores")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    setNotice(els.authNotice, error.message, true);
    return;
  }

  state.submissions = data || [];
  renderGallery();
}

function openDetail(id) {
  const item = state.submissions.find((entry) => entry.id === id);
  if (!item) return;

  state.activeSubmission = item;
  els.detailContent.innerHTML = `
    <div class="detail-hero"><img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" /></div>
    <div>
      <p class="eyebrow">Score ${formatScore(item)}</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description || "未填写说明")}</p>
    </div>
    <div class="rating-box">
      <div>
        <strong>给这个作品评分</strong>
        <p class="notice">登录后可提交 1-10 分，重复评分会覆盖旧分数。</p>
      </div>
      <form class="rating-control" id="ratingForm">
        <input name="score" type="number" min="1" max="10" step="0.1" value="9" required />
        <button class="primary-button" type="submit">提交评分</button>
      </form>
    </div>
  `;

  document.querySelector("#ratingForm").addEventListener("submit", submitRating);
  showView("detail");
}

async function submitRating(event) {
  event.preventDefault();
  const score = Number(new FormData(event.currentTarget).get("score"));

  if (!client) {
    setNotice(els.authNotice, "演示模式不会保存评分。");
    return;
  }

  if (!state.session) {
    setNotice(els.authNotice, "请先登录再评分。", true);
    return;
  }

  const { error } = await client.from("ratings").upsert({
    submission_id: state.activeSubmission.id,
    user_id: state.session.user.id,
    score,
  });

  if (error) {
    setNotice(els.authNotice, error.message, true);
    return;
  }

  await loadSubmissions();
  openDetail(state.activeSubmission.id);
}

async function handleLogin(event) {
  event.preventDefault();
  if (!client) {
    setNotice(els.authNotice, "请先配置 Supabase。", true);
    return;
  }

  const form = new FormData(event.currentTarget);
  const { error } = await client.auth.signInWithPassword({
    email: form.get("email"),
    password: form.get("password"),
  });

  setNotice(els.authNotice, error ? error.message : "登录成功。", Boolean(error));
}

async function handleRegister(event) {
  event.preventDefault();
  if (!client) {
    setNotice(els.authNotice, "请先配置 Supabase。", true);
    return;
  }

  const form = new FormData(event.currentTarget);
  const { data, error } = await client.functions.invoke("register-with-invite", {
    body: {
      email: form.get("email"),
      password: form.get("password"),
      displayName: form.get("displayName"),
      inviteCode: form.get("inviteCode"),
    },
  });

  if (error) {
    setNotice(els.authNotice, error.message, true);
    return;
  }

  setNotice(els.authNotice, data?.message || "注册成功，请登录。");
  setAuthMode("login");
}

async function handleSubmission(event) {
  event.preventDefault();
  if (!client) {
    setNotice(els.submitNotice, "演示模式无法上传，请先配置 Supabase。", true);
    return;
  }

  if (!state.session) {
    setNotice(els.submitNotice, "请先登录再提交。", true);
    return;
  }

  const form = new FormData(event.currentTarget);
  const file = form.get("image");
  const extension = file.name.split(".").pop();
  const path = `${state.session.user.id}/${crypto.randomUUID()}.${extension}`;

  const upload = await client.storage.from("submissions").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (upload.error) {
    setNotice(els.submitNotice, upload.error.message, true);
    return;
  }

  const { data } = client.storage.from("submissions").getPublicUrl(path);
  const insert = await client.from("submissions").insert({
    user_id: state.session.user.id,
    title: form.get("title"),
    description: form.get("description"),
    image_path: path,
    image_url: data.publicUrl,
  });

  if (insert.error) {
    setNotice(els.submitNotice, insert.error.message, true);
    return;
  }

  event.currentTarget.reset();
  setNotice(els.submitNotice, "提交成功，已展示到首页。");
  await loadSubmissions();
  showView("home");
}

async function initSession() {
  if (!client) {
    updateSessionUi();
    return;
  }

  const { data } = await client.auth.getSession();
  state.session = data.session;
  updateSessionUi();

  client.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    updateSessionUi();
  });
}

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.route));
});

els.switchAuth.addEventListener("click", () => {
  setAuthMode(state.authMode === "login" ? "register" : "login");
});

els.authToggle.addEventListener("click", async () => {
  if (!state.session) {
    setAuthMode("login");
    document.querySelector("#authPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  await client.auth.signOut();
});

els.loginForm.addEventListener("submit", handleLogin);
els.registerForm.addEventListener("submit", handleRegister);
els.submissionForm.addEventListener("submit", handleSubmission);
els.refreshGallery.addEventListener("click", loadSubmissions);

setAuthMode("login");
initSession();
loadSubmissions();
