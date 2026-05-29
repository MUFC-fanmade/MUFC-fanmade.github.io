const config = window.MUFC_CONFIG || {};
const publicKey = config.supabasePublishableKey || config.supabaseAnonKey;
const hasSupabaseConfig =
  config.supabaseUrl &&
  publicKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT_REF");

const client = hasSupabaseConfig
  ? window.supabase.createClient(config.supabaseUrl, publicKey)
  : null;

const demoSubmissions = [
  {
    id: "demo-1",
    title: "宴星回廊 Master",
    description: "面向 13+ 难度的节奏型谱面展示图，重点表现交互段落与星形押法。",
    image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    average_score: 9.2,
    rating_count: 18,
  },
  {
    id: "demo-2",
    title: "Campus Signal Re:Mix",
    description: "高校主题原创曲的谱面概念图，强调副歌段落的滑键动线。",
    image_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
    average_score: 8.6,
    rating_count: 11,
  },
  {
    id: "demo-3",
    title: "After Class DX",
    description: "毕业生组参赛作品，截图展示了高潮段落的节奏密度设计。",
    image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
    average_score: 8.9,
    rating_count: 14,
  },
];

const state = {
  session: null,
  submissions: [],
  ownSubmissions: [],
  ownRatings: [],
  activeSubmission: null,
  authMode: "login",
};

const els = {
  authToggle: document.querySelector("#authToggle"),
  profileNav: document.querySelector("#profileNav"),
  sessionLabel: document.querySelector("#sessionLabel"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  switchAuth: document.querySelector("#switchAuth"),
  authNotice: document.querySelector("#authNotice"),
  homeView: document.querySelector("#homeView"),
  submitView: document.querySelector("#submitView"),
  authView: document.querySelector("#authView"),
  profileView: document.querySelector("#profileView"),
  detailView: document.querySelector("#detailView"),
  galleryGrid: document.querySelector("#galleryGrid"),
  refreshGallery: document.querySelector("#refreshGallery"),
  refreshProfile: document.querySelector("#refreshProfile"),
  submissionForm: document.querySelector("#submissionForm"),
  submitNotice: document.querySelector("#submitNotice"),
  profileNotice: document.querySelector("#profileNotice"),
  mySubmissionsList: document.querySelector("#mySubmissionsList"),
  myRatingsList: document.querySelector("#myRatingsList"),
  mySubmissionCount: document.querySelector("#mySubmissionCount"),
  myRatingCount: document.querySelector("#myRatingCount"),
  previewShell: document.querySelector("#previewShell"),
  majdataFrame: document.querySelector("#majdataFrame"),
  detailContent: document.querySelector("#detailContent"),
  cardTemplate: document.querySelector("#submissionCardTemplate"),
};

function setNotice(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#8f0000" : "";
}

function setFormBusy(form, isBusy, busyText) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = isBusy;
  button.textContent = isBusy ? busyText : button.dataset.defaultText;
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
  els.profileNav.classList.toggle("hidden", !user);
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.loginForm.classList.toggle("hidden", mode !== "login");
  els.registerForm.classList.toggle("hidden", mode !== "register");
  els.switchAuth.textContent = mode === "login" ? "需要邀请码注册？" : "已有账号登录";
  setNotice(els.authNotice, hasSupabaseConfig ? "" : "当前是演示模式：复制 config.example.js 为 config.js 并填写 Supabase 配置后接入真实后端。");
}

function showView(name) {
  if (name === "profile" && !state.session) {
    setNotice(els.authNotice, "请先登录再查看个人中心。", true);
    setAuthMode("login");
    name = "auth";
  }

  els.homeView.classList.toggle("hidden", name !== "home");
  els.submitView.classList.toggle("hidden", name !== "submit");
  els.authView.classList.toggle("hidden", name !== "auth");
  els.profileView.classList.toggle("hidden", name !== "profile");
  els.detailView.classList.toggle("hidden", name !== "detail");
  window.location.hash = name;

  if (name === "profile") {
    loadProfile();
  }
}

