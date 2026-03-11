/**
 * Factward Embeddable Badge Widget
 *
 * Usage:
 *   <div data-factward-badge="PACK_ID"></div>
 *   <script src="https://your-domain.com/badge.js" async></script>
 *
 * Options (data attributes):
 *   data-factward-badge="PACK_ID"  — required, the pack UUID
 *   data-factward-theme="light"    — optional, "light" or "dark" (default: "dark")
 *   data-factward-size="compact"   — optional, "compact" or "full" (default: "full")
 */
(function () {
  "use strict";

  var ORIGIN = (function () {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src.indexOf("badge.js") !== -1) {
        return scripts[i].src.replace(/\/badge\.js.*$/, "");
      }
    }
    return "";
  })();

  function createBadge(container) {
    var packId = container.getAttribute("data-factward-badge");
    if (!packId) return;

    var theme = container.getAttribute("data-factward-theme") || "dark";
    var size = container.getAttribute("data-factward-size") || "full";

    // Loading state
    container.innerHTML =
      '<div style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;' +
      "background:" + (theme === "light" ? "#f8fafc" : "#0f172a") + ";" +
      "border:1px solid " + (theme === "light" ? "#e2e8f0" : "#334155") + ";" +
      'border-radius:10px;font-family:system-ui,sans-serif;font-size:12px;' +
      "color:" + (theme === "light" ? "#64748b" : "#94a3b8") + ';">' +
      "Loading verification\u2026</div>";

    // Fetch badge data
    var url = ORIGIN + "/api/badge/" + packId + "?format=json";

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(function (data) {
        container.innerHTML = renderWidget(data, packId, theme, size);
      })
      .catch(function () {
        container.innerHTML =
          '<div style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;' +
          "background:" + (theme === "light" ? "#f8fafc" : "#0f172a") + ";" +
          "border:1px solid " + (theme === "light" ? "#e2e8f0" : "#334155") + ";" +
          'border-radius:10px;font-family:system-ui,sans-serif;font-size:12px;' +
          "color:" + (theme === "light" ? "#94a3b8" : "#64748b") + ';">' +
          "Verification unavailable</div>";
      });
  }

  function trustColor(score) {
    if (score >= 70) return "#22c55e";
    if (score >= 40) return "#eab308";
    return "#ef4444";
  }

  function freshnessColor(label) {
    if (label === "Fresh") return "#22c55e";
    if (label === "Aging") return "#eab308";
    if (label === "Stale") return "#f97316";
    return "#ef4444";
  }

  function renderWidget(data, packId, theme, size) {
    var bg = theme === "light" ? "#ffffff" : "#0f172a";
    var border = theme === "light" ? "#e2e8f0" : "#1e293b";
    var text = theme === "light" ? "#1e293b" : "#e2e8f0";
    var muted = theme === "light" ? "#64748b" : "#94a3b8";
    var tc = trustColor(data.trustScore);
    var fc = freshnessColor(data.freshnessLabel);
    var reportUrl = ORIGIN + "/report/" + packId;

    if (size === "compact") {
      return (
        '<a href="' + reportUrl + '" target="_blank" rel="noopener" ' +
        'style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;' +
        "background:" + bg + ";border:1px solid " + border + ";" +
        'border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;">' +
        // Checkmark
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
        '<circle cx="8" cy="8" r="7" stroke="#22d3ee" stroke-width="1.5"/>' +
        '<path d="M5 8l2 2 4-4" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>" +
        '<span style="font-size:12px;font-weight:600;color:' + tc + ';">' +
        data.trustScore + "% Trust</span>" +
        '<span style="font-size:10px;color:' + fc + ';">\u2022 ' + data.freshnessLabel + "</span>" +
        "</a>"
      );
    }

    // Full widget
    return (
      '<div style="display:inline-block;background:' + bg + ";border:1px solid " + border + ";" +
      'border-radius:12px;padding:16px;font-family:system-ui,sans-serif;min-width:260px;max-width:320px;">' +
      // Header
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
      '<svg width="20" height="20" viewBox="0 0 16 16" fill="none">' +
      '<circle cx="8" cy="8" r="7" stroke="#22d3ee" stroke-width="1.5"/>' +
      '<path d="M5 8l2 2 4-4" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>" +
      '<span style="font-size:13px;font-weight:700;color:' + text + ';">Verified by Factward</span>' +
      "</div>" +
      // Trust score bar
      '<div style="margin-bottom:8px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
      '<span style="font-size:11px;color:' + muted + ';">Trust Score</span>' +
      '<span style="font-size:13px;font-weight:700;color:' + tc + ';">' + data.trustScore + "%</span>" +
      "</div>" +
      '<div style="height:6px;background:' + (theme === "light" ? "#e2e8f0" : "#1e293b") + ';border-radius:3px;overflow:hidden;">' +
      '<div style="height:100%;width:' + data.trustScore + "%;background:" + tc + ';border-radius:3px;"></div>' +
      "</div>" +
      "</div>" +
      // Freshness bar
      '<div style="margin-bottom:12px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
      '<span style="font-size:11px;color:' + muted + ';">Freshness</span>' +
      '<span style="font-size:11px;font-weight:600;color:' + fc + ';">' + data.freshnessLabel + " (" + data.freshness + "%)</span>" +
      "</div>" +
      '<div style="height:6px;background:' + (theme === "light" ? "#e2e8f0" : "#1e293b") + ';border-radius:3px;overflow:hidden;">' +
      '<div style="height:100%;width:' + data.freshness + "%;background:" + fc + ';border-radius:3px;"></div>' +
      "</div>" +
      "</div>" +
      // Claims summary
      '<div style="display:flex;gap:12px;margin-bottom:12px;font-size:11px;">' +
      '<span style="color:#22c55e;">\u2713 ' + data.supported + " supported</span>" +
      '<span style="color:#eab308;">\u25CB ' + data.mixed + " mixed</span>" +
      '<span style="color:#ef4444;">\u2717 ' + data.unsupported + " unsupported</span>" +
      "</div>" +
      // Stale warning
      (data.staleClaims > 0
        ? '<div style="padding:6px 10px;background:' +
          (theme === "light" ? "#fef3c7" : "#78350f33") +
          ";border-radius:6px;font-size:10px;color:" +
          (theme === "light" ? "#92400e" : "#fbbf24") +
          ';margin-bottom:12px;">' +
          "\u26A0 " + data.staleClaims + " claim(s) may need re-verification</div>"
        : "") +
      // Link
      '<a href="' + reportUrl + '" target="_blank" rel="noopener" ' +
      'style="display:block;text-align:center;padding:8px;background:#22d3ee;color:#0f172a;' +
      'border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">' +
      "View Full Report</a>" +
      "</div>"
    );
  }

  // Initialize all badges on the page
  function init() {
    var badges = document.querySelectorAll("[data-factward-badge]");
    for (var i = 0; i < badges.length; i++) {
      createBadge(badges[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
