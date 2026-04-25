(function () {
  "use strict";

  // --- Config ---
  // Auto-detect base URL from the script tag itself so it works in dev + prod
  var SVARAI_BASE = (function () {
    var scripts = document.querySelectorAll('script[src*="widget.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      try {
        var url = new URL(src, window.location.href);
        return url.origin;
      } catch (e) {}
    }
    return "https://svarai.no";
  })();

  // --- State ---
  var isOpen = false;
  var iframe = null;
  var container = null;
  var button = null;
  var badge = null;

  // --- Extract clinic ID from script tag ---
  function getClinicId() {
    var scripts = document.querySelectorAll('script[src*="widget.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      var match = src.match(/[?&]id=([^&]+)/);
      if (match) return match[1];
    }
    return "demo";
  }

  var clinicId = getClinicId();

  // --- CSS injection ---
  function injectStyles() {
    var style = document.createElement("style");
    style.textContent = [
      "#svarai-widget-container {",
      "  position: fixed;",
      "  bottom: 24px;",
      "  right: 24px;",
      "  z-index: 2147483647;",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: flex-end;",
      "  gap: 12px;",
      "  font-family: system-ui, -apple-system, sans-serif;",
      "}",

      "#svarai-chat-frame {",
      "  width: 380px;",
      "  height: 560px;",
      "  border: none;",
      "  border-radius: 20px;",
      "  box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1);",
      "  background: #fff;",
      "  transform-origin: bottom right;",
      "  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;",
      "  transform: scale(0.7) translateY(20px);",
      "  opacity: 0;",
      "  pointer-events: none;",
      "}",

      "#svarai-chat-frame.open {",
      "  transform: scale(1) translateY(0);",
      "  opacity: 1;",
      "  pointer-events: all;",
      "}",

      "#svarai-btn {",
      "  width: 56px;",
      "  height: 56px;",
      "  border-radius: 50%;",
      "  background: linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%);",
      "  border: none;",
      "  cursor: pointer;",
      "  box-shadow: 0 4px 20px rgba(108,99,255,0.45);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
      "  position: relative;",
      "  flex-shrink: 0;",
      "}",

      "#svarai-btn:hover {",
      "  transform: scale(1.08);",
      "  box-shadow: 0 6px 28px rgba(108,99,255,0.55);",
      "}",

      "#svarai-btn-icon {",
      "  transition: transform 0.25s ease, opacity 0.2s ease;",
      "  position: absolute;",
      "}",

      "#svarai-btn-icon.hidden {",
      "  opacity: 0;",
      "  transform: rotate(90deg) scale(0.7);",
      "  pointer-events: none;",
      "}",

      "#svarai-badge {",
      "  position: absolute;",
      "  top: -3px;",
      "  right: -3px;",
      "  width: 14px;",
      "  height: 14px;",
      "  border-radius: 50%;",
      "  background: #22c55e;",
      "  border: 2.5px solid white;",
      "  transition: opacity 0.2s;",
      "}",

      "@media (max-width: 480px) {",
      "  #svarai-widget-container {",
      "    bottom: 16px;",
      "    right: 16px;",
      "  }",
      "  #svarai-chat-frame {",
      "    width: calc(100vw - 32px);",
      "    height: calc(100vh - 100px);",
      "    max-width: 420px;",
      "  }",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  // --- Chat icon SVG ---
  var CHAT_ICON = [
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
    '  <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white"/>',
    '  <circle cx="8" cy="11" r="1.2" fill="#6c63ff"/>',
    '  <circle cx="12" cy="11" r="1.2" fill="#6c63ff"/>',
    '  <circle cx="16" cy="11" r="1.2" fill="#6c63ff"/>',
    '</svg>',
  ].join("");

  var CLOSE_ICON = [
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
    '  <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>',
    '</svg>',
  ].join("");

  // --- Build DOM ---
  function buildWidget() {
    container = document.createElement("div");
    container.id = "svarai-widget-container";

    iframe = document.createElement("iframe");
    iframe.id = "svarai-chat-frame";
    iframe.src = SVARAI_BASE + "/widget?id=" + encodeURIComponent(clinicId);
    iframe.title = "SvarAI Chat";
    iframe.setAttribute("allow", "microphone");

    button = document.createElement("button");
    button.id = "svarai-btn";
    button.setAttribute("aria-label", "Åpne chat");

    // Chat icon (shown when closed)
    var chatIconEl = document.createElement("span");
    chatIconEl.id = "svarai-btn-icon";
    chatIconEl.setAttribute("data-icon", "chat");
    chatIconEl.innerHTML = CHAT_ICON;

    // Close icon (shown when open)
    var closeIconEl = document.createElement("span");
    closeIconEl.id = "svarai-btn-icon";
    closeIconEl.setAttribute("data-icon", "close");
    closeIconEl.innerHTML = CLOSE_ICON;
    closeIconEl.classList.add("hidden");

    badge = document.createElement("span");
    badge.id = "svarai-badge";

    button.appendChild(chatIconEl);
    button.appendChild(closeIconEl);
    button.appendChild(badge);

    button.addEventListener("click", toggleChat);

    container.appendChild(iframe);
    container.appendChild(button);
    document.body.appendChild(container);
  }

  function toggleChat() {
    isOpen = !isOpen;

    var chatIcon = button.querySelector('[data-icon="chat"]');
    var closeIcon = button.querySelector('[data-icon="close"]');

    if (isOpen) {
      iframe.classList.add("open");
      chatIcon.classList.add("hidden");
      closeIcon.classList.remove("hidden");
      badge.style.opacity = "0";
      button.setAttribute("aria-label", "Lukk chat");
    } else {
      iframe.classList.remove("open");
      chatIcon.classList.remove("hidden");
      closeIcon.classList.add("hidden");
      badge.style.opacity = "1";
      button.setAttribute("aria-label", "Åpne chat");
    }
  }

  // --- Init ---
  function init() {
    injectStyles();
    buildWidget();

    // Auto-open on mobile after short delay to hint at the widget
    // (disabled by default — uncomment to enable)
    // if (window.innerWidth < 768) {
    //   setTimeout(toggleChat, 3000);
    // }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
