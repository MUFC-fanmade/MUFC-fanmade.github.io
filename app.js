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
    song_title: "宴星回廊 Master",
    song_artist: "MUFC Demo",
    charter_name: "Demo Charter",
    description: "面向 13+ 难度的节奏型谱面展示图，重点表现交互段落与星形押法。",
    image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    level: "lv_5",
    level_value: "13+",
    rating_count: 18,
    like_count: 12,
    dislike_count: 1,
  },
  {
    id: "demo-2",
    title: "Campus Signal Re:Mix",
    song_title: "Campus Signal Re:Mix",
    song_artist: "Campus Band",
    charter_name: "Signal Team",
    description: "高校主题原创曲的谱面概念图，强调副歌段落的滑键动线。",
    image_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
    level: "lv_5",
    level_value: "14",
    rating_count: 11,
    like_count: 8,
    dislike_count: 2,
  },
  {
    id: "demo-3",
    title: "After Class DX",
    song_title: "After Class DX",
    song_artist: "After Class",
    charter_name: "DX Maker",
    description: "毕业生组参赛作品，截图展示了高潮段落的节奏密度设计。",
    image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
    level: "lv_5",
    level_value: "13",
    rating_count: 14,
    like_count: 9,
    dislike_count: 0,
  },
];

const demoComments = [
  {
    id: "demo-comment-1",
    display_name: "MUFC Demo",
    avatar_url: "",
    body: "这个评论区会在接入 Supabase 后读取真实数据。",
    user_score: 9.2,
    parent_id: null,
    parent_display_name: null,
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
  adminSubmissions: [],
  adminRatings: [],
  adminComments: [],
  adminInvites: [],
  adminMessages: [],
  inboxMessages: [],
  adminSubmissionLimit: {
    enabled: true,
    maxCount: 1,
  },
  adminTab: "users",
  chartQuery: "",
  chartPage: 0,
  activeSubmission: null,
  activeVoteValue: 0,
  activeCommentReply: null,
  activeChartLevels: [],
  activeChartLevel: null,
  authMode: "login",
};

const els = {
  authToggle: document.querySelector("#authToggle"),
  profileNav: document.querySelector("#profileNav"),
  inboxNav: document.querySelector("#inboxNav"),
  adminNav: document.querySelector("#adminNav"),
  sessionLabel: document.querySelector("#sessionLabel"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  switchAuth: document.querySelector("#switchAuth"),
  authNotice: document.querySelector("#authNotice"),
  toastStack: document.querySelector("#toastStack"),
  homeView: document.querySelector("#homeView"),
  chartsView: document.querySelector("#chartsView"),
  guideView: document.querySelector("#guideView"),
  submitView: document.querySelector("#submitView"),
  authView: document.querySelector("#authView"),
  profileView: document.querySelector("#profileView"),
  inboxView: document.querySelector("#inboxView"),
  adminView: document.querySelector("#adminView"),
  detailView: document.querySelector("#detailView"),
  galleryGrid: document.querySelector("#galleryGrid"),
  allChartsGrid: document.querySelector("#allChartsGrid"),
  chartSearch: document.querySelector("#chartSearch"),
  allChartCount: document.querySelector("#allChartCount"),
  recentComments: document.querySelector("#recentComments"),
  popularGrid: document.querySelector("#popularGrid"),
  refreshGallery: document.querySelector("#refreshGallery"),
  refreshProfile: document.querySelector("#refreshProfile"),
  submissionForm: document.querySelector("#submissionForm"),
  submitNotice: document.querySelector("#submitNotice"),
  profileNotice: document.querySelector("#profileNotice"),
  profileForm: document.querySelector("#profileForm"),
  inboxNotice: document.querySelector("#inboxNotice"),
  refreshInbox: document.querySelector("#refreshInbox"),
  markAllInboxRead: document.querySelector("#markAllInboxRead"),
  inboxList: document.querySelector("#inboxList"),
  inboxUnreadCount: document.querySelector("#inboxUnreadCount"),
  inboxTotalCount: document.querySelector("#inboxTotalCount"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileDisplayName: document.querySelector("#profileDisplayName"),
  profileEmail: document.querySelector("#profileEmail"),
  adminNotice: document.querySelector("#adminNotice"),
  refreshAdmin: document.querySelector("#refreshAdmin"),
  adminUsersPanel: document.querySelector("#adminUsersPanel"),
  adminSubmissionsPanel: document.querySelector("#adminSubmissionsPanel"),
  adminRatingsPanel: document.querySelector("#adminRatingsPanel"),
  adminCommentsPanel: document.querySelector("#adminCommentsPanel"),
  adminInvitesPanel: document.querySelector("#adminInvitesPanel"),
  adminMessagesPanel: document.querySelector("#adminMessagesPanel"),
  adminUsersTable: document.querySelector("#adminUsersTable"),
  adminSubmissionsTable: document.querySelector("#adminSubmissionsTable"),
  adminRatingsTable: document.querySelector("#adminRatingsTable"),
  adminCommentsTable: document.querySelector("#adminCommentsTable"),
  adminInvitesTable: document.querySelector("#adminInvitesTable"),
  adminMessagesTable: document.querySelector("#adminMessagesTable"),
  adminMessageForm: document.querySelector("#adminMessageForm"),
  adminMessageTarget: document.querySelector("#adminMessageTarget"),
  adminMessageUserSelect: document.querySelector("#adminMessageUserSelect"),
  adminSubmissionForm: document.querySelector("#adminSubmissionForm"),
  adminSubmissionLimitForm: document.querySelector("#adminSubmissionLimitForm"),
  adminSubmissionLimitEnabled: document.querySelector("#adminSubmissionLimitEnabled"),
  adminSubmissionLimitMax: document.querySelector("#adminSubmissionLimitMax"),
  adminSubmissionLimitStatus: document.querySelector("#adminSubmissionLimitStatus"),
  adminSubmitterSelect: document.querySelector("#adminSubmitterSelect"),
  adminFileForm: document.querySelector("#adminFileForm"),
  adminFileSubmissionSelect: document.querySelector("#adminFileSubmissionSelect"),
  adminInviteForm: document.querySelector("#adminInviteForm"),
  adminGeneratedInvite: document.querySelector("#adminGeneratedInvite"),
  adminPasswordForm: document.querySelector("#adminPasswordForm"),
  adminPasswordUserSelect: document.querySelector("#adminPasswordUserSelect"),
  adminUserCount: document.querySelector("#adminUserCount"),
  adminSubmissionCount: document.querySelector("#adminSubmissionCount"),
  adminRatingCount: document.querySelector("#adminRatingCount"),
  adminCommentCount: document.querySelector("#adminCommentCount"),
  adminInviteCount: document.querySelector("#adminInviteCount"),
  adminMessageCount: document.querySelector("#adminMessageCount"),
  mySubmissionsList: document.querySelector("#mySubmissionsList"),
  myRatingsList: document.querySelector("#myRatingsList"),
  mySubmissionCount: document.querySelector("#mySubmissionCount"),
  myRatingCount: document.querySelector("#myRatingCount"),
  previewShell: document.querySelector("#previewShell"),
  majdataFrame: document.querySelector("#majdataFrame"),
  chartArtwork: document.querySelector("#chartArtwork"),
  songInfoBody: document.querySelector("#songInfoBody"),
  chartDescription: document.querySelector("#chartDescription"),
  detailRatingCard: document.querySelector("#detailRatingCard"),
  chartLevelPanel: document.querySelector("#chartLevelPanel"),
  chartLevelFallback: document.querySelector("#chartLevelFallback"),
  chartLevelFallbackText: document.querySelector("#chartLevelFallbackText"),
  chartLevelButtons: document.querySelector("#chartLevelButtons"),
  chartLevelCount: document.querySelector("#chartLevelCount"),
  chartLevelNotice: document.querySelector("#chartLevelNotice"),
  detailContent: document.querySelector("#detailContent"),
  cardTemplate: document.querySelector("#submissionCardTemplate"),
};

function showToast(message, type = "error") {
  if (!message || !els.toastStack) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  els.toastStack.append(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 220);
  }, 3600);
}

function setNotice(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#bd235f" : "";
  if (isError && message) {
    showToast(message, "error");
  }
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
  const count = Number(item?.rating_count || 0);
  return count ? `已评分 ${count} 人` : "暂无评分";
}

function formatReactionCount(label, value) {
  return `${label} ${Number(value || 0)}`;
}

function formatChartNumber(item) {
  const number = Number(item?.chart_number || 0);
  return number ? `#${String(number).padStart(3, "0")}` : "";
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
  els.inboxNav?.classList.toggle("hidden", !user);
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

  if (name === "inbox" && !state.session) {
    setNotice(els.authNotice, "请先登录再查看站内信。", true);
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
  els.chartsView.classList.toggle("hidden", name !== "charts");
  els.guideView.classList.toggle("hidden", name !== "guide");
  els.submitView.classList.toggle("hidden", name !== "submit");
  els.authView.classList.toggle("hidden", name !== "auth");
  els.profileView.classList.toggle("hidden", name !== "profile");
  els.inboxView?.classList.toggle("hidden", name !== "inbox");
  els.adminView.classList.toggle("hidden", name !== "admin");
  els.detailView.classList.toggle("hidden", name !== "detail");
  document.body.classList.toggle("is-detail-view", name === "detail");
  window.location.hash = name;

  if (name === "profile") {
    loadProfile();
  }

  if (name === "inbox") {
    loadInbox();
  }

  if (name === "charts") {
    renderAllCharts();
  }

  if (name === "admin") {
    loadAdminData();
  }
}

function renderSubmissionCards(container, submissions, emptyText) {
  container.innerHTML = "";

  if (!submissions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  submissions.forEach((item) => {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");
    const imageButton = node.querySelector(".image-button");
    const rateButton = node.querySelector(".secondary-button");

    image.src = item.image_url;
    image.alt = item.title;
    const chartNum = formatChartNumber(item);
    const numEl = node.querySelector(".card-number");
    if (numEl) {
      numEl.textContent = chartNum || "";
      numEl.classList.toggle("hidden", !chartNum);
      numEl.style.cursor = "pointer";
      numEl.addEventListener("click", () => openDetail(item.id));
    }
    const titleEl = node.querySelector("h3");
    const titleText = item.song_title || item.title;
    titleEl.innerHTML = `<span>${escapeHtml(titleText)}</span>`;
    titleEl.style.cursor = "pointer";
    titleEl.addEventListener("click", () => openDetail(item.id));
    const metaEl = node.querySelector("p");
    metaEl.innerHTML = "";
    const artistLine = document.createElement("span");
    artistLine.className = "card-meta-line";
    artistLine.innerHTML = `<span>${escapeHtml(item.song_artist || "未填写曲师")}</span>`;
    metaEl.append(artistLine);
    const charterLine = document.createElement("span");
    charterLine.className = "card-meta-line";
    charterLine.innerHTML = `<span>${escapeHtml(item.charter_name || "未填写谱师")}</span>`;
    metaEl.append(charterLine);
    node.querySelector(".score-pill").classList.add("hidden");
    node.querySelector("[data-like-count]").textContent = formatReactionCount("赞", item.like_count);
    node.querySelector("[data-dislike-count]").textContent = formatReactionCount("踩", item.dislike_count);

    imageButton.addEventListener("click", () => openDetail(item.id));
    rateButton.addEventListener("click", () => openDetail(item.id));
    container.append(node);

    requestAnimationFrame(() => {
      node.querySelectorAll(".card-meta-line span, .card-title-row h3 span").forEach((span) => {
        const parent = span.parentElement;
        if (span.scrollWidth > parent.clientWidth) {
          span.classList.add("is-overflow");
        }
      });
    });
  });
}

function renderGallery() {
  const sorted = [...state.submissions].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });
  const recent = sorted.slice(0, 8);
  renderSubmissionCards(els.galleryGrid, recent, "还没有作品。");
  renderPopular();
  loadRecentComments();
}

function renderPopular() {
  if (!els.popularGrid) return;
  const sorted = [...state.submissions].sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  const top = sorted.slice(0, 8);
  renderSubmissionCards(els.popularGrid, top, "还没有谱面数据。");
}

async function loadRecentComments() {
  if (!els.recentComments) return;
  if (!client) {
    els.recentComments.innerHTML = '<div class="empty-state compact-empty">演示模式暂无评论。</div>';
    return;
  }
  const { data, error } = await client
    .from("submission_comments")
    .select("id,body,display_name,created_at,submission_id")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error || !data?.length) {
    els.recentComments.innerHTML = '<div class="empty-state compact-empty">还没有评论。</div>';
    return;
  }
  els.recentComments.innerHTML = data.map((c) => {
    const submission = state.submissions.find((s) => s.id === c.submission_id);
    const title = submission?.song_title || submission?.title || "未知谱面";
    return `
      <div class="recent-comment-item" data-submission-id="${escapeHtml(c.submission_id)}">
        <span class="recent-comment-title">${escapeHtml(title)}</span>
        <div class="recent-comment-meta">
          <strong>${escapeHtml(c.display_name || "匿名")}</strong>
          <span class="recent-comment-body">${escapeHtml(c.body || "").slice(0, 100)}${c.body && c.body.length > 100 ? "..." : ""}</span>
        </div>
      </div>
    `;
  }).join("");

  els.recentComments.querySelectorAll(".recent-comment-item").forEach((el) => {
    el.addEventListener("click", () => openDetail(el.dataset.submissionId));
  });
}

