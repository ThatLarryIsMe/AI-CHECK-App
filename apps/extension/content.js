/* ── Factward Chrome Extension — Content Script ── */
/* Highlights verified claims inline on the page with verdict badges. */

(() => {
  const HIGHLIGHT_ATTR = "data-factward-claim";
  const TOOLTIP_CLASS = "factward-tooltip";

  const VERDICT_COLORS = {
    supported: { bg: "rgba(52, 211, 153, 0.15)", border: "#34d399", text: "#34d399" },
    mixed: { bg: "rgba(251, 191, 36, 0.15)", border: "#fbbf24", text: "#fbbf24" },
    unsupported: { bg: "rgba(248, 113, 113, 0.15)", border: "#f87171", text: "#f87171" },
    insufficient: { bg: "rgba(148, 163, 184, 0.10)", border: "#94a3b8", text: "#94a3b8" },
  };

  // ── Clear previous highlights ──

  function clearHighlights() {
    document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      // Unwrap: replace the highlight span with its text content
      const textNode = document.createTextNode(el.textContent || "");
      parent.replaceChild(textNode, el);
      parent.normalize();
    });
    document.querySelectorAll(`.${TOOLTIP_CLASS}`).forEach((el) => el.remove());
  }

  // ── Find and wrap matching text in the DOM ──

  function highlightTextInNode(rootNode, searchText, claim) {
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null);
    const normalizedSearch = searchText.toLowerCase().replace(/\s+/g, " ").trim();
    // Use first 60 chars for matching (claims can be long and may not appear verbatim)
    const matchTarget = normalizedSearch.slice(0, 80);

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || "";
      const normalizedNode = nodeText.toLowerCase().replace(/\s+/g, " ");
      const idx = normalizedNode.indexOf(matchTarget);
      if (idx === -1) continue;

      // Find the actual character positions in the original text
      let origStart = 0;
      let normalizedPos = 0;
      for (let i = 0; i < nodeText.length && normalizedPos < idx; i++) {
        if (/\s/.test(nodeText[i])) {
          // Collapse whitespace
          while (i + 1 < nodeText.length && /\s/.test(nodeText[i + 1])) i++;
          normalizedPos++;
        } else {
          normalizedPos++;
        }
        origStart = i + 1;
      }

      // Approximate end position
      const matchLen = Math.min(searchText.length, nodeText.length - origStart);
      const origEnd = origStart + matchLen;

      const range = document.createRange();
      range.setStart(textNode, origStart);
      range.setEnd(textNode, Math.min(origEnd, nodeText.length));

      const colors = VERDICT_COLORS[claim.status] || VERDICT_COLORS.insufficient;

      const highlight = document.createElement("mark");
      highlight.setAttribute(HIGHLIGHT_ATTR, claim.id || "");
      highlight.style.cssText = `
        background: ${colors.bg};
        border-bottom: 2px solid ${colors.border};
        padding: 1px 2px;
        border-radius: 2px;
        cursor: pointer;
        position: relative;
        transition: background 0.15s;
      `;

      highlight.addEventListener("mouseenter", (e) => showTooltip(e, claim, colors));
      highlight.addEventListener("mouseleave", hideTooltip);

      range.surroundContents(highlight);
      return true; // Only highlight first occurrence
    }

    return false;
  }

  // ── Tooltip ──

  let activeTooltip = null;

  function showTooltip(event, claim, colors) {
    hideTooltip();

    const tooltip = document.createElement("div");
    tooltip.className = TOOLTIP_CLASS;
    tooltip.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: #0f172a;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      padding: 10px 14px;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #e2e8f0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      pointer-events: none;
    `;

    const confidence = Math.round((claim.confidence ?? 0) * 100);

    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
        <span style="
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          background: ${colors.bg};
          color: ${colors.text};
          border: 1px solid ${colors.border};
        ">${claim.status}</span>
        <span style="color: #64748b; font-size: 11px;">${confidence}% confidence</span>
      </div>
      <p style="margin: 0; color: #94a3b8; font-size: 11px;">
        ${claim.reasoning || "Verified by Factward AI."}
      </p>
      <p style="margin: 4px 0 0; color: #475569; font-size: 10px;">
        Factward · click for full report
      </p>
    `;

    document.body.appendChild(tooltip);

    // Position near the highlight
    const rect = event.target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left;

    // Keep within viewport
    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - 6;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 8;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${Math.max(8, left)}px`;
    activeTooltip = tooltip;
  }

  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }

  // ── Message listener ──

  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === "FACTWARD_HIGHLIGHT") {
      clearHighlights();

      const claims = message.claims || [];
      if (claims.length === 0) return;

      // Try to find claims in the page content
      const root = document.querySelector("article") || document.querySelector("main") || document.body;
      for (const claim of claims) {
        if (!claim.text) continue;
        highlightTextInNode(root, claim.text, claim);
      }
    }

    if (message.type === "FACTWARD_CLEAR") {
      clearHighlights();
      chrome.runtime.sendMessage({ type: "FACTWARD_CLEAR_BADGE" });
    }
  });
})();