function renderGallery() {
  els.galleryGrid.innerHTML = "";

  if (!state.submissions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "还没有作品，成为第一个提交谱面的人。";
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

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getRequiredFile(form, fieldName, expectedNames) {
  const file = form.get(fieldName);
  if (!(file instanceof File) || !file.size) {
    throw new Error(`请选择 ${expectedNames.join(" 或 ")}。`);
  }
  if (!expectedNames.includes(file.name)) {
    throw new Error(`${fieldName} 文件名必须严格为 ${expectedNames.join(" 或 ")}。`);
  }
  return file;
}

function getOptionalFile(form, fieldName, expectedNames) {
  const file = form.get(fieldName);
  if (!(file instanceof File) || !file.size) return null;
  if (!expectedNames.includes(file.name)) {
    throw new Error(`${fieldName} 文件名必须严格为 ${expectedNames.join(" 或 ")}。`);
  }
  return file;
}

function renderProfileList(container, items, emptyText, renderer) {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  items.forEach((item) => container.append(renderer(item)));
}

function createProfileItem({ title, imageUrl, meta, detail, onOpen }) {
  const item = document.createElement("article");
  item.className = "profile-item";

  const thumbButton = document.createElement("button");
  thumbButton.className = "image-button profile-thumb";
  thumbButton.type = "button";

  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = title;
  thumbButton.append(img);
  thumbButton.addEventListener("click", onOpen);

  const body = document.createElement("div");
  body.className = "profile-meta";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const metaLine = document.createElement("p");
  metaLine.textContent = meta;

  const detailLine = document.createElement("p");
  detailLine.textContent = detail;

  body.append(heading, metaLine, detailLine);
  item.append(thumbButton, body);
  return item;
}

async function loadProfile() {
  if (!client) {
    state.ownSubmissions = demoSubmissions.slice(0, 1);
    state.ownRatings = [{ submission_id: "demo-2", score: 8.5, updated_at: new Date().toISOString() }];
    renderProfile();
    return;
  }

  if (!state.session) {
    showView("auth");
    return;
  }

  setNotice(els.profileNotice, "加载中...");
  const [submissionsResult, ratingsResult] = await Promise.all([
    client
      .from("submissions")
      .select("id,title,description,image_url,maidata_url,track_url,bg_url,pv_url,level,created_at")
      .eq("user_id", state.session.user.id)
      .order("created_at", { ascending: false }),
    client
      .from("ratings")
      .select("submission_id,score,updated_at,created_at")
      .eq("user_id", state.session.user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (submissionsResult.error) {
    setNotice(els.profileNotice, submissionsResult.error.message, true);
    return;
  }

  if (ratingsResult.error) {
    setNotice(els.profileNotice, ratingsResult.error.message, true);
    return;
  }

  state.ownSubmissions = submissionsResult.data || [];
  state.ownRatings = ratingsResult.data || [];
  await loadSubmissions();
  renderProfile();
  setNotice(els.profileNotice, "");
}

function renderProfile() {
  els.mySubmissionCount.textContent = state.ownSubmissions.length;
  els.myRatingCount.textContent = state.ownRatings.length;

  renderProfileList(
    els.mySubmissionsList,
    state.ownSubmissions,
    "你还没有提交作品。",
    (submission) =>
      createProfileItem({
        title: submission.title,
        imageUrl: submission.image_url,
        meta: `提交于 ${formatDate(submission.created_at)}`,
        detail: submission.description || "未填写说明",
        onOpen: () => openDetail(submission.id),
      }),
  );

  renderProfileList(
    els.myRatingsList,
    state.ownRatings,
    "你还没有评分记录。",
    (rating) => {
      const submission = state.submissions.find((item) => item.id === rating.submission_id);
      return createProfileItem({
        title: submission?.title || "已评分作品",
        imageUrl: submission?.image_url || "",
        meta: `我的评分 ${Number(rating.score).toFixed(1)} / 10`,
        detail: `更新于 ${formatDate(rating.updated_at || rating.created_at)}`,
        onOpen: () => submission && openDetail(submission.id),
      });
    },
  );
}

function openDetail(id) {
  const item = state.submissions.find((entry) => entry.id === id);
  if (!item) return;

  state.activeSubmission = item;
  const hasPreviewFiles = item.maidata_url && item.track_url && (item.bg_url || item.image_url);
  els.previewShell.classList.toggle("hidden", !hasPreviewFiles);
  els.majdataFrame.src = hasPreviewFiles
    ? `majdata-player.html?${new URLSearchParams({
        maidata: item.maidata_url,
        track: item.track_url,
        bg: item.bg_url || item.image_url,
        pv: item.pv_url || "",
        level: item.level || "0",
      }).toString()}`
    : "";

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
  if (!els.profileView.classList.contains("hidden")) {
    await loadProfile();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  if (!client) {
    setNotice(els.authNotice, "请先配置 Supabase。", true);
    return;
  }

  setFormBusy(formElement, true, "登录中...");
  const form = new FormData(formElement);
  try {
    const { error } = await client.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password"),
    });

    setNotice(els.authNotice, error ? error.message : "登录成功。", Boolean(error));
    if (!error) showView("home");
  } finally {
    setFormBusy(formElement, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  if (!client) {
    setNotice(els.authNotice, "请先配置 Supabase。", true);
    return;
  }

  setFormBusy(formElement, true, "注册中...");
  try {
    const form = new FormData(formElement);
    const { data, error } = await client.functions.invoke("register-with-invite", {
      body: {
        email: form.get("email"),
        password: form.get("password"),
        displayName: form.get("displayName"),
        inviteCode: form.get("inviteCode"),
      },
    });

    if (error) {
      let message = error.message;
      if (error.context) {
        try {
          const details = await error.context.json();
          message = details.error || details.message || message;
        } catch (_parseError) {
          message = error.message;
        }
      }
      setNotice(els.authNotice, message, true);
      return;
    }

    setNotice(els.authNotice, data?.message || "注册成功，请登录。");
    setAuthMode("login");
  } catch (error) {
    setNotice(els.authNotice, error.message || "注册失败，请稍后重试。", true);
  } finally {
    setFormBusy(formElement, false);
  }
}

async function handleSubmission(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  setNotice(els.submitNotice, "");
  if (!client) {
    setNotice(els.submitNotice, "演示模式无法上传，请先配置 Supabase。", true);
    return;
  }

  if (!state.session) {
    setNotice(els.submitNotice, "请先登录再提交。", true);
    showView("auth");
    return;
  }

  setFormBusy(formElement, true, "提交中...");
  try {
    const form = new FormData(formElement);
    const maidata = getRequiredFile(form, "maidata", ["maidata.txt"]);
    const track = getRequiredFile(form, "track", ["track.mp3"]);
    const bg = getRequiredFile(form, "bg", ["bg.jpg", "bg.png"]);
    const pv = getOptionalFile(form, "pv", ["pv.mp4"]);
    const submissionId = crypto.randomUUID();
    const basePath = `${state.session.user.id}/${submissionId}`;
    const files = [
      { key: "maidata", file: maidata, path: `${basePath}/maidata.txt` },
      { key: "track", file: track, path: `${basePath}/track.mp3` },
      { key: "bg", file: bg, path: `${basePath}/${bg.name}` },
    ];

    if (pv) {
      files.push({ key: "pv", file: pv, path: `${basePath}/pv.mp4` });
    }

    const urls = {};
    for (const entry of files) {
      const upload = await client.storage.from("submissions").upload(entry.path, entry.file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (upload.error) {
        setNotice(els.submitNotice, upload.error.message, true);
        return;
      }

      const { data } = client.storage.from("submissions").getPublicUrl(entry.path);
      urls[entry.key] = data.publicUrl;
    }

    const bgPath = files.find((entry) => entry.key === "bg").path;
    const insert = await client.from("submissions").insert({
      id: submissionId,
      user_id: state.session.user.id,
      title: form.get("title"),
      description: form.get("description"),
      image_path: bgPath,
      image_url: urls.bg,
      maidata_url: urls.maidata,
      track_url: urls.track,
      bg_url: urls.bg,
      pv_url: urls.pv || null,
      level: "0",
    });

    if (insert.error) {
      setNotice(els.submitNotice, insert.error.message, true);
      return;
    }

    formElement.reset();
    setNotice(els.submitNotice, "提交成功，已展示到作品墙。");
    await loadSubmissions();
    showView("profile");
  } catch (error) {
    setNotice(els.submitNotice, error.message || "提交失败，请稍后重试。", true);
  } finally {
    setFormBusy(formElement, false);
  }
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
    if (!session) {
      state.ownSubmissions = [];
      state.ownRatings = [];
    }
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
    showView("auth");
    return;
  }
  await client.auth.signOut();
  showView("auth");
});

els.loginForm.addEventListener("submit", handleLogin);
els.registerForm.addEventListener("submit", handleRegister);
els.submissionForm.addEventListener("submit", handleSubmission);
els.refreshGallery.addEventListener("click", loadSubmissions);
els.refreshProfile.addEventListener("click", loadProfile);

async function initApp() {
  setAuthMode("login");
  await initSession();
  await loadSubmissions();
  showView(["home", "submit", "auth", "profile"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "home");
}

initApp();
