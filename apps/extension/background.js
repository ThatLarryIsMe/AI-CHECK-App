/* ── Factward Chrome Extension — Background Service Worker ── */

const API_BASE = "https://factward.ai";

// ── Open welcome page on first install ──

chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu
  chrome.contextMenus.create({
    id: "factward-verify-selection",
    title: "Verify with Factward",
    contexts: ["selection"],
  });

  // Open welcome/onboarding page on fresh install
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

// ── Context menu: right-click selected text to verify ──

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "factward-verify-selection") return;

  const text = info.selectionText?.trim();
  if (!text || text.length < 10) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Factward",
      message: "Please select more text to verify (at least a full sentence).",
    });
    return;
  }

  const session = await chrome.storage.local.get(["sessionToken"]);
  if (!session.sessionToken) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Factward",
      message: "Please sign in via the Factward extension popup first.",
    });
    return;
  }

  // Show a "working" badge
  chrome.action.setBadgeBackgroundColor({ color: "#06b6d4" });
  chrome.action.setBadgeText({ text: "…", tabId: tab.id });

  try {
    // Verify the selected text
    const verifyRes = await fetch(`${API_BASE}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.sessionToken}`,
      },
      body: JSON.stringify({ text }),
    });

    if (verifyRes.status === 401) {
      await chrome.storage.local.remove(["sessionToken", "email"]);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Factward",
        message: "Session expired — please sign in again via the popup.",
      });
      chrome.action.setBadgeText({ text: "", tabId: tab.id });
      return;
    }

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      throw new Error(err.error || `Verification failed (${verifyRes.status})`);
    }

    const { packId } = await verifyRes.json();

    // Fetch the results
    const packRes = await fetch(`${API_BASE}/api/packs/${packId}/public`);
    if (!packRes.ok) throw new Error("Failed to load results");
    const pack = await packRes.json();

    // Send to content script for inline highlighting
    chrome.tabs.sendMessage(tab.id, {
      type: "FACTWARD_HIGHLIGHT",
      claims: pack.claims || [],
    });

    const claimCount = pack.claims?.length ?? 0;
    chrome.action.setBadgeText({ text: String(claimCount), tabId: tab.id });
  } catch (err) {
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Factward — Error",
      message: err.message,
    });
  }
});

// ── Listen for messages from popup or content scripts ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FACTWARD_CLEAR_BADGE" && sender.tab) {
    chrome.action.setBadgeText({ text: "", tabId: sender.tab.id });
  }
  return false;
});
