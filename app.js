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

const demoComments = [
  {
    id: "demo-comment-1",
    display_name: "MUFC Demo",
    body: "这个评论区会在接入 Supabase 后读取真实数据。",
    user_score: 9.2,
    created_at: new Date().toISOString(),
  },
];

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const state = {
  session: null,
  profile: null,
  submissions: [],
  ownSubmissions: [],
  ownRatings: [],
  adminUsers: [],
  adminRatings: [],
  adminComments: [],
  adminTab: "users",
  activeSubmission: null,
  activeChartLevels: [],
  activeChartLevel: null,
  authMode: "login",
};

const els = {
  authToggle: document.querySelector("#authToggle"),
  profileNav: document.querySelector("#profileNav"),
  adminNav: document.querySelector("#adminNav"),
  sessionLabel: document.querySelector("#sessionLabel"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  switchAuth: document.querySelector("#switchAuth"),
  authNotice: document.querySelector("#authNotice"),
  homeView: document.querySelector("#homeView"),
  submitView: document.querySelector("#submitView"),
  authView: document.querySelector("#authView"),
  profileView: document.querySelector("#profileView"),
  adminView: document.querySelector("#adminView"),
  detailView: document.querySelector("#detailView"),
  galleryGrid: document.querySelector("#galleryGrid"),
  refreshGallery: document.querySelector("#refreshGallery"),
  refreshProfile: document.querySelector("#refreshProfile"),
  submissionForm: document.querySelector("#submissionForm"),
  submitNotice: document.querySelector("#submitNotice"),
  profileNotice: document.querySelector("#profileNotice"),
  profileForm: document.querySelector("#profileForm"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileDisplayName: document.querySelector("#profileDisplayName"),
  profileEmail: document.querySelector("#profileEmail"),
  adminNotice: document.querySelector("#adminNotice"),
  refreshAdmin: document.querySelector("#refreshAdmin"),
  adminUsersPanel: document.querySelector("#adminUsersPanel"),
  adminRatingsPanel: document.querySelector("#adminRatingsPanel"),
  adminCommentsPanel: document.querySelector("#adminCommentsPanel"),
  adminUsersTable: document.querySelector("#adminUsersTable"),
  adminRatingsTable: document.querySelector("#adminRatingsTable"),
  adminCommentsTable: document.querySelector("#adminCommentsTable"),
  adminUserCount: document.querySelector("#adminUserCount"),
  adminRatingCount: document.querySelector("#adminRatingCount"),
  adminCommentCount: document.querySelector("#adminCommentCount"),
  mySubmissionsList: document.querySelector("#mySubmissionsList"),
  myRatingsList: document.querySelector("#myRatingsList"),
  mySubmissionCount: document.querySelector("#mySubmissionCount"),
  myRatingCount: document.querySelector("#myRatingCount"),
  previewShell: document.querySelector("#previewShell"),
  majdataFrame: document.querySelector("#majdataFrame"),
  chartArtwork: document.querySelector("#chartArtwork"),
  chartLevelPanel: document.querySelector("#chartLevelPanel"),
  chartLevelFallback: document.querySelector("#chartLevelFallback"),
  chartLevelFallbackText: document.querySelector("#chartLevelFallbackText"),
  chartLevelButtons: document.querySelector("#chartLevelButtons"),
  chartLevelCount: document.querySelector("#chartLevelCount"),
  chartLevelNotice: document.querySelector("#chartLevelNotice"),
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

function renderMarkdown(value) {
  const source = String(value || "");
  if (!window.marked || !window.DOMPurify) {
    return escapeHtml(source).replaceAll("\n", "<br>");
  }

  try {
    const html = window.marked.parse(source, { gfm: true, breaks: true });
    return window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel"],
    });
  } catch (error) {
    return escapeHtml(source).replaceAll("\n", "<br>");
  }
}

function getInitials(value) {
  const text = String(value || "").trim();
  if (!text) return "MU";
  return text.slice(0, 2).toUpperCase();
}

function renderAvatar(container, profile, fallbackName) {
  const name = profile?.display_name || fallbackName || "MUFC";
  container.innerHTML = "";
  if (profile?.avatar_url) {
    const img = document.createElement("img");
    img.src = profile.avatar_url;
    img.alt = name;
    container.append(img);
    return;
  }
  container.textContent = getInitials(name);
}

function updateSessionUi() {
  const user = state.session?.user;
  els.sessionLabel.textContent = user ? user.email : "未登录";
  els.authToggle.textContent = user ? "退出" : "登录";
  els.profileNav.classList.toggle("hidden", !user);
  els.adminNav.classList.toggle("hidden", !user || !state.profile?.is_admin);
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

  if (name === "admin") {
    if (!state.session) {
      setNotice(els.authNotice, "请先登录管理员账号。", true);
      setAuthMode("login");
      name = "auth";
    } else if (!state.profile?.is_admin) {
      setNotice(els.authNotice, "当前账号没有管理员权限。", true);
      name = "home";
    }
  }

  els.homeView.classList.toggle("hidden", name !== "home");
  els.submitView.classList.toggle("hidden", name !== "submit");
  els.authView.classList.toggle("hidden", name !== "auth");
  els.profileView.classList.toggle("hidden", name !== "profile");
  els.adminView.classList.toggle("hidden", name !== "admin");
  els.detailView.classList.toggle("hidden", name !== "detail");
  document.body.classList.toggle("is-detail-view", name === "detail");
  window.location.hash = name;

  if (name === "profile") {
    loadProfile();
  }

  if (name === "admin") {
    loadAdminData();
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

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

async function detectDefaultMajdataLevel(maidataFile) {
  const text = await maidataFile.text();
  const inoteMatches = [...text.matchAll(/^&inote_(\d+)=/gm)].map((match) => Number(match[1]));
  const levelMatches = [...text.matchAll(/^&lv_(\d+)=/gm)].map((match) => Number(match[1]));
  const available = new Set([...inoteMatches, ...levelMatches]);

  if (available.has(5)) return "lv_5";
  if (!available.size) return "lv_5";

  const highestLevel = Math.max(...available);
  return `lv_${highestLevel}`;
}

function getUnityLevel(maidataLevel) {
  const match = String(maidataLevel || "").match(/^lv_(\d+)$/i);
  if (match) return `lv${Math.max(0, Number(match[1]) - 1)}`;
  const direct = String(maidataLevel || "").match(/^lv(\d+)$/i);
  if (direct) return `lv${Number(direct[1])}`;
  return "lv4";
}

function getLevelName(index) {
  const names = {
    1: "EASY",
    2: "BASIC",
    3: "ADVANCED",
    4: "EXPERT",
    5: "MASTER",
    6: "RE:MASTER",
    7: "UTAGE",
  };
  return names[index] || `LV ${index}`;
}

function parseMajdataLevels(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "");
  const values = new Map();
  const notes = new Set();

  for (const match of normalized.matchAll(/^&lv_(\d+)=(.*)$/gm)) {
    values.set(Number(match[1]), match[2].trim());
  }

  for (const match of normalized.matchAll(/^&inote_(\d+)=/gm)) {
    notes.add(Number(match[1]));
  }

  return [...values.entries()]
    .filter(([index]) => notes.has(index))
    .sort(([a], [b]) => a - b)
    .map(([index, value]) => ({
      index,
      maidataLevel: `lv_${index}`,
      unityLevel: `lv${Math.max(0, index - 1)}`,
      name: getLevelName(index),
      value: value || "-",
    }));
}

async function loadMajdataLevels(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`maidata ${response.status}`);
  return parseMajdataLevels(await response.text());
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

async function loadCurrentProfile() {
  if (!client || !state.session) {
    state.profile = null;
    updateSessionUi();
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id,display_name,avatar_url,is_admin,created_at")
    .eq("id", state.session.user.id)
    .single();

  if (error) {
    state.profile = null;
    updateSessionUi();
    return null;
  }

  state.profile = data;
  updateSessionUi();
  return data;
}

async function loadProfile() {
  if (!client) {
    state.profile = {
      display_name: "MUFC Demo",
      avatar_url: "",
      is_admin: false,
    };
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
  const [profileResult, submissionsResult, ratingsResult] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name,avatar_url,is_admin,created_at")
      .eq("id", state.session.user.id)
      .single(),
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

  if (profileResult.error) {
    setNotice(els.profileNotice, profileResult.error.message, true);
    return;
  }

  if (submissionsResult.error) {
    setNotice(els.profileNotice, submissionsResult.error.message, true);
    return;
  }

  if (ratingsResult.error) {
    setNotice(els.profileNotice, ratingsResult.error.message, true);
    return;
  }

  state.profile = profileResult.data;
  state.ownSubmissions = submissionsResult.data || [];
  state.ownRatings = ratingsResult.data || [];
  await loadSubmissions();
  renderProfile();
  setNotice(els.profileNotice, "");
}

function renderProfile() {
  const fallbackName = state.session?.email || "MUFC";
  const displayName = state.profile?.display_name || fallbackName;

  renderAvatar(els.profileAvatar, state.profile, displayName);
  els.profileDisplayName.textContent = displayName;
  els.profileEmail.textContent = state.session?.email || "演示模式";
  els.profileForm.elements.displayName.value = state.profile?.display_name || "";
  els.profileForm.elements.avatar.value = "";

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

function renderAdminTable(table, columns, rows, emptyText) {
  if (!table) return;

  if (!rows.length) {
    table.innerHTML = `
      <tbody>
        <tr>
          <td class="admin-empty" colspan="${columns.length}">${escapeHtml(emptyText)}</td>
        </tr>
      </tbody>
    `;
    return;
  }

  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = column.render ? column.render(row) : row[column.key];
          return `<td>${escapeHtml(value ?? "")}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  table.innerHTML = `
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  `;
}

function renderAdminData() {
  els.adminUserCount.textContent = String(state.adminUsers.length);
  els.adminRatingCount.textContent = String(state.adminRatings.length);
  els.adminCommentCount.textContent = String(state.adminComments.length);

  renderAdminTable(
    els.adminUsersTable,
    [
      { label: "邮箱", key: "email" },
      { label: "昵称", key: "display_name" },
      { label: "管理员", render: (row) => (row.is_admin ? "是" : "否") },
      { label: "作品", key: "submission_count" },
      { label: "评分", key: "rating_count" },
      { label: "评论", key: "comment_count" },
      { label: "注册时间", render: (row) => formatDateTime(row.created_at) },
      { label: "最近登录", render: (row) => formatDateTime(row.last_sign_in_at) || "-" },
    ],
    state.adminUsers,
    "没有用户数据。"
  );

  renderAdminTable(
    els.adminRatingsTable,
    [
      { label: "作品", key: "submission_title" },
      { label: "邮箱", key: "user_email" },
      { label: "昵称", key: "display_name" },
      { label: "分数", render: (row) => Number(row.score || 0).toFixed(1) },
      { label: "更新时间", render: (row) => formatDateTime(row.updated_at) },
    ],
    state.adminRatings,
    "没有评分数据。"
  );

  renderAdminTable(
    els.adminCommentsTable,
    [
      { label: "作品", key: "submission_title" },
      { label: "邮箱", key: "user_email" },
      { label: "昵称", key: "display_name" },
      { label: "评论 Markdown", key: "body" },
      { label: "发表时间", render: (row) => formatDateTime(row.created_at) },
    ],
    state.adminComments,
    "没有评论数据。"
  );
}

function setAdminTab(tab) {
  state.adminTab = tab;
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === tab);
  });
  els.adminUsersPanel.classList.toggle("hidden", tab !== "users");
  els.adminRatingsPanel.classList.toggle("hidden", tab !== "ratings");
  els.adminCommentsPanel.classList.toggle("hidden", tab !== "comments");
}

async function loadAdminData() {
  if (!client || !state.session || !state.profile?.is_admin) {
    setNotice(els.adminNotice, "当前账号没有管理员权限。", true);
    return;
  }

  setNotice(els.adminNotice, "加载中...");
  const [usersResult, ratingsResult, commentsResult] = await Promise.all([
    client.rpc("admin_user_rows"),
    client.rpc("admin_rating_rows"),
    client.rpc("admin_comment_rows"),
  ]);

  const error = usersResult.error || ratingsResult.error || commentsResult.error;
  if (error) {
    setNotice(els.adminNotice, error.message, true);
    state.adminUsers = [];
    state.adminRatings = [];
    state.adminComments = [];
    renderAdminData();
    return;
  }

  state.adminUsers = usersResult.data || [];
  state.adminRatings = ratingsResult.data || [];
  state.adminComments = commentsResult.data || [];
  renderAdminData();
  setAdminTab(state.adminTab);
  setNotice(els.adminNotice, "");
}

function getAvatarExtension(file) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(byName)) {
    return byName === "jpeg" ? "jpg" : byName;
  }

  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return byType[file.type] || "";
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  const formElement = event.currentTarget;

  if (!client || !state.session) {
    setNotice(els.profileNotice, "请先登录再修改个人资料。", true);
    return;
  }

  const form = new FormData(formElement);
  const displayName = form.get("displayName")?.toString().trim();
  const avatar = form.get("avatar");

  if (!displayName) {
    setNotice(els.profileNotice, "昵称不能为空。", true);
    return;
  }

  if (displayName.length > 40) {
    setNotice(els.profileNotice, "昵称不能超过 40 个字符。", true);
    return;
  }

  let avatarUrl = state.profile?.avatar_url || null;
  setFormBusy(formElement, true, "保存中...");

  try {
    if (avatar instanceof File && avatar.size) {
      if (avatar.size > MAX_AVATAR_SIZE) {
        setNotice(els.profileNotice, "头像文件不能大于 2MB。", true);
        return;
      }

      const extension = getAvatarExtension(avatar);
      if (!extension) {
        setNotice(els.profileNotice, "头像仅支持 JPG、PNG 或 WebP。", true);
        return;
      }

      const path = `avatars/${state.session.user.id}/avatar.${extension}`;
      const upload = await client.storage.from("submissions").upload(path, avatar, {
        cacheControl: "3600",
        upsert: true,
      });

      if (upload.error) {
        setNotice(els.profileNotice, upload.error.message, true);
        return;
      }

      const { data } = client.storage.from("submissions").getPublicUrl(path);
      avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    }

    const { data, error } = await client
      .from("profiles")
      .update({
        display_name: displayName,
        avatar_url: avatarUrl,
      })
      .eq("id", state.session.user.id)
      .select("id,display_name,avatar_url,is_admin,created_at")
      .single();

    if (error) {
      setNotice(els.profileNotice, error.message, true);
      return;
    }

    state.profile = data;
    renderProfile();
    setNotice(els.profileNotice, "个人资料已保存。");
  } finally {
    setFormBusy(formElement, false);
  }
}

function buildPlayerUrl(item, maidataLevel) {
  return `majdata-player.html?${new URLSearchParams({
    v: "20260530-detail-layout",
    maidata: item.maidata_url,
    track: item.track_url,
    bg: item.bg_url || item.image_url,
    pv: item.pv_url || "",
    level: maidataLevel || "lv_5",
  }).toString()}`;
}

function getChartPayload(item, maidataLevel) {
  return {
    type: "LoadChart",
    maidata: item.maidata_url,
    track: item.track_url,
    bg: item.bg_url || item.image_url,
    pv: item.pv_url || "",
    level: maidataLevel || "lv_5",
    unityLevel: getUnityLevel(maidataLevel || "lv_5"),
  };
}

function renderChartLevelPanel() {
  const levels = state.activeChartLevels;
  const activeLevel = state.activeChartLevel;

  els.chartLevelPanel.classList.toggle("hidden", !levels.length);
  els.chartLevelFallback.classList.add("hidden");
  els.chartLevelButtons.innerHTML = "";
  els.chartLevelCount.textContent = levels.length ? `${levels.length}` : "0";
  els.chartLevelNotice.textContent = "";
  els.chartLevelNotice.classList.add("hidden");

  levels.forEach((level) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `level-button${level.maidataLevel === activeLevel ? " is-active" : ""}`;
    button.dataset.level = level.maidataLevel;
    button.innerHTML = `
      <strong>${escapeHtml(level.value)}</strong>
      <span>${escapeHtml(level.name)}</span>
    `;
    button.addEventListener("click", () => switchChartLevel(level.maidataLevel));
    els.chartLevelButtons.append(button);
  });
}

function switchChartLevel(maidataLevel) {
  const item = state.activeSubmission;
  if (!item || state.activeChartLevel === maidataLevel) return;

  state.activeChartLevel = maidataLevel;
  renderChartLevelPanel();

  const payload = getChartPayload(item, maidataLevel);
  if (els.majdataFrame.contentWindow) {
    els.majdataFrame.contentWindow.postMessage(payload, "*");
    return;
  }

  els.majdataFrame.src = buildPlayerUrl(item, maidataLevel);
}

async function openDetail(id) {
  const item = state.submissions.find((entry) => entry.id === id);
  if (!item) return;

  state.activeSubmission = item;
  state.activeChartLevels = [];
  state.activeChartLevel = item.level || "lv_5";
  const hasPreviewFiles = item.maidata_url && item.track_url && (item.bg_url || item.image_url);
  els.previewShell.classList.toggle("hidden", !hasPreviewFiles);
  els.chartLevelPanel.classList.add("hidden");
  els.chartLevelFallback.classList.toggle("hidden", hasPreviewFiles);
  els.chartLevelFallbackText.textContent = hasPreviewFiles ? "" : "这个作品缺少谱面预览文件。";
  els.chartLevelButtons.innerHTML = "";
  els.chartLevelNotice.textContent = hasPreviewFiles ? "Loading chart levels..." : "";
  els.chartLevelNotice.classList.toggle("hidden", !hasPreviewFiles);
  els.majdataFrame.src = hasPreviewFiles ? buildPlayerUrl(item, state.activeChartLevel) : "";
  els.chartArtwork.innerHTML = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" />`;

  els.detailContent.innerHTML = `
    <section class="detail-info">
      <p class="eyebrow">Score ${formatScore(item)}</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description || "未填写说明")}</p>
    </section>
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
    <section class="comments-panel">
      <div class="panel-heading compact-heading">
        <h3>评论区</h3>
        <span class="score-pill" id="commentCount">0</span>
      </div>
      <form class="comment-form" id="commentForm">
        <textarea name="body" maxlength="1000" rows="4" placeholder="写下你对这个谱面的想法，支持 Markdown" required></textarea>
        <div class="comment-preview hidden" id="commentPreview" aria-live="polite"></div>
        <div class="comment-actions">
          <p class="notice" id="commentNotice">${state.session ? "支持 Markdown：粗体、列表、链接、代码块。" : "登录后可以发表评论。"}</p>
          <div class="comment-action-buttons">
            <button class="secondary-button" id="commentPreviewToggle" type="button">预览 Markdown</button>
            <button class="primary-button" type="submit"${state.session ? "" : " disabled"}>发表评论</button>
          </div>
        </div>
      </form>
      <div class="comment-list" id="commentList"></div>
    </section>
  `;

  document.querySelector("#ratingForm").addEventListener("submit", submitRating);
  document.querySelector("#commentForm").addEventListener("submit", submitComment);
  setupCommentPreview();
  showView("detail");
  window.location.hash = `detail=${encodeURIComponent(item.id)}`;
  await loadComments();

  if (!hasPreviewFiles) return;

  try {
    const levels = await loadMajdataLevels(item.maidata_url);
    if (state.activeSubmission?.id !== item.id) return;

    state.activeChartLevels = levels;
    const current = levels.find((level) => level.maidataLevel === state.activeChartLevel);
    const fallback =
      levels.find((level) => level.maidataLevel === "lv_5") ||
      levels[levels.length - 1] ||
      null;

    state.activeChartLevel = (current || fallback)?.maidataLevel || state.activeChartLevel;
    renderChartLevelPanel();

    if (!current && fallback) {
      els.majdataFrame.src = buildPlayerUrl(item, state.activeChartLevel);
    }
  } catch (error) {
    if (state.activeSubmission?.id !== item.id) return;
    els.chartLevelPanel.classList.remove("hidden");
    els.chartLevelFallback.classList.add("hidden");
    els.chartLevelCount.textContent = "0";
    els.chartLevelButtons.innerHTML = "";
    els.chartLevelNotice.textContent = `Failed to load chart levels: ${error.message || error}`;
    els.chartLevelNotice.classList.remove("hidden");
  }
}

function renderComments(comments) {
  const list = document.querySelector("#commentList");
  const count = document.querySelector("#commentCount");
  if (!list || !count) return;

  count.textContent = String(comments.length);
  list.innerHTML = "";

  if (!comments.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.textContent = "还没有评论。";
    list.append(empty);
    return;
  }

  comments.forEach((comment) => {
    const item = document.createElement("article");
    item.className = "comment-item";
    const score =
      comment.user_score !== null && typeof comment.user_score !== "undefined"
        ? `${Number(comment.user_score).toFixed(1)} / 10`
        : "未评分";

    item.innerHTML = `
      <div class="comment-meta">
        <strong>${escapeHtml(comment.display_name || "匿名用户")}</strong>
        <span>${escapeHtml(score)}</span>
        <time>${escapeHtml(formatDateTime(comment.created_at))}</time>
      </div>
      <div class="comment-body">${renderMarkdown(comment.body)}</div>
    `;
    list.append(item);
  });
}

function updateCommentPreview(formElement) {
  const textarea = formElement.querySelector('textarea[name="body"]');
  const preview = formElement.querySelector("#commentPreview");
  if (!textarea || !preview) return;

  const body = textarea.value.trim();
  if (!body) {
    preview.innerHTML = '<div class="empty-state compact-empty">没有可预览的内容。</div>';
    return;
  }

  preview.innerHTML = `<div class="comment-body">${renderMarkdown(body)}</div>`;
}

function setupCommentPreview() {
  const formElement = document.querySelector("#commentForm");
  const textarea = formElement?.querySelector('textarea[name="body"]');
  const preview = formElement?.querySelector("#commentPreview");
  const toggle = formElement?.querySelector("#commentPreviewToggle");
  if (!formElement || !textarea || !preview || !toggle) return;

  toggle.addEventListener("click", () => {
    const isPreviewing = !preview.classList.contains("hidden");
    if (isPreviewing) {
      preview.classList.add("hidden");
      textarea.classList.remove("hidden");
      toggle.textContent = "预览 Markdown";
      textarea.focus();
      return;
    }

    updateCommentPreview(formElement);
    textarea.classList.add("hidden");
    preview.classList.remove("hidden");
    toggle.textContent = "继续编辑";
  });

  textarea.addEventListener("input", () => {
    if (!preview.classList.contains("hidden")) {
      updateCommentPreview(formElement);
    }
  });
}

async function loadComments() {
  const item = state.activeSubmission;
  if (!item) return;

  if (!client) {
    renderComments(demoComments);
    return;
  }

  const list = document.querySelector("#commentList");
  if (list) {
    list.innerHTML = '<div class="empty-state compact-empty">评论加载中...</div>';
  }

  const { data, error } = await client
    .from("submission_comments")
    .select("id,body,display_name,user_score,created_at,updated_at")
    .eq("submission_id", item.id)
    .order("created_at", { ascending: false });

  if (state.activeSubmission?.id !== item.id) return;

  if (error) {
    const notice = document.querySelector("#commentNotice");
    if (notice) {
      notice.textContent = error.message;
      notice.style.color = "#8f0000";
    }
    renderComments([]);
    return;
  }

  renderComments(data || []);
}

async function submitComment(event) {
  event.preventDefault();
  const item = state.activeSubmission;
  const formElement = event.currentTarget;
  const notice = document.querySelector("#commentNotice");
  const body = new FormData(formElement).get("body")?.toString().trim();

  if (!body) {
    if (notice) {
      notice.textContent = "评论内容不能为空。";
      notice.style.color = "#8f0000";
    }
    return;
  }

  if (!client) {
    if (notice) {
      notice.textContent = "演示模式不会保存评论。";
      notice.style.color = "";
    }
    return;
  }

  if (!state.session) {
    if (notice) {
      notice.textContent = "请先登录再发表评论。";
      notice.style.color = "#8f0000";
    }
    return;
  }

  setFormBusy(formElement, true, "发表中...");
  try {
    const { error } = await client.from("comments").insert({
      submission_id: item.id,
      user_id: state.session.user.id,
      body,
    });

    if (error) {
      if (notice) {
        notice.textContent = error.message;
        notice.style.color = "#8f0000";
      }
      return;
    }

    formElement.reset();
    if (notice) {
      notice.textContent = "评论已发表。";
      notice.style.color = "";
    }
    await loadComments();
  } finally {
    setFormBusy(formElement, false);
  }
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
    if (!error) {
      await loadCurrentProfile();
      showView("home");
    }
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
    const defaultLevel = await detectDefaultMajdataLevel(maidata);
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
      level: defaultLevel,
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
  if (state.session) {
    await loadCurrentProfile();
  }
  updateSessionUi();

  client.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) {
      await loadCurrentProfile();
    }
    updateSessionUi();
    if (!session) {
      state.ownSubmissions = [];
      state.ownRatings = [];
      state.profile = null;
      state.adminUsers = [];
      state.adminRatings = [];
      state.adminComments = [];
      updateSessionUi();
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
els.profileForm.addEventListener("submit", handleProfileUpdate);
els.refreshGallery.addEventListener("click", loadSubmissions);
els.refreshProfile.addEventListener("click", loadProfile);
els.refreshAdmin.addEventListener("click", loadAdminData);
document.querySelectorAll("[data-admin-tab]").forEach((button) => {
  button.addEventListener("click", () => setAdminTab(button.dataset.adminTab));
});

async function initApp() {
  setAuthMode("login");
  await initSession();
  await loadSubmissions();
  const route = location.hash.slice(1);
  if (route.startsWith("detail=")) {
    await openDetail(decodeURIComponent(route.slice("detail=".length)));
    return;
  }
  showView(["home", "submit", "auth", "profile", "admin"].includes(route) ? route : "home");
}

initApp();
