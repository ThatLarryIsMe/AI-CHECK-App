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
const verifyText = document.getElementById("verify-text");
const verifyBtn = document.getElementById("verify-btn");
const scanPageBtn = document.getElementById("scan-page-btn");
const resultsDiv = document.getElementById("results");
const resultsList = document.getElementById("results-list");
const resultsLink = document.getElementById("results-link");
const loadingDiv = document.getElementById("loading");
const loadingStep = document.getElementById("loading-step");

// ── State ──

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
    // The API returns a session token — store it
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

// ── Helpers ──

function showLoading(step) {
  loadingDiv.hidden = false;
  loadingStep.textContent = step;
  resultsDiv.hidden = true;
}

function hideLoading() {
  loadingDiv.hidden = true;
}

function renderResults(pack) {
  resultsList.innerHTML = "";
  const claims = pack.claims || [];
  if (claims.length === 0) {
    resultsList.innerHTML = '<p class="hint">No verifiable claims found.</p>';
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

async function apiVerify(body) {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_BASE}/api/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Verification failed (${res.status})`);
  }

  return res.json();
}

async function fetchPack(packId) {
  const res = await fetch(`${API_BASE}/api/packs/${packId}/public`);
  if (!res.ok) throw new Error("Failed to load results");
  return res.json();
}

// ── Verify text ──

verifyBtn.addEventListener("click", async () => {
  const text = verifyText.value.trim();
  if (!text) return;

  verifyBtn.disabled = true;
  scanPageBtn.disabled = true;

  try {
    showLoading("Sending text to Factward…");

    const steps = [
      "Extracting claims…",
      "Searching for evidence…",
      "Analyzing sources…",
      "Building report…",
    ];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        loadingStep.textContent = steps[stepIdx];
      }
    }, 3000);

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
    resultsList.innerHTML = `<p class="error">${err.message}</p>`;
    resultsDiv.hidden = false;
  } finally {
    verifyBtn.disabled = false;
    scanPageBtn.disabled = false;
  }
});

// ── Scan page ──

scanPageBtn.addEventListener("click", async () => {
  verifyBtn.disabled = true;
  scanPageBtn.disabled = true;

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

    const steps = [
      "Extracting claims…",
      "Searching for evidence…",
      "Analyzing sources…",
      "Building report…",
    ];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        loadingStep.textContent = steps[stepIdx];
      }
    }, 3000);

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
    resultsList.innerHTML = `<p class="error">${err.message}</p>`;
    resultsDiv.hidden = false;
  } finally {
    verifyBtn.disabled = false;
    scanPageBtn.disabled = false;
  }
});

// ── Init ──
initView();