function getFilteredSubmissions() {
  const query = state.chartQuery.trim().toLowerCase();
  if (!query) return state.submissions;

  return state.submissions.filter((item) => {
    const text = [
      item.title,
      item.chart_number,
      formatChartNumber(item),
      item.song_title,
      item.song_artist,
      item.charter_name,
      item.description,
      item.level,
      item.level_value,
      formatScore(item),
      formatReactionCount("赞", item.like_count),
      formatReactionCount("踩", item.dislike_count),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  });
}

function renderAllCharts() {
  if (!els.allChartsGrid) return;
  const filtered = getFilteredSubmissions();
  const pageSize = 20;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  if (state.chartPage >= totalPages) state.chartPage = totalPages - 1;
  if (state.chartPage < 0) state.chartPage = 0;
  const start = state.chartPage * pageSize;
  const page = filtered.slice(start, start + pageSize);
  els.allChartCount.textContent = `${filtered.length} / ${state.submissions.length}`;
  renderSubmissionCards(els.allChartsGrid, page, "没有找到匹配的谱面。");

  let pager = els.allChartsGrid.parentElement.querySelector(".chart-pager");
  if (!pager) {
    pager = document.createElement("div");
    pager.className = "chart-pager";
    els.allChartsGrid.after(pager);
  }
  pager.innerHTML = `
    <button class="secondary-button" ${state.chartPage === 0 ? "disabled" : ""} type="button" id="chartPrev">上一页</button>
    <span class="score-pill">${state.chartPage + 1} / ${totalPages}</span>
    <button class="secondary-button" ${state.chartPage >= totalPages - 1 ? "disabled" : ""} type="button" id="chartNext">下一页</button>
  `;
  els.allChartsGrid.parentElement.querySelector("#chartPrev")?.addEventListener("click", () => {
    if (state.chartPage > 0) { state.chartPage--; renderAllCharts(); }
  });
  els.allChartsGrid.parentElement.querySelector("#chartNext")?.addEventListener("click", () => {
    if (state.chartPage < totalPages - 1) { state.chartPage++; renderAllCharts(); }
  });
}

async function loadSubmissions() {
  if (!client) {
    state.submissions = demoSubmissions;
    renderGallery();
    renderAllCharts();
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
  renderAllCharts();
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

function getMaidataField(text, fieldName) {
  const match = String(text || "").match(new RegExp(`^&${fieldName}=(.*)$`, "m"));
  return match ? match[1].trim() : "";
}

function getDefaultMajdataLevelFromText(text) {
  const inoteMatches = [...text.matchAll(/^&inote_(\d+)=/gm)].map((match) => Number(match[1]));
  const levelMatches = [...text.matchAll(/^&lv_(\d+)=/gm)].map((match) => Number(match[1]));
  const available = new Set([...inoteMatches, ...levelMatches]);

  if (available.has(5)) return "lv_5";
  if (!available.size) return "lv_5";

  const highestLevel = Math.max(...available);
  return `lv_${highestLevel}`;
}

function parseMaidataMetadata(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "");
  const levels = parseMajdataLevels(normalized);
  const defaultLevel = getDefaultMajdataLevelFromText(normalized);
  const defaultLevelInfo = levels.find((level) => level.maidataLevel === defaultLevel) || levels[levels.length - 1] || null;

  return {
    songTitle: getMaidataField(normalized, "title"),
    songArtist: getMaidataField(normalized, "artist"),
    charterName: getMaidataField(normalized, "des"),
    defaultLevel,
    levelValue: defaultLevelInfo?.value || "",
  };
}

async function parseMaidataFile(maidataFile) {
  return parseMaidataMetadata(await maidataFile.text());
}

async function detectDefaultMajdataLevel(maidataFile) {
  return (await parseMaidataFile(maidataFile)).defaultLevel;
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

function getMaidataLevelName(maidataLevel) {
  const match = String(maidataLevel || "").match(/^lv_(\d+)$/i);
  return match ? getLevelName(Number(match[1])) : String(maidataLevel || "LV");
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
    .select("id,user_code,display_name,avatar_url,is_admin,created_at")
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
      .select("id,user_code,display_name,avatar_url,is_admin,created_at")
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

function getInboxKindLabel(message) {
  if (message.kind === "comment_reply") return "回复";
  if (message.kind === "chart_comment") return "评论";
  if (message.kind === "admin_broadcast") return "管理员全体通知";
  if (message.kind === "admin_direct") return "管理员通知";
  return "站内信";
}

function renderInbox() {
  if (!els.inboxList) return;

  const messages = state.inboxMessages || [];
  const unreadCount = messages.filter((message) => !message.read_at).length;
  if (els.inboxUnreadCount) els.inboxUnreadCount.textContent = String(unreadCount);
  if (els.inboxTotalCount) els.inboxTotalCount.textContent = String(messages.length);
  if (els.markAllInboxRead) els.markAllInboxRead.disabled = unreadCount === 0;

  els.inboxList.innerHTML = "";
  if (!messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.textContent = "信箱里暂时没有消息。";
    els.inboxList.append(empty);
    return;
  }

  messages.forEach((message) => {
    const item = document.createElement("article");
    item.className = `inbox-item${message.read_at ? "" : " is-unread"}`;

    const actions = document.createElement("div");
    actions.className = "inbox-actions";

    if (message.related_submission_id) {
      const openButton = document.createElement("button");
      openButton.className = "secondary-button";
      openButton.type = "button";
      openButton.textContent = "查看谱面";
      openButton.addEventListener("click", () => openInboxSubmission(message.related_submission_id));
      actions.append(openButton);
    }

    if (!message.read_at) {
      const readButton = document.createElement("button");
      readButton.className = "link-button";
      readButton.type = "button";
      readButton.textContent = "标为已读";
      readButton.addEventListener("click", () => markInboxMessageRead(message.id));
      actions.append(readButton);
    }

    item.innerHTML = `
      <div class="inbox-item-head">
        <div>
          <span class="score-pill">${escapeHtml(getInboxKindLabel(message))}</span>
          <h3>${escapeHtml(message.title || "站内信")}</h3>
        </div>
        <time>${escapeHtml(formatDateTime(message.created_at))}</time>
      </div>
      <div class="comment-body inbox-body">${renderMarkdown(message.body || "")}</div>
    `;
    if (actions.children.length) {
      item.append(actions);
    }
    els.inboxList.append(item);
  });
}

async function loadInbox() {
  if (!client || !state.session) {
    state.inboxMessages = [];
    renderInbox();
    return;
  }

  setNotice(els.inboxNotice, "加载中...");
  const { data, error } = await client.rpc("inbox_rows");
  if (error) {
    state.inboxMessages = [];
    renderInbox();
    setNotice(els.inboxNotice, error.message, true);
    return;
  }

  state.inboxMessages = data || [];
  renderInbox();
  setNotice(els.inboxNotice, "");
}

async function markInboxMessageRead(messageId) {
  if (!client || !state.session || !messageId) return;

  const { error } = await client.rpc("mark_inbox_message_read", { p_message_id: messageId });
  if (error) {
    setNotice(els.inboxNotice, error.message, true);
    return;
  }

  state.inboxMessages = state.inboxMessages.map((message) =>
    message.id === messageId ? { ...message, read_at: new Date().toISOString() } : message,
  );
  renderInbox();
  setNotice(els.inboxNotice, "已标为已读。");
}

async function markAllInboxMessagesRead() {
  if (!client || !state.session) return;

  const { error } = await client.rpc("mark_all_inbox_messages_read");
  if (error) {
    setNotice(els.inboxNotice, error.message, true);
    return;
  }

  const readAt = new Date().toISOString();
  state.inboxMessages = state.inboxMessages.map((message) => ({ ...message, read_at: message.read_at || readAt }));
  renderInbox();
  setNotice(els.inboxNotice, "全部消息已标为已读。");
}

async function openInboxSubmission(submissionId) {
  if (!submissionId) return;
  if (!state.submissions.some((submission) => submission.id === submissionId)) {
    await loadSubmissions();
  }
  const target = state.submissions.find((submission) => submission.id === submissionId);
  if (!target) {
    setNotice(els.inboxNotice, "对应谱面不存在或已被删除。", true);
    return;
  }
  await openDetail(submissionId);
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
          return column.html ? `<td>${value ?? ""}</td>` : `<td>${escapeHtml(value ?? "")}</td>`;
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

function formatUserLabel(user) {
  return [user?.user_code, user?.display_name, user?.email || user?.user_email].filter(Boolean).join(" / ") || "未命名用户";
}

function storagePathFromPublicUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/submissions/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return "";
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch (_error) {
    return "";
  }
}

function collectSubmissionStoragePaths(submission) {
  const paths = new Set();
  [
    submission.image_path,
    storagePathFromPublicUrl(submission.image_url),
    storagePathFromPublicUrl(submission.maidata_url),
    storagePathFromPublicUrl(submission.track_url),
    storagePathFromPublicUrl(submission.bg_url),
    storagePathFromPublicUrl(submission.pv_url),
  ]
    .filter(Boolean)
    .forEach((path) => paths.add(path));

  return [...paths];
}

function getSubmissionStoragePath(submission, fileType) {
  if (!submission) return "";

  if (fileType === "bg") {
    return submission.image_path || storagePathFromPublicUrl(submission.bg_url || submission.image_url);
  }

  const fieldByType = {
    maidata: "maidata_url",
    track: "track_url",
    pv: "pv_url",
  };
  return storagePathFromPublicUrl(submission[fieldByType[fileType]]);
}

function getAdminFileConfig(fileType, file) {
  if (fileType === "maidata") {
    return { key: "maidata_url", expectedNames: ["maidata.txt"], pathName: "maidata.txt" };
  }
  if (fileType === "track") {
    return { key: "track_url", expectedNames: ["track.mp3"], pathName: "track.mp3" };
  }
  if (fileType === "pv") {
    return { key: "pv_url", expectedNames: ["pv.mp4"], pathName: "pv.mp4" };
  }
  if (fileType === "bg") {
    const expectedNames = ["bg.jpg", "bg.png"];
    return { key: "bg_url", expectedNames, pathName: file?.name || "bg.jpg" };
  }
  throw new Error("请选择要管理的文件类型。");
}

function syncAdminSelects() {
  if (els.adminSubmitterSelect) {
    els.adminSubmitterSelect.innerHTML = state.adminUsers
      .map((user) => {
        const label = formatUserLabel(user);
        return `<option value="${escapeHtml(user.id)}">${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  if (els.adminPasswordUserSelect) {
    els.adminPasswordUserSelect.innerHTML = state.adminUsers
      .map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(formatUserLabel(user))}</option>`)
      .join("");
  }

  if (els.adminFileSubmissionSelect) {
    els.adminFileSubmissionSelect.innerHTML = state.adminSubmissions
      .map((submission) => {
        const label = `${submission.title || "未命名谱面"} / ${formatUserLabel(submission)}`;
        return `<option value="${escapeHtml(submission.id)}">${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  if (els.adminMessageUserSelect) {
    els.adminMessageUserSelect.innerHTML = state.adminUsers
      .map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(formatUserLabel(user))}</option>`)
      .join("");
  }
}

function renderAdminSubmissionLimit() {
  if (!els.adminSubmissionLimitForm) return;

  const enabled = Boolean(state.adminSubmissionLimit?.enabled);
  const maxCount = Number(state.adminSubmissionLimit?.maxCount || 1);
  if (els.adminSubmissionLimitEnabled) {
    els.adminSubmissionLimitEnabled.checked = enabled;
  }
  if (els.adminSubmissionLimitMax) {
    els.adminSubmissionLimitMax.value = String(maxCount);
    els.adminSubmissionLimitMax.disabled = !enabled;
  }
  if (els.adminSubmissionLimitStatus) {
    els.adminSubmissionLimitStatus.textContent = enabled
      ? `当前普通用户最多可提交 ${maxCount} 张谱面。`
      : "当前普通用户提交数量不受限制。";
  }
}

function renderAdminData() {
  els.adminUserCount.textContent = String(state.adminUsers.length);
  els.adminSubmissionCount.textContent = String(state.adminSubmissions.length);
  els.adminRatingCount.textContent = String(state.adminRatings.length);
  els.adminCommentCount.textContent = String(state.adminComments.length);
  els.adminInviteCount.textContent = String(state.adminInvites.length);
  if (els.adminMessageCount) els.adminMessageCount.textContent = String(state.adminMessages.length);
  syncAdminSelects();
  updateAdminMessageTargetUi();
  renderAdminSubmissionLimit();

  renderAdminTable(
    els.adminUsersTable,
    [
      { label: "内部编号", key: "user_code" },
      { label: "邮箱", key: "email" },
      { label: "显示名", key: "display_name" },
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
    els.adminSubmissionsTable,
    [
      { label: "谱面 ID", key: "id" },
      { label: "提交者编号", key: "user_code" },
      { label: "提交者", render: (row) => row.display_name || "-" },
      { label: "标题", key: "title" },
      { label: "评分", render: (row) => `${Number(row.average_score || 0).toFixed(1)} / 10 (${row.rating_count || 0})` },
      { label: "文件", render: (row) => {
        const names = [
          row.maidata_url ? "maidata" : "",
          row.track_url ? "track" : "",
          row.bg_url || row.image_url ? "bg" : "",
          row.pv_url ? "pv" : "",
        ].filter(Boolean);
        return names.length ? names.join(", ") : "无";
      } },
      { label: "提交时间", render: (row) => formatDateTime(row.created_at) },
      {
        label: "操作",
        html: true,
        render: (row) => `<button class="danger-button" data-admin-delete-submission="${escapeHtml(row.id)}" type="button">删除谱面</button>`,
      },
    ],
    state.adminSubmissions,
    "没有谱面数据。"
  );

  renderAdminTable(
    els.adminRatingsTable,
    [
      { label: "评分 ID", key: "id" },
      { label: "谱面 ID", key: "submission_id" },
      { label: "评分人编号", key: "user_code" },
      { label: "作品", key: "submission_title" },
      { label: "邮箱", key: "user_email" },
      { label: "评分人", key: "display_name" },
      { label: "分数", render: (row) => Number(row.score || 0).toFixed(1) },
      { label: "更新时间", render: (row) => formatDateTime(row.updated_at) },
      {
        label: "操作",
        html: true,
        render: (row) => `<button class="danger-button" data-admin-delete-rating="${escapeHtml(row.id)}" type="button">取消评分</button>`,
      },
    ],
    state.adminRatings,
    "没有评分数据。"
  );

  renderAdminTable(
    els.adminCommentsTable,
    [
      { label: "作品", key: "submission_title" },
      { label: "评论人编号", key: "user_code" },
      { label: "邮箱", key: "user_email" },
      { label: "评论人", key: "display_name" },
      { label: "评论 Markdown", key: "body" },
      { label: "发表时间", render: (row) => formatDateTime(row.created_at) },
    ],
    state.adminComments,
    "没有评论数据。"
  );

  renderAdminTable(
    els.adminInvitesTable,
    [
      { label: "邀请码", key: "code" },
      { label: "备注", key: "note" },
      { label: "使用者编号", render: (row) => row.used_user_code || "-" },
      { label: "使用者", render: (row) => row.used_display_name || "-" },
      { label: "使用者邮箱", render: (row) => row.used_email || "-" },
      { label: "使用时间", render: (row) => formatDateTime(row.used_at) || "-" },
      { label: "过期时间", render: (row) => formatDateTime(row.expires_at) || "-" },
      { label: "创建时间", render: (row) => formatDateTime(row.created_at) },
    ],
    state.adminInvites,
    "没有邀请码数据。"
  );

  renderAdminTable(
    els.adminMessagesTable,
    [
      { label: "标题", key: "title" },
      { label: "目标", render: (row) => (row.target_scope === "all" ? "全体成员" : formatUserLabel(row)) },
      { label: "正文", key: "body" },
      { label: "发送时间", render: (row) => formatDateTime(row.created_at) },
    ],
    state.adminMessages,
    "还没有发送过站内信。"
  );
}

function setAdminTab(tab) {
  state.adminTab = tab;
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === tab);
  });
  els.adminUsersPanel.classList.toggle("hidden", tab !== "users");
  els.adminSubmissionsPanel.classList.toggle("hidden", tab !== "submissions");
  els.adminRatingsPanel.classList.toggle("hidden", tab !== "ratings");
  els.adminCommentsPanel.classList.toggle("hidden", tab !== "comments");
  els.adminInvitesPanel.classList.toggle("hidden", tab !== "invites");
  els.adminMessagesPanel?.classList.toggle("hidden", tab !== "messages");
}

async function loadAdminData() {
  if (!client || !state.session || !state.profile?.is_admin) {
    setNotice(els.adminNotice, "当前账号没有管理员权限。", true);
    return;
  }

  setNotice(els.adminNotice, "加载中...");
  const [usersResult, submissionsResult, ratingsResult, commentsResult, invitesResult, messagesResult, limitResult] = await Promise.all([
    client.rpc("admin_user_rows"),
    client.rpc("admin_submission_rows"),
    client.rpc("admin_rating_rows"),
    client.rpc("admin_comment_rows"),
    client.rpc("admin_invite_rows"),
    client.rpc("admin_message_rows"),
    client.rpc("admin_submission_limit_settings"),
  ]);

  const error =
    usersResult.error ||
    submissionsResult.error ||
    ratingsResult.error ||
    commentsResult.error ||
    invitesResult.error ||
    messagesResult.error ||
    limitResult.error;
  if (error) {
    setNotice(els.adminNotice, error.message, true);
    state.adminUsers = [];
    state.adminSubmissions = [];
    state.adminRatings = [];
    state.adminComments = [];
    state.adminInvites = [];
    state.adminMessages = [];
    renderAdminData();
    return;
  }

  state.adminUsers = usersResult.data || [];
  state.adminSubmissions = submissionsResult.data || [];
  state.adminRatings = ratingsResult.data || [];
  state.adminComments = commentsResult.data || [];
  state.adminInvites = invitesResult.data || [];
  state.adminMessages = messagesResult.data || [];
  const limitSettings = Array.isArray(limitResult.data) ? limitResult.data[0] : limitResult.data;
  state.adminSubmissionLimit = {
    enabled: Boolean(limitSettings?.limit_enabled),
    maxCount: Number(limitSettings?.max_submissions || 1),
  };
  renderAdminData();
  setAdminTab(state.adminTab);
  setNotice(els.adminNotice, "");
}

async function deleteAdminRating(ratingId) {
  if (!client || !ratingId) return;
  if (!window.confirm("确定要取消这一条评分吗？")) return;

  setNotice(els.adminNotice, "正在取消评分...");
  const { error } = await client.rpc("admin_delete_rating", { p_rating_id: ratingId });
  if (error) {
    setNotice(els.adminNotice, error.message, true);
    return;
  }

  await Promise.all([loadSubmissions(), loadAdminData()]);
  setNotice(els.adminNotice, "评分已取消。");
}

async function deleteAdminSubmission(submissionId) {
  if (!client || !submissionId) return;
  const submission = state.adminSubmissions.find((item) => item.id === submissionId);
  if (!submission) return;
  if (!window.confirm(`确定要删除谱面「${submission.title}」吗？该操作会同时删除评分、评论和已上传文件。`)) return;

  setNotice(els.adminNotice, "正在删除谱面...");
  const paths = collectSubmissionStoragePaths(submission);
  const { error } = await client.rpc("admin_delete_submission", { p_submission_id: submissionId });
  if (error) {
    setNotice(els.adminNotice, error.message, true);
    return;
  }

  if (paths.length) {
    const removed = await client.storage.from("submissions").remove(paths);
    if (removed.error) {
      setNotice(els.adminNotice, removed.error.message, true);
      return;
    }
  }

  await Promise.all([loadSubmissions(), loadAdminData()]);
  setNotice(els.adminNotice, "谱面已删除。");
}

function updateAdminSubmissionLimitUi() {
  if (!els.adminSubmissionLimitEnabled || !els.adminSubmissionLimitMax) return;
  els.adminSubmissionLimitMax.disabled = !els.adminSubmissionLimitEnabled.checked;
}

async function handleAdminSubmissionLimit(event) {
  event.preventDefault();
  if (!client || !state.profile?.is_admin) return;

  const formElement = event.currentTarget;
  const enabled = Boolean(els.adminSubmissionLimitEnabled?.checked);
  const maxCount = Number(els.adminSubmissionLimitMax?.value || 1);

  if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 100) {
    setNotice(els.adminNotice, "最大提交数量需要是 1 到 100 之间的整数。", true);
    return;
  }

  setFormBusy(formElement, true, "保存中...");
  setNotice(els.adminNotice, "正在保存提交限制...");
  try {
    const { data, error } = await client.rpc("admin_update_submission_limit", {
      p_limit_enabled: enabled,
      p_max_submissions: maxCount,
    });

    if (error) {
      setNotice(els.adminNotice, error.message, true);
      return;
    }

    const settings = Array.isArray(data) ? data[0] : data;
    state.adminSubmissionLimit = {
      enabled: Boolean(settings?.limit_enabled),
      maxCount: Number(settings?.max_submissions || maxCount),
    };
    renderAdminSubmissionLimit();
    setNotice(els.adminNotice, "普通用户提交限制已保存。");
  } finally {
    setFormBusy(formElement, false);
  }
}

async function handleAdminInvite(event) {
  event.preventDefault();
  if (!client || !state.profile?.is_admin) return;

  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const expiresAt = form.get("expiresAt") ? new Date(form.get("expiresAt")).toISOString() : null;

  setFormBusy(formElement, true, "生成中...");
  setNotice(els.adminNotice, "正在生成邀请码...");
  try {
    const { data, error } = await client.rpc("admin_create_invite", {
      p_code: String(form.get("code") || "").trim() || null,
      p_note: String(form.get("note") || "").trim() || null,
      p_expires_at: expiresAt,
    });

    if (error) {
      setNotice(els.adminNotice, error.message, true);
      return;
    }

    const created = Array.isArray(data) ? data[0] : data;
    if (els.adminGeneratedInvite) {
      els.adminGeneratedInvite.textContent = created?.code ? `已生成：${created.code}` : "";
    }
    formElement.reset();
    await loadAdminData();
    setNotice(els.adminNotice, "邀请码已生成。");
  } finally {
    setFormBusy(formElement, false);
  }
}

async function handleAdminPasswordUpdate(event) {
  event.preventDefault();
  if (!client || !state.profile?.is_admin) return;

  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const userId = String(form.get("userId") || "");
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!userId) {
    setNotice(els.adminNotice, "请选择要修改密码的账户。", true);
    return;
  }

  if (password.length < 6) {
    setNotice(els.adminNotice, "新密码至少需要 6 个字符。", true);
    return;
  }

  if (password !== confirmPassword) {
    setNotice(els.adminNotice, "两次输入的新密码不一致。", true);
    return;
  }

  setFormBusy(formElement, true, "修改中...");
  setNotice(els.adminNotice, "正在修改账户密码...");
  try {
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      setNotice(els.adminNotice, "登录状态已失效，请重新登录后再修改密码。", true);
      return;
    }

    const { data, error } = await client.functions.invoke("admin-update-password", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: { userId, password },
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
      setNotice(els.adminNotice, message, true);
      return;
    }

    formElement.reset();
    syncAdminSelects();
    setNotice(els.adminNotice, data?.message || "账户密码已修改。");
  } catch (error) {
    setNotice(els.adminNotice, error.message || "修改密码失败。", true);
  } finally {
    setFormBusy(formElement, false);
  }
}

function updateAdminMessageTargetUi() {
  if (!els.adminMessageTarget || !els.adminMessageUserSelect) return;
  els.adminMessageUserSelect.disabled = els.adminMessageTarget.value === "all";
}

async function handleAdminMessage(event) {
  event.preventDefault();
  if (!client || !state.profile?.is_admin) return;

  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const targetScope = String(form.get("targetScope") || "all");
  const targetUserId = targetScope === "user" ? String(form.get("targetUserId") || "") : null;
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "").trim();

  if (!title) {
    setNotice(els.adminNotice, "请填写站内信标题。", true);
    return;
  }

  if (!body) {
    setNotice(els.adminNotice, "请填写站内信正文。", true);
    return;
  }

  if (targetScope === "user" && !targetUserId) {
    setNotice(els.adminNotice, "请选择收信用户。", true);
    return;
  }

  setFormBusy(formElement, true, "发送中...");
  setNotice(els.adminNotice, "正在发送站内信...");
  try {
    const { error } = await client.rpc("admin_send_message", {
      p_target_scope: targetScope,
      p_target_user_id: targetUserId,
      p_title: title,
      p_body: body,
    });

    if (error) {
      setNotice(els.adminNotice, error.message, true);
      return;
    }

    formElement.reset();
    updateAdminMessageTargetUi();
    await loadAdminData();
    setNotice(els.adminNotice, "站内信已发送。");
  } finally {
    setFormBusy(formElement, false);
  }
}

