// =============================================================
// ✅ initFlow-lite.js — NL Version (Met Agressieve Scroll Fix)
// =============================================================

// Debug toggle (false = productie)
const FLOW_DEBUG = false;
const flowLog  = (...args) => { if (FLOW_DEBUG) console.log(...args); };

// =============================================================
// 🛠️ HELPER: FORCE SCROLL TOP
// Probeert alle mogelijke containers naar boven te scrollen
// =============================================================
function forceScrollTop() {
  // 1. Directe window scroll (zonder smooth om conflicten te voorkomen)
  window.scrollTo(0, 0);

  // 2. Body en HTML (voor mobiele browsers / Safari)
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;

  // 3. Swipe Pages Specifieke Wrappers
  // Soms zit de scrollbar op een wrapper div
  const wrappers = document.querySelectorAll('.swipe-page-wrapper, .section-container, .coreg-wrapper-fixed');
  wrappers.forEach(el => {
    el.scrollTop = 0;
  });

  // 4. Fallback met timeout (voor als de browser traag rendert)
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
  }, 50);
}

// =============================================================
// 🟢 Sovendus hook — start pas zodra sectie actief wordt
// =============================================================
function maybeStartSovendus(section) {
  if (!section) return;
  if (section.id !== "sovendus-section") return;

  if (typeof window.setupSovendus === "function") {
    console.log("🟢 Sovendus-sectie actief → setupSovendus()");
    window.setupSovendus();
  } else {
    console.warn("⚠️ window.setupSovendus bestaat niet (sovendus.js nog niet geladen?)");
  }
}

window.addEventListener("DOMContentLoaded", initFlowLite);

// =============================================================
// 🚫 Toegangscontrole
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");

  // NL Logica: check ook op 'energie'
  if (status !== "online" && status !== "live" && status !== "energie") {
    document.querySelectorAll("section, footer, .sp-section, #dynamic-footer")
      .forEach(el => el.style.display = "none");

    document.body.innerHTML = `
      <style>
        html, body {
          margin: 0; padding: 0; height: 100%; overflow: hidden;
          background: #f8f8f8; display: flex; justify-content: center; align-items: center;
          font-family: Inter, Helvetica, Arial; text-align: center; color: #333;
        }
        h1 { font-size: 24px; font-weight: 600; margin-bottom: 10px; }
        p { font-size: 15px; line-height: 1.6; color: #555; }
      </style>
      <div>
        <h1>Pagina niet bereikbaar</h1>
        <p>Deze pagina is momenteel niet toegankelijk.<br>
        Controleer of je de juiste link hebt of probeer het later opnieuw.</p>
      </div>
    `;
  }
});

// =============================================================
// 🚀 Hoofdinit — flow controller
// =============================================================
function initFlowLite() {

  const params = new URLSearchParams(window.location.search);
  const status = params.get("status") || "online";

  // Alle secties ophalen
  const allSections = Array.from(document.querySelectorAll(".flow-section, .ivr-section"));
  allSections.forEach(el => el.style.display = "none");

  // Coreg container blijft zichtbaar
  const coregContainer = document.getElementById("coreg-container");
  if (coregContainer) coregContainer.style.display = "block";

  // Eerste zichtbare sectie tonen
  const firstVisible = allSections.find(el => !el.classList.contains("ivr-section"));
  if (firstVisible) {
    firstVisible.style.display = "block";
    reloadImages(firstVisible);
    maybeStartSovendus(firstVisible);
  }

  // -----------------------------------------------------------
  // 1. Navigation Buttons Click Handler
  // -----------------------------------------------------------
  const flowButtons = document.querySelectorAll(".flow-next");
  flowButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.closest("#lead-form")) return; // shortform apart

      const current = btn.closest(".flow-section, .ivr-section");
      if (!current) return;
      
      let next = current.nextElementSibling;
      if (!next) return;
      
      current.style.display = "none";

      // skip ivr if online
      while (
        next &&
        next.classList.contains("ivr-section") &&
        (status === "online" || status === "energie")
      ) {
        next = next.nextElementSibling;
      }

      // longform skip
      if (next && next.id === "long-form-section") {
        const needsLF = sessionStorage.getItem("requiresLongForm") === "true";
        if (!needsLF) next = next.nextElementSibling;
      }

      if (next) {
        next.style.display = "block";
        reloadImages(next);
        maybeStartSovendus(next);
        
        // ✅ AGGRESSIVE SCROLL
        forceScrollTop();
      }
    });
  });

  // -----------------------------------------------------------
  // 2. Event: Na shortform submit (CHAT & FORM SUPPORT)
  // -----------------------------------------------------------
  document.addEventListener("shortFormSubmitted", () => {
    
    // Zoek naar het formulier OF de chat interface
    const form = document.getElementById("lead-form");
    const chat = document.getElementById("chat-interface");
    
    // Bepaal de huidige sectie (container)
    let current = null;
    if (form && form.offsetParent !== null) {
        current = form.closest(".flow-section");
    } else if (chat) {
        current = chat.closest(".flow-section");
    }

    if (!current) {
        console.warn("⚠️ Kon huidige sectie niet vinden na submit.");
        return;
    }
    
    let next = current.nextElementSibling;
    if (!next) {
        console.warn("⚠️ Geen volgende sectie gevonden.");
        return;
    }

    // ivr skip
    while (
      next &&
      next.classList.contains("ivr-section") &&
      (status === "online" || status === "energie")
    ) {
      next = next.nextElementSibling;
    }

    // longform skip
    if (next && next.id === "long-form-section") {
      const showLong = sessionStorage.getItem("requiresLongForm") === "true";
      if (!showLong) next = next.nextElementSibling;
    }

    current.style.display = "none";
    next.style.display = "block";
    reloadImages(next);
    maybeStartSovendus(next);
    
    // ✅ AGGRESSIVE SCROLL
    forceScrollTop();
  });

  // -----------------------------------------------------------
  // 3. Event: Na longform submit
  // -----------------------------------------------------------
  document.addEventListener("longFormSubmitted", () => {
    const current = document.getElementById("long-form-section");
    if (!current) return;
    
    let next = current.nextElementSibling;
    if (!next) return;

    while (
      next &&
      next.classList.contains("ivr-section") &&
      (status === "online" || status === "energie")
    ) {
      next = next.nextElementSibling;
    }

    current.style.display = "none";
    next.style.display = "block";
    reloadImages(next);
    maybeStartSovendus(next);

    // ✅ AGGRESSIVE SCROLL
    forceScrollTop();
  });
}

// =============================================================
// Helpers
// =============================================================
function reloadImages(section) {
  if (!section) return;
  const imgs = section.querySelectorAll("img[data-src]");
  imgs.forEach(img => img.src = img.dataset.src);

  window.scrollBy(0, 1);
  setTimeout(() => window.scrollBy(0, -1), 150);
}

console.info("🎉 initFlow-lite (NL) loaded");
