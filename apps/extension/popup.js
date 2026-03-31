/* ── Factward Chrome Extension — Popup ── */

const API_BASE = "https://factward.ai";

// ── DOM refs ──
const viewLogin = document.getElementById("view-login");
const viewMain = document.getElementById("view-main");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const userEmailEl = document.getElementById("user-email");
const verifyToggleBtn = document.getElementById("verify-toggle-btn");
const verifyPanel = document.getElementById("verify-panel");
const verifyText = document.getElementById("verify-text");
const verifyBtn = document.getElementById("verify-btn");
const scanPageBtn = document.getElementById("scan-page-btn");
const resultsDiv = document.getElementById("results");
const resultsList = document.getElementById("results-list");
const resultsLink = document.getElementById("results-link");
const loadingDiv = document.getElementById("loading");
const loadingStep = document.getElementById("loading-step");

// ── Session helpers ──

async function getSession() {
  const data = await chrome.storage.local.get(["sessionToken", "email"]);
  return data.sessionToken ? data : null;
}

async function saveSession(token, email) {
  await chrome.storage.local.set({ sessionToken: token, email });
}

async function clearSession() {
  await chrome.storage.local.remove(["sessionToken", "email"]);
}

// ── View switching ──

async function initView() {
  const session = await getSession();
  if (session) {
    viewLogin.hidden = true;
    viewMain.hidden = false;
    userEmailEl.textContent = session.email;
  } else {
    viewLogin.hidden = false;
    viewMain.hidden = true;
  }
}

// ── Login ──

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Login failed (${res.status})`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error("Login succeeded but no token was returned.");
    }
    await saveSession(data.token, loginEmail.value.trim());
    await initView();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
  }
});

// ── Logout ──

logoutBtn.addEventListener("click", async () => {
  await clearSession();
  await initView();
});

// ── Toggle verify panel ──

verifyToggleBtn.addEventListener("click", () => {
  verifyPanel.hidden = !verifyPanel.hidden;
  if (!verifyPanel.hidden) {
    verifyText.focus();
  }
});

// ── Helpers ──

function showLoading(step) {
  loadingDiv.hidden = false;
  loadingStep.textContent = step;
  resultsDiv.hidden = true;
}

function hideLoading() {
  loadingDiv.hidden = true;
}

function showError(message) {
  resultsList.textContent = "";
  const p = document.createElement("p");
  p.className = "error";
  p.textContent = message;
  resultsList.appendChild(p);
  resultsDiv.hidden = false;
}

function renderResults(pack) {
  resultsList.textContent = "";
  const claims = pack.claims || [];
  if (claims.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No verifiable claims found.";
    resultsList.appendChild(p);
    resultsDiv.hidden = false;
    return;
  }

  for (const claim of claims) {
    const card = document.createElement("div");
    card.className = "claim-card";

    const text = document.createElement("p");
    text.className = "claim-text";
    text.textContent = claim.text;

    const verdict = document.createElement("span");
    verdict.className = `claim-verdict verdict-${claim.status}`;
    verdict.textContent = claim.status;

    const confidence = document.createElement("span");
    confidence.className = "claim-confidence";
    confidence.textContent = `${Math.round((claim.confidence ?? 0) * 100)}%`;

    card.appendChild(text);
    card.appendChild(verdict);
    card.appendChild(confidence);
    resultsList.appendChild(card);
  }

  resultsDiv.hidden = false;
}

async function authFetch(url, options = {}) {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");

  const headers = { ...options.headers };
  headers["Authorization"] = `Bearer ${session.sessionToken}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    await clearSession();
    await initView();
    throw new Error("Session expired — please sign in again.");
  }

  return res;
}

async function apiVerify(body) {
  const res = await authFetch(`${API_BASE}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Verification failed (${res.status})`);
  }

  return res.json();
}

async function fetchPack(packId) {
  const res = await authFetch(`${API_BASE}/api/packs/${packId}/public`);
  if (!res.ok) throw new Error("Failed to load results");
  return res.json();
}

function startLoadingSteps() {
  const steps = [
    "Extracting claims…",
    "Searching for evidence…",
    "Analyzing sources…",
    "Building report…",
  ];
  let stepIdx = 0;
  return setInterval(() => {
    stepIdx++;
    if (stepIdx < steps.length) {
      loadingStep.textContent = steps[stepIdx];
    }
  }, 3000);
}

function setActionsDisabled(disabled) {
  verifyBtn.disabled = disabled;
  scanPageBtn.disabled = disabled;
  verifyToggleBtn.disabled = disabled;
}

// ── Verify text ──

verifyBtn.addEventListener("click", async () => {
  const text = verifyText.value.trim();
  if (!text) return;

  setActionsDisabled(true);

  try {
    showLoading("Sending text to Factward…");
    const stepTimer = startLoadingSteps();

    const { packId } = await apiVerify({ text });
    clearInterval(stepTimer);

    showLoading("Loading results…");
    const pack = await fetchPack(packId);
    hideLoading();
    renderResults(pack);

    if (packId) {
      resultsLink.href = `${API_BASE}/report/${packId}`;
      resultsLink.hidden = false;
    }
  } catch (err) {
    hideLoading();
    showError(err.message);
  } finally {
    setActionsDisabled(false);
  }
});

// ── Scan page ──

scanPageBtn.addEventListener("click", async () => {
  setActionsDisabled(true);

  try {
    showLoading("Extracting page text…");

    // Get selected text or full page text from the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: pageText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection()?.toString()?.trim();
        if (sel && sel.length > 20) return sel;
        // Fall back to article body or main content
        const article = document.querySelector("article");
        if (article) return article.innerText.slice(0, 10000);
        const main = document.querySelector("main");
        if (main) return main.innerText.slice(0, 10000);
        return document.body.innerText.slice(0, 10000);
      },
    });

    if (!pageText || pageText.length < 20) {
      throw new Error("Not enough text found on this page.");
    }

    showLoading("Verifying claims…");
    const stepTimer = startLoadingSteps();

    const { packId } = await apiVerify({ text: pageText });
    clearInterval(stepTimer);

    showLoading("Loading results…");
    const pack = await fetchPack(packId);
    hideLoading();
    renderResults(pack);

    // Send results to content script for inline highlighting
    chrome.tabs.sendMessage(tab.id, {
      type: "FACTWARD_HIGHLIGHT",
      claims: pack.claims || [],
    });

    if (packId) {
      resultsLink.href = `${API_BASE}/report/${packId}`;
      resultsLink.hidden = false;
    }
  } catch (err) {
    hideLoading();
    showError(err.message);
  } finally {
    setActionsDisabled(false);
  }
});

// ── Init ──
initView();