async function handleAdminSubmission(event) {
  event.preventDefault();
  if (!client || !state.profile?.is_admin) return;

  const formElement = event.currentTarget;
  setFormBusy(formElement, true, "上传中...");
  setNotice(els.adminNotice, "正在后台上传谱面...");
  try {
    const form = new FormData(formElement);
    const submitterId = String(form.get("submitterId") || "");
    if (!submitterId) throw new Error("请选择提交者。");

    const maidata = getRequiredFile(form, "maidata", ["maidata.txt"]);
    const track = getRequiredFile(form, "track", ["track.mp3"]);
    const bg = getRequiredFile(form, "bg", ["bg.jpg", "bg.png"]);
    const pv = getOptionalFile(form, "pv", ["pv.mp4"]);
    const metadata = await parseMaidataFile(maidata);
    const fullTitle = metadata.songTitle || String(form.get("title") || "").trim() || "未命名谱面";
    const title = legacyTitleValue(fullTitle);
    const submissionId = crypto.randomUUID();
    const basePath = `${submitterId}/${submissionId}`;
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
      if (upload.error) throw new Error(upload.error.message);

      const { data } = client.storage.from("submissions").getPublicUrl(entry.path);
      urls[entry.key] = data.publicUrl;
    }

    const bgPath = files.find((entry) => entry.key === "bg").path;
    const insert = await client.from("submissions").insert({
      id: submissionId,
      user_id: submitterId,
      title,
      description: form.get("description"),
      image_path: bgPath,
      image_url: urls.bg,
      maidata_url: urls.maidata,
      track_url: urls.track,
      bg_url: urls.bg,
      pv_url: urls.pv || null,
      level: metadata.defaultLevel,
      level_value: metadata.levelValue || null,
      song_title: metadata.songTitle || fullTitle,
      song_artist: metadata.songArtist || null,
      charter_name: metadata.charterName || null,
    });

    if (insert.error) throw new Error(insert.error.message);

    formElement.reset();
    await Promise.all([loadSubmissions(), loadAdminData()]);
    setNotice(els.adminNotice, "后台上传完成。");
  } catch (error) {
    setNotice(els.adminNotice, error.message || "后台上传失败。", true);
  } finally {
    setFormBusy(formElement, false);
  }
}

async function replaceAdminSubmissionFile(event) {
  event.preventDefault();
  if (!client || !state.profile?.is_admin) return;

  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const submissionId = String(form.get("submissionId") || "");
  const fileType = String(form.get("fileType") || "");
  const submission = state.adminSubmissions.find((item) => item.id === submissionId);
  if (!submission) {
    setNotice(els.adminNotice, "请选择谱面。", true);
    return;
  }

  const file = form.get("file");
  if (!(file instanceof File) || !file.size) {
    setNotice(els.adminNotice, "请选择要上传/替换的文件。", true);
    return;
  }

  setFormBusy(formElement, true, "处理中...");
  setNotice(els.adminNotice, "正在替换文件...");
  try {
    const config = getAdminFileConfig(fileType, file);
    if (!config.expectedNames.includes(file.name)) {
      throw new Error(`${fileType} 文件名必须严格为 ${config.expectedNames.join(" 或 ")}。`);
    }

    const oldPath = getSubmissionStoragePath(submission, fileType);
    const nextPath = `${submission.user_id}/${submission.id}/${config.pathName}`;
    const upload = await client.storage.from("submissions").upload(nextPath, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (upload.error) throw new Error(upload.error.message);

    if (oldPath && oldPath !== nextPath) {
      await client.storage.from("submissions").remove([oldPath]);
    }

    const { data } = client.storage.from("submissions").getPublicUrl(nextPath);
    const updates = { [config.key]: data.publicUrl };
    if (fileType === "bg") {
      updates.image_path = nextPath;
      updates.image_url = data.publicUrl;
    }
    if (fileType === "maidata") {
      const metadata = await parseMaidataFile(file);
      updates.level = metadata.defaultLevel;
      updates.level_value = metadata.levelValue || null;
      updates.song_title = metadata.songTitle || null;
      updates.song_artist = metadata.songArtist || null;
      updates.charter_name = metadata.charterName || null;
      if (metadata.songTitle) {
        updates.title = legacyTitleValue(metadata.songTitle);
      }
    }

    const updated = await client.from("submissions").update(updates).eq("id", submission.id);
    if (updated.error) throw new Error(updated.error.message);

    formElement.reset();
    await Promise.all([loadSubmissions(), loadAdminData()]);
    setNotice(els.adminNotice, "文件已上传/替换。");
  } catch (error) {
    setNotice(els.adminNotice, error.message || "文件替换失败。", true);
  } finally {
    setFormBusy(formElement, false);
  }
}

async function deleteAdminSubmissionFile() {
  if (!client || !state.profile?.is_admin || !els.adminFileForm) return;

  const form = new FormData(els.adminFileForm);
  const submissionId = String(form.get("submissionId") || "");
  const fileType = String(form.get("fileType") || "");
  const submission = state.adminSubmissions.find((item) => item.id === submissionId);
  if (!submission) {
    setNotice(els.adminNotice, "请选择谱面。", true);
    return;
  }
  if (!window.confirm("确定要删除这个谱面文件吗？")) return;

  const path = getSubmissionStoragePath(submission, fileType);
  setNotice(els.adminNotice, "正在删除文件...");
  if (path) {
    const removed = await client.storage.from("submissions").remove([path]);
    if (removed.error) {
      setNotice(els.adminNotice, removed.error.message, true);
      return;
    }
  }

  const config = getAdminFileConfig(fileType);
  const updates = { [config.key]: null };
  if (fileType === "bg") {
    updates.image_path = null;
    updates.image_url = null;
  }

  const updated = await client.from("submissions").update(updates).eq("id", submission.id);
  if (updated.error) {
    setNotice(els.adminNotice, updated.error.message, true);
    return;
  }

  await Promise.all([loadSubmissions(), loadAdminData()]);
  setNotice(els.adminNotice, "文件已删除。");
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
      .select("id,user_code,display_name,avatar_url,is_admin,created_at")
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

  const displayLevels = levels.filter((level) => level.index === 5 || level.index === 6);

  els.chartLevelPanel.classList.toggle("hidden", !displayLevels.length);
  els.chartLevelFallback.classList.add("hidden");
  els.chartLevelButtons.innerHTML = "";
  els.chartLevelNotice.textContent = "";
  els.chartLevelNotice.classList.add("hidden");

  displayLevels.forEach((level) => {
    const button = document.createElement("button");
    button.type = "button";
    const levelTheme = `level-${String(level.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown"}`;
    button.className = `level-button ${levelTheme}${level.maidataLevel === activeLevel ? " is-active" : ""}`;
    button.dataset.level = level.maidataLevel;
    button.innerHTML = `
      <span>${escapeHtml(level.name)}</span>
      <strong>${escapeHtml(level.value)}</strong>
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
  state.activeVoteValue = 0;
  state.activeCommentReply = null;
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
  if (els.songInfoBody) {
    els.songInfoBody.innerHTML = `
      <div class="info-pills">
        <span class="reaction-pill">${escapeHtml(formatScore(item))}</span>
        <span class="reaction-pill">${escapeHtml(formatReactionCount("赞", item.like_count))}</span>
        <span class="reaction-pill">${escapeHtml(formatReactionCount("踩", item.dislike_count))}</span>
      </div>
      <h2>${escapeHtml(item.song_title || item.title)}</h2>
      <div class="song-meta-grid">
        <span>编号</span>
        <strong>${escapeHtml(formatChartNumber(item) || "未编号")}</strong>
        <span>曲师</span>
        <strong>${escapeHtml(item.song_artist || "未填写")}</strong>
        <span>谱师</span>
        <strong>${escapeHtml(item.charter_name || "未填写")}</strong>
      </div>
      <div class="song-actions">
        <button class="secondary-button" id="downloadChartButton" type="button">下载谱面</button>
        <button class="secondary-button reaction-btn like-btn" data-vote-value="1" type="button">👍 <span id="detailLikeCount">${item.like_count || 0}</span></button>
        <button class="secondary-button reaction-btn dislike-btn" data-vote-value="-1" type="button">👎 <span id="detailDislikeCount">${item.dislike_count || 0}</span></button>
      </div>
    `;
  }
  if (els.chartDescription) {
    els.chartDescription.innerHTML = `
      <div class="panel-heading compact-heading"><h3>谱师自述</h3></div>
      <p class="song-description">${escapeHtml(item.description || "未填写谱面简介。")}</p>
    `;
  }

  let userScore = 0;
  if (client && state.session) {
    const { data: ratingData } = await client
      .from("ratings")
      .select("score")
      .eq("submission_id", item.id)
      .eq("user_id", state.session.user.id)
      .limit(1);
    if (ratingData?.[0]?.score) userScore = Number(ratingData[0].score);
  }
  const hasUserScore = userScore > 0;
  const hue = hasUserScore ? Math.round(240 - (userScore - 1) / 9 * 240) : 0;
  const scoreColor = hasUserScore ? `hsl(${hue}, 65%, 50%)` : "";
  const scoreBg = hasUserScore ? `hsl(${hue}, 60%, 92%)` : "";
  const scoreBoxes = Array.from({ length: 10 }, (_, i) => {
    const val = i + 1;
    const boxHue = Math.round(240 - (val - 1) / 9 * 240);
    const boxColor = `hsl(${boxHue}, 65%, 50%)`;
    const isActive = hasUserScore && val === Math.round(userScore) ? " is-active" : "";
    return `<button class="score-box${isActive}" data-score="${val}" style="color:${boxColor};border-color:${boxColor};background:hsl(${boxHue},60%,92%)" type="button">${val}</button>`;
  }).join("");

  els.detailRatingCard.innerHTML = `
    <div class="rating-head-row">
      <div class="panel-heading compact-heading"><h3>作品评分</h3></div>
      <span class="reaction-pill score-pill-display ${hasUserScore ? "is-scored" : "is-unscored"}"${hasUserScore ? ` style="color:${scoreColor};background:${scoreBg};border-color:${scoreColor}"` : ""}>${hasUserScore ? userScore.toFixed(1) : "暂无评分"}</span>
    </div>
    <div class="score-box-row">${scoreBoxes}</div>
    <p class="notice">点击上方快捷评分，或使用下方输入框</p>
    <form class="rating-control rating-control-detail" id="ratingForm">
      <input name="score" type="number" min="1" max="10" step="0.1" value="9" required />
      <button class="primary-button" type="submit">提交评分</button>
    </form>
  `;

  els.detailContent.innerHTML = `
    <section class="comments-panel function-card comment-card">
      <div class="panel-heading compact-heading">
        <h3>评论区</h3>
        <span class="score-pill" id="commentCount">0</span>
      </div>
      <form class="comment-form" id="commentForm">
        <div class="reply-context hidden" id="replyContext">
          <span></span>
          <button class="link-button" id="cancelReplyButton" type="button">取消回复</button>
        </div>
        <textarea name="body" maxlength="1000" rows="4" placeholder="写下你对这个谱面的想法，支持 Markdown" required></textarea>
        <div class="comment-preview hidden" id="commentPreview" aria-live="polite"></div>
        <div class="comment-actions">
          <p class="notice" id="commentNotice">${state.session ? "支持 Markdown：粗体、列表、链接、代码块。" : "登录后可以发表评论。"}</p>
          <div class="comment-action-buttons">
            <button class="secondary-button" id="commentPreviewToggle" type="button">预览 Markdown</button>
            <button class="primary-button" type="submit">发表评论</button>
          </div>
        </div>
      </form>
      <div class="comment-list" id="commentList"></div>
    </section>
  `;

  document.querySelectorAll(".score-box").forEach((box) => {
    box.addEventListener("click", () => submitQuickRating(Number(box.dataset.score)));
  });
  document.querySelector("#ratingForm").addEventListener("submit", submitRating);
  document.querySelector("#commentForm").addEventListener("submit", submitComment);
  document.querySelectorAll("[data-vote-value]").forEach((button) => {
    button.addEventListener("click", () => submitSubmissionVote(Number(button.dataset.voteValue)));
  });
  document.querySelector("#downloadChartButton")?.addEventListener("click", () => downloadSubmissionPackage(item));
  document.querySelector("#cancelReplyButton")?.addEventListener("click", clearReplyTarget);
  setupCommentPreview();
  updateReactionUi(item, 0);
  updateReplyContext();
  showView("detail");
  window.location.hash = `detail=${encodeURIComponent(item.id)}`;
  await loadCurrentVote();
  await loadComments();

  if (!hasPreviewFiles) return;

  try {
    const levels = await loadMajdataLevels(item.maidata_url);
    if (state.activeSubmission?.id !== item.id) return;

    state.activeChartLevels = levels;
    const current = levels.find((level) => level.maidataLevel === state.activeChartLevel && (level.index === 5 || level.index === 6));
    const fallback =
      levels.find((level) => level.maidataLevel === "lv_5") ||
      levels.find((level) => level.index === 6) ||
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
    els.chartLevelButtons.innerHTML = "";
    els.chartLevelNotice.textContent = `Failed to load chart levels: ${error.message || error}`;
    els.chartLevelNotice.classList.remove("hidden");
  }
}

function updateReactionUi(item = state.activeSubmission, voteValue = state.activeVoteValue) {
  if (!item) return;

  const likeCount = document.querySelector("#detailLikeCount");
  const dislikeCount = document.querySelector("#detailDislikeCount");
  if (likeCount) likeCount.textContent = item.like_count || 0;
  if (dislikeCount) dislikeCount.textContent = item.dislike_count || 0;

  document.querySelectorAll("[data-vote-value]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.voteValue) === voteValue);
  });
}

async function loadCurrentVote() {
  const item = state.activeSubmission;
  if (!client || !state.session || !item) {
    state.activeVoteValue = 0;
    updateReactionUi(item, 0);
    return;
  }

  const { data, error } = await client
    .from("submission_votes")
    .select("value")
    .eq("submission_id", item.id)
    .eq("user_id", state.session.user.id)
    .limit(1);

  if (state.activeSubmission?.id !== item.id) return;

  if (error) {
    const notice = document.querySelector("#reactionNotice");
    if (notice) {
      notice.textContent = error.message;
      notice.style.color = "#8f0000";
    }
    return;
  }

  state.activeVoteValue = Number(data?.[0]?.value || 0);
  updateReactionUi(item, state.activeVoteValue);
}

async function submitSubmissionVote(value) {
  const item = state.activeSubmission;
  const notice = document.querySelector("#reactionNotice");
  if (!item) return;

  if (!client) {
    if (notice) {
      notice.textContent = "演示模式不会保存点赞或点踩。";
      notice.style.color = "";
    }
    return;
  }

  if (!state.session) {
    if (notice) {
      notice.textContent = "请先登录再点赞或点踩。";
      notice.style.color = "#8f0000";
    }
    showToast("请先登录再点赞或点踩。");
    return;
  }

  const nextValue = state.activeVoteValue === value ? 0 : value;
  const query = client
    .from("submission_votes")
    .delete()
    .eq("submission_id", item.id)
    .eq("user_id", state.session.user.id);

  const { error } =
    nextValue === 0
      ? await query
      : await client.from("submission_votes").upsert(
          {
            submission_id: item.id,
            user_id: state.session.user.id,
            value: nextValue,
          },
          { onConflict: "submission_id,user_id" },
        );

  if (error) {
    if (notice) {
      notice.textContent = error.message;
      notice.style.color = "#8f0000";
    }
    showToast(error.message);
    return;
  }

  await loadSubmissions();
  const refreshed = state.submissions.find((entry) => entry.id === item.id) || item;
  state.activeSubmission = refreshed;
  state.activeVoteValue = nextValue;
  updateReactionUi(refreshed, nextValue);

  if (notice) {
    notice.textContent = nextValue === 1 ? "已点赞。" : nextValue === -1 ? "已点踩。" : "已取消反馈。";
    notice.style.color = "";
  }
}

function getCommentDisplayName(comment) {
  return comment?.display_name || "匿名用户";
}

function updateReplyContext() {
  const context = document.querySelector("#replyContext");
  const label = context?.querySelector("span");
  if (!context || !label) return;

  if (!state.activeCommentReply) {
    context.classList.add("hidden");
    label.textContent = "";
    return;
  }

  context.classList.remove("hidden");
  label.innerHTML = `正在回复 <strong>${escapeHtml(state.activeCommentReply.displayName)}</strong>`;
}

function setReplyTarget(comment) {
  state.activeCommentReply = {
    id: comment.id,
    displayName: getCommentDisplayName(comment),
  };
  updateReplyContext();
  const textarea = document.querySelector('#commentForm textarea[name="body"]');
  textarea?.focus();
}

function clearReplyTarget() {
  state.activeCommentReply = null;
  updateReplyContext();
}

function safeFileName(value, fallback = "mufc-chart") {
  const text = String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ");
  return text || fallback;
}

function legacyTitleValue(value) {
  return String(value || "未命名谱面").trim().slice(0, 80) || "未命名谱面";
}

function extensionFromUrl(url, fallback) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").pop() || "";
    const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
    return extension || fallback;
  } catch (_error) {
    return fallback;
  }
}

async function addUrlToZip(zip, fileName, url) {
  if (!url) return;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${fileName} 下载失败：${response.status}`);
  zip.file(fileName, await response.blob());
}

async function downloadSubmissionPackage(item) {
  const button = document.querySelector("#downloadChartButton");
  if (!item || !button) return;

  if (!window.JSZip) {
    showToast("下载组件加载失败，请刷新页面后重试。", "error");
    return;
  }

  const defaultText = button.textContent;
  button.disabled = true;
  button.textContent = "打包中...";
  try {
    const zip = new window.JSZip();
    await addUrlToZip(zip, "maidata.txt", item.maidata_url);
    await addUrlToZip(zip, "track.mp3", item.track_url);
    await addUrlToZip(zip, `bg${extensionFromUrl(item.bg_url || item.image_url, ".png")}`, item.bg_url || item.image_url);
    await addUrlToZip(zip, "pv.mp4", item.pv_url);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(item.song_title || item.title)}.zip`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(error.message || "下载失败。", "error");
  } finally {
    button.disabled = false;
    button.textContent = defaultText;
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

  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const roots = [];
  const repliesByRoot = new Map();

  comments.forEach((comment) => {
    if (!comment.parent_id) {
      roots.push(comment);
      return;
    }

    const parent = byId.get(comment.parent_id);
    const rootId = parent?.parent_id || comment.parent_id;
    if (!byId.has(rootId)) {
      roots.push(comment);
      return;
    }

    if (!repliesByRoot.has(rootId)) {
      repliesByRoot.set(rootId, []);
    }
    repliesByRoot.get(rootId).push(comment);
  });

  roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  repliesByRoot.forEach((items) => {
    items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  });

  const createCommentNode = (comment, isReply = false) => {
    const item = document.createElement("article");
    item.className = `comment-item${isReply ? " is-reply" : ""}`;
    const score =
      comment.user_score !== null && typeof comment.user_score !== "undefined" && state.profile?.is_admin
        ? `${Number(comment.user_score).toFixed(1)} / 10`
        : comment.user_score !== null && typeof comment.user_score !== "undefined"
        ? "已评分"
        : "未评分";
    const author = getCommentDisplayName(comment);
    const parentName = comment.parent_display_name || byId.get(comment.parent_id)?.display_name || "某位用户";
    const replyPrefix = isReply ? `<p class="reply-prefix">${escapeHtml(author)} 回复 ${escapeHtml(parentName)}：</p>` : "";
    const avatar = comment.avatar_url
      ? `<img src="${escapeHtml(comment.avatar_url)}" alt="" />`
      : `<span>${escapeHtml(getInitials(author))}</span>`;

    item.innerHTML = `
      ${replyPrefix}
      <div class="comment-meta">
        <div class="comment-avatar">${avatar}</div>
        <div class="comment-author-line">
          <strong>${escapeHtml(author)}</strong>
          <span>${escapeHtml(score)}</span>
          <time>${escapeHtml(formatDateTime(comment.created_at))}</time>
        </div>
      </div>
      <div class="comment-body">${renderMarkdown(comment.body)}</div>
      <div class="comment-tools">
        <button class="link-button" type="button">回复</button>
      </div>
    `;
    item.querySelector(".comment-tools button")?.addEventListener("click", () => setReplyTarget(comment));
    return item;
  };

  roots.forEach((comment) => {
    const rootNode = createCommentNode(comment);
    list.append(rootNode);
    const replies = repliesByRoot.get(comment.id) || [];
    if (replies.length) {
      const toggle = document.createElement("button");
      toggle.className = "link-button reply-toggle";
      toggle.type = "button";
      toggle.textContent = `展开 ${replies.length} 条回复`;
      const repliesNode = document.createElement("div");
      repliesNode.className = "comment-replies hidden";
      replies.forEach((reply) => repliesNode.append(createCommentNode(reply, true)));
      toggle.addEventListener("click", () => {
        const isHidden = repliesNode.classList.toggle("hidden");
        toggle.textContent = isHidden ? `展开 ${replies.length} 条回复` : "收起回复";
      });
      list.append(toggle, repliesNode);
    }
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
    .select("id,body,parent_id,display_name,avatar_url,parent_display_name,user_score,created_at,updated_at")
    .eq("submission_id", item.id)
    .order("created_at", { ascending: false });

  if (state.activeSubmission?.id !== item.id) return;

  if (error) {
    const notice = document.querySelector("#commentNotice");
    if (notice) {
      notice.textContent = error.message;
      notice.style.color = "#8f0000";
    }
    showToast(error.message);
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
    showToast("评论内容不能为空。");
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
    showToast("请先登录再发表评论。");
    return;
  }

  setFormBusy(formElement, true, "发表中...");
  try {
    const { error } = await client.from("comments").insert({
      submission_id: item.id,
      user_id: state.session.user.id,
      parent_id: state.activeCommentReply?.id || null,
      body,
    });

    if (error) {
      if (notice) {
        notice.textContent = error.message;
        notice.style.color = "#8f0000";
      }
      showToast(error.message);
      return;
    }

    formElement.reset();
    clearReplyTarget();
    if (notice) {
      notice.textContent = "评论已发表。";
      notice.style.color = "";
    }
    await loadComments();
  } finally {
    setFormBusy(formElement, false);
  }
}

async function submitQuickRating(score) {
  if (!client) {
    setNotice(els.authNotice, "演示模式不会保存评分。");
    return;
  }

  if (!state.session) {
    setNotice(els.authNotice, "请先登录再评分。", true);
    return;
  }

  const { error } = await client.from("ratings").upsert(
    {
      submission_id: state.activeSubmission.id,
      user_id: state.session.user.id,
      score,
    },
    { onConflict: "submission_id,user_id" },
  );

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

  const { error } = await client.from("ratings").upsert(
    {
      submission_id: state.activeSubmission.id,
      user_id: state.session.user.id,
      score,
    },
    { onConflict: "submission_id,user_id" },
  );

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

async function loadSubmissionLimitSettings() {
  if (!client) {
    return { enabled: true, maxCount: 1 };
  }

  const { data, error } = await client.rpc("submission_limit_settings");
  if (error) {
    throw new Error(error.message);
  }

  const settings = Array.isArray(data) ? data[0] : data;
  return {
    enabled: Boolean(settings?.limit_enabled),
    maxCount: Number(settings?.max_submissions || 1),
  };
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
    if (!state.profile?.is_admin) {
      const limitSettings = await loadSubmissionLimitSettings();
      if (limitSettings.enabled) {
        const { count, error } = await client
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", state.session.user.id);

        if (error) {
          setNotice(els.submitNotice, error.message, true);
          return;
        }

        if (Number(count || 0) >= limitSettings.maxCount) {
          setNotice(
            els.submitNotice,
            `普通用户最多只能提交 ${limitSettings.maxCount} 张谱面。如需替换或增加额度，请联系管理员。`,
            true,
          );
          return;
        }
      }
    }

    const form = new FormData(formElement);
    const maidata = getRequiredFile(form, "maidata", ["maidata.txt"]);
    const track = getRequiredFile(form, "track", ["track.mp3"]);
    const bg = getRequiredFile(form, "bg", ["bg.jpg", "bg.png"]);
    const pv = getOptionalFile(form, "pv", ["pv.mp4"]);
    const metadata = await parseMaidataFile(maidata);
    const fullTitle = metadata.songTitle || String(form.get("title") || "").trim() || "未命名谱面";
    const title = legacyTitleValue(fullTitle);
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
      title,
      description: form.get("description"),
      image_path: bgPath,
      image_url: urls.bg,
      maidata_url: urls.maidata,
      track_url: urls.track,
      bg_url: urls.bg,
      pv_url: urls.pv || null,
      level: metadata.defaultLevel,
      level_value: metadata.levelValue || null,
      song_title: metadata.songTitle || fullTitle,
      song_artist: metadata.songArtist || null,
      charter_name: metadata.charterName || null,
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
      state.adminSubmissions = [];
      state.adminRatings = [];
      state.adminComments = [];
      state.adminInvites = [];
      state.adminMessages = [];
      state.inboxMessages = [];
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
els.refreshInbox?.addEventListener("click", loadInbox);
els.markAllInboxRead?.addEventListener("click", markAllInboxMessagesRead);
els.refreshAdmin.addEventListener("click", loadAdminData);
els.chartSearch.addEventListener("input", (event) => {
  state.chartQuery = event.currentTarget.value;
  state.chartPage = 0;
  renderAllCharts();
});
document.querySelectorAll("[data-admin-tab]").forEach((button) => {
  button.addEventListener("click", () => setAdminTab(button.dataset.adminTab));
});
els.adminSubmissionForm?.addEventListener("submit", handleAdminSubmission);
els.adminSubmissionLimitForm?.addEventListener("submit", handleAdminSubmissionLimit);
els.adminSubmissionLimitEnabled?.addEventListener("change", updateAdminSubmissionLimitUi);
els.adminFileForm?.addEventListener("submit", replaceAdminSubmissionFile);
els.adminFileForm
  ?.querySelector("[data-admin-delete-file]")
  ?.addEventListener("click", deleteAdminSubmissionFile);
els.adminInviteForm?.addEventListener("submit", handleAdminInvite);
els.adminPasswordForm?.addEventListener("submit", handleAdminPasswordUpdate);
els.adminMessageForm?.addEventListener("submit", handleAdminMessage);
els.adminMessageTarget?.addEventListener("change", updateAdminMessageTargetUi);
els.adminRatingsTable?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-delete-rating]");
  if (button) deleteAdminRating(button.dataset.adminDeleteRating);
});
els.adminSubmissionsTable?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-delete-submission]");
  if (button) deleteAdminSubmission(button.dataset.adminDeleteSubmission);
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
  updateAdminMessageTargetUi();
  showView(["home", "charts", "guide", "submit", "auth", "profile", "inbox", "admin"].includes(route) ? route : "home");
}

initApp();
