// =============================================================
// 💬 CHAT FORM LOGIC (Julia - NL + COSPONSOR AUTO-SUBMIT + FIX)
// =============================================================

(function() {
  // --- CSS INJECTIE ---
  const style = document.createElement('style');
  style.innerHTML = `
    /* VEILIGE CHAT AFMETINGEN (Desktop / Tablet) */
    @media (min-width: 768px) {
      #chat-interface {
        width: 100% !important; max-width: 480px !important; height: 600px !important; max-height: 80vh !important;
        margin: 20px auto !important; display: flex !important; flex-direction: column !important;
        box-sizing: border-box !important; border-radius: 12px !important; overflow: hidden !important; position: relative !important;
      }
    }

    /* MOBIEL: Voorkomt layout shifts bij toetsenbord */
    @media (max-width: 767px) {
      html, body { overscroll-behavior-y: none; } 
      #chat-interface {
        position: fixed !important; top: 10px !important; bottom: 10px !important; left: 10px !important; right: 10px !important;
        width: calc(100% - 20px) !important; height: auto !important; max-height: none !important; margin: 0 !important;
        display: flex !important; flex-direction: column !important; box-sizing: border-box !important;
        border-radius: 12px !important; overflow: hidden !important; z-index: 999999 !important;
        background: #f4f6f8 !important; box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      }
    }

    #chat-interface .chat-header { flex: 0 0 auto !important; }
    #chat-interface .chat-controls { flex: 0 0 auto !important; padding: 16px !important; background:#fff !important; }
    #chat-history { flex: 1 1 auto !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; background: #f4f6f8 !important; }

    /* Fix auto-zoom op iOS */
    input[type="text"], input[type="tel"], input[type="email"], select { font-size: 16px !important; }

    /* COREG AUTO-SUBMIT DROPDOWN */
    #chat-controls .coreg-auto-dropdown {
      width: 100% !important; padding: 12px 14px !important; font-size: 15px !important; font-weight: 600 !important;
      border-radius: 8px !important; background: #f0f9f4 !important; color: #14B670 !important; border: 1.5px solid #14B670 !important;
      box-shadow: none !important; cursor: pointer !important; appearance: none !important; 
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2314B670%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") !important;
      background-repeat: no-repeat !important; background-position: right 14px top 50% !important; background-size: 12px auto !important;
    }
    #chat-controls .coreg-auto-dropdown:focus { outline: none !important; box-shadow: 0 0 0 2px rgba(20,182,112,0.2) !important; }
    #chat-controls .coreg-auto-dropdown option { font-weight: 500 !important; color: #333 !important; background: #fff !important; }

    /* Nee Bedankt linkje */
    #chat-controls .coreg-btn-decline {
      display: block !important; width: 100% !important; background: transparent !important; border: none !important; 
      padding: 8px !important; color: #999 !important; text-decoration: underline !important; font-size: 13px !important; 
      cursor: pointer !important; margin-top: 4px !important; text-align: center !important; box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);

  // 1. VARIABELEN VOORAF DECLAREREN
  let historyEl, controlsEl, typingEl, chatInterface;
  let currentStepIndex = 0;
  
  const urlParams = new URLSearchParams(window.location.search);
  const isLive = urlParams.get("status") === "live"; 
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const IVR_NUMBER_DISPLAY = "0906-1512"; 
  const IVR_NUMBER_DIAL = "09061512"; 
  let fetchedIvrPin = "000"; 
  let coregFlow = []; 
  let cosponsorsList = []; // ✅ Opslag voor cosponsors

  // =============================================================
  // 2. ACHTERGROND API FETCHES (IVR, Coreg & Cosponsors)
  // =============================================================
  async function initializeData() {
    let baseUrl = "https://globalcoregflow-nl.vercel.app";
    if (window.API_COREG && window.API_COREG.includes("vercel.app")) {
        baseUrl = new URL(window.API_COREG).origin;
    }

    if (isLive) {
        const affId = urlParams.get("aff_id") || "123";
        const offerId = urlParams.get("offer_id") || "234";
        const subId = urlParams.get("sub_id") || "345";
        
        let t_id = urlParams.get("t_id") || localStorage.getItem("t_id");
        if (!t_id) {
            t_id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
            });
            localStorage.setItem("t_id", t_id);
        }
        localStorage.setItem("aff_id", affId); localStorage.setItem("offer_id", offerId); localStorage.setItem("sub_id", subId);

        try {
            let internalVisitId = localStorage.getItem("internalVisitId");
            if (!internalVisitId) {
                const resVisit = await fetch("https://cdn.909support.com/NL/4.1/assets/php/register_visit.php", {
                    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ clickId: t_id, affId, offerId, subId, subId2: subId })
                });
                const dataVisit = await resVisit.json();
                if (dataVisit.internalVisitId) localStorage.setItem("internalVisitId", (internalVisitId = dataVisit.internalVisitId));
            }

            if (internalVisitId) {
                const resPin = await fetch("https://cdn.909support.com/NL/4.1/stage/assets/php/request_pin.php", {
                    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ clickId: t_id, internalVisitId })
                });
                const dataPin = await resPin.json();
                if (dataPin.pincode) fetchedIvrPin = dataPin.pincode.toString().padStart(3, "0");
            }
        } catch (err) { console.error("IVR Error:", err); }
    }

    // Ophalen Coreg Campagnes
    try {
        const apiUrl = window.API_COREG || `${baseUrl}/api/coreg.js`;
        const res = await fetch(apiUrl);
        const json = await res.json();
        const campaigns = (json.data || []).filter(c => !c.uitsluiten_standaardpad); 
        
        coregFlow = campaigns.map((c, index) => {
            const botTexts = [];
            if (index === 0) botTexts.push("Om je deelname definitief af te ronden, hebben we nog een paar speciale aanbiedingen voor je geselecteerd! 🎁");
            
            const title = c.title_new || c.title || "";
            const imgUrl = c.image?.id ? `https://cms.core.909play.com/assets/${c.image.id}` : (c.image?.url || "https://via.placeholder.com/600x200?text=Aanbieding");
            
            botTexts.push(`
              <div style="margin: -12px -16px 12px -16px;">
                <img src="${imgUrl}" style="width: 100%; border-radius: 16px 16px 0 0; display: block; object-fit: cover; max-height: 150px;">
              </div>
              <strong style="font-size:15px; color:#111; display:block; margin-bottom:4px;">${title}</strong>
              <span style="font-size:12px; color:#555; display:block; line-height:1.4;">${c.description || ""}</span>
            `);
            
            return { id: `coreg_${c.id}`, campaign: c, botTexts: botTexts, inputType: "coreg_interaction" };
        });
    } catch (err) { console.error("Coreg fetch error:", err); }

    // ✅ Ophalen Cosponsors in de achtergrond
    try {
        const cospoUrl = `${baseUrl}/api/cosponsors.js`;
        const resCospo = await fetch(cospoUrl);
        const jsonCospo = await resCospo.json();
        if(jsonCospo.data) cosponsorsList = jsonCospo.data;
        console.log(`✅ ${cosponsorsList.length} Cosponsors geladen in de achtergrond.`);
    } catch(err) { console.error("Cosponsor fetch error:", err); }
  }

  // =============================================================
  // 3. FLOW CONFIGURATIES
  // =============================================================
  const chatFlow = [
    {
      id: "gender", botTexts: ["Hoi! Leuk dat je er bent 👋", "Laten we kijken of je in aanmerking komt. Ben je een man of een vrouw?"],
      inputType: "buttons", options: [{ label: "Man 🙋‍♂️", value: "Man" }, { label: "Vrouw 🙋‍♀️", value: "Vrouw" }]
    },
    {
      id: "name", botTexts: ["Duidelijk.", "Hoe heet je?"],
      inputType: "text-multi", fields: [{ id: "firstname", placeholder: "Voornaam" }, { id: "lastname", placeholder: "Achternaam" }]
    },
    {
      id: "dob", botTexts: [(data) => `Aangenaam, ${data.firstname}!`, "Even checken of je 18+ bent. Wanneer ben je geboren? 🎂"],
      inputType: "dob", fieldId: "dob", placeholder: "DD / MM / JJJJ"
    },
    {
      id: "email", botTexts: ["Top.", "Waar mogen we de bevestiging heen sturen? 📧"],
      inputType: "email", fieldId: "email", placeholder: "jouw@email.nl"
    },
    {
      id: "terms", botTexts: ["Bijna klaar! 🚀", "Om verder te gaan, dien je akkoord te gaan met de voorwaarden."],
      inputType: "terms_agree", buttonText: "Ik ga akkoord",
      subText: "Bekijk hier de <button type='button' id='open-actievoorwaarden-inline' style='background:none; border:none; padding:0; color:#888; text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;'>actievoorwaarden</button>."
    },
    {
      id: "partners", botTexts: ["Nog één dingetje...", "Om deze actie mogelijk te maken, werken we samen met partners.", "Vind je het goed dat onze <button class='open-sponsor-popup' style='background:none; border:none; padding:0; color:#14B670; text-decoration:underline; cursor:pointer; font-size:inherit; font-weight:700; font-family:inherit;'>partners</button> je benaderen met aanbiedingen?"],
      inputType: "partners_choice", btnAccept: "Ja, prima", btnDecline: "Nee, liever niet"
    },
    {
      id: "ivr", condition: () => isLive, 
      botTexts: ["Bedankt! We moeten alleen nog even je deelname verifiëren om misbruik te voorkomen 🛡️", isMobile ? "Klik op de knop hieronder om direct te bellen." : "Bel het onderstaande nummer en toets de code in om te bevestigen."],
      inputType: "ivr_verify"
    }
  ];

  const longChatFlow = [
    {
      id: "address_zip", botTexts: ["Zo, de aanbiedingen zijn afgerond! 🎉", "Om je prijs eventueel op te sturen, hebben we je adres nodig.", "Wat is je postcode en huisnummer?"],
      inputType: "address_zip_lookup", fields: [{ id: "zipcode", placeholder: "1234AB" }, { id: "housenumber", placeholder: "Nr" }]
    },
    {
      id: "address_street", botTexts: ["Check.", "En je straatnaam en woonplaats?"],
      inputType: "text-multi", fields: [{ id: "street", placeholder: "Straatnaam" }, { id: "city", placeholder: "Woonplaats" }]
    },
    {
      id: "phone", botTexts: ["Als laatste: Op welk nummer kunnen we je bereiken als je gewonnen hebt? 📞"],
      inputType: "tel", fieldId: "phonenumber", placeholder: "06 12345678"
    },
    {
      id: "sovendus", botTexts: ["Geweldig, alles staat erin! 🥂", "Als bedankje voor je deelname hebben we nog een cadeautje voor je klaargezet."],
      inputType: "sovendus_end"
    }
  ];

  let currentFlow = chatFlow; 

  // =============================================================
  // 4. INIT
  // =============================================================
  document.addEventListener("DOMContentLoaded", () => {
      initializeData(); 
      historyEl = document.getElementById("chat-history");
      controlsEl = document.getElementById("chat-controls");
      typingEl = document.getElementById("typing-indicator");
      chatInterface = document.getElementById("chat-interface");

      if(!historyEl || !controlsEl) return;
      setTimeout(() => {
          if(chatInterface) chatInterface.classList.add("visible");
          runStep(0);
      }, 100);
  });

  // =============================================================
  // 5. CORE LOGICA & RENDERING
  // =============================================================
  async function runStep(index) {
    if (index >= currentFlow.length) {
       handleFlowComplete();
       return;
    }

    const step = currentFlow[index];
    if (step.condition && !step.condition()) {
        runStep(index + 1);
        return;
    }

    // Flush pending longform leads
    if (step.id === "sovendus") {
        const pending = JSON.parse(sessionStorage.getItem("pendingLongFormLeads") || "[]");
        if (pending.length > 0 && window.buildPayload && window.fetchLead) {
            for (const lead of pending) {
                try {
                    const coregAnswer = sessionStorage.getItem(`f_2014_coreg_answer_${lead.cid}`);
                    const payload = await window.buildPayload({ 
                        cid: lead.cid, 
                        sid: lead.sid, 
                        is_shortform: false, 
                        f_2014_coreg_answer: coregAnswer
                    });
                    await window.fetchLead(payload);
                } catch(e) {}
            }
            sessionStorage.removeItem("pendingLongFormLeads");
        }
    }

    currentStepIndex = index;
    controlsEl.innerHTML = ""; 
    controlsEl.style.opacity = "0";

    for (const textTemplate of step.botTexts) {
      typingEl.style.display = "flex"; 
      scrollToBottom();
      await new Promise(r => setTimeout(r, 800)); 
      typingEl.style.display = "none";
      let text = typeof textTemplate === "function" ? textTemplate(getAllData()) : textTemplate;
      addMessage("bot", text);
    }

    renderControls(step);
    controlsEl.style.transition = "opacity 0.3s";
    controlsEl.style.opacity = "1";
    scrollToBottom();
  }

  function renderControls(step) {
    let html = "";
    
    if (step.inputType === "buttons") {
      html = `<div class="chat-btn-group">`;
      step.options.forEach(opt => html += `<button type="button" class="chat-option-btn" onclick="window.handleChatInput('${step.id}', '${opt.value}')">${opt.label}</button>`);
      html += `</div>`;
    } 
    else if (step.inputType === "text-multi" || step.inputType === "address_zip_lookup") {
      step.fields.forEach(f => html += `<input type="text" id="chat-input-${f.id}" class="chat-input-text" placeholder="${f.placeholder}" style="margin-bottom:10px;">`);
      html += `<button type="button" class="cta-primary" onclick="window.submitChatText(event)" style="margin-top:5px;">Volgende</button>`;
    }
    else if (step.inputType === "dob") {
       html = `<div style="display:flex; gap:10px; width:100%;"><input type="tel" inputmode="numeric" id="chat-input-dob" class="chat-input-text" placeholder="DD / MM / JJJJ" autocomplete="bday" maxlength="14"> <button type="button" class="chat-submit-btn" onclick="window.submitChatText(event)">➤</button></div>`;
    }
    else if (step.inputType === "email" || step.inputType === "tel") {
        html = `<div style="display:flex; gap:10px; width:100%;"><input type="${step.inputType}" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="${step.inputType}"><button type="button" class="chat-submit-btn" onclick="window.submitChatText(event)">➤</button></div>`;
    }
    else if (step.inputType === "terms_agree") {
      html = `<button type="button" class="cta-primary" onclick="window.handleTermsAgree()">${step.buttonText}</button><div style="font-size:12px; color:#999; text-align:center; margin-top:10px; line-height:1.4;">${step.subText}</div>`;
    }
    else if (step.inputType === "partners_choice") {
      html = `<button type="button" class="cta-primary" onclick="window.handlePartnerChoice(true)">${step.btnAccept}</button><button type="button" onclick="window.handlePartnerChoice(false)" style="display:block; width:100%; background:none; border:none; margin-top:12px; padding:5px; color:#999; text-decoration:underline; font-size:13px; cursor:pointer;">${step.btnDecline}</button>`;
    }
    else if (step.inputType === "ivr_verify") {
       const pinStr = fetchedIvrPin; 
       let digitsHtml = "";
       for(let char of pinStr) {
           digitsHtml += `<div class="digit" style="display:inline-block; width:44px; height:56px; overflow:hidden; background:#f0f9f4; border:1px solid #c8e6c9; margin:0 4px; border-radius:8px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);"><div class="digit-inner" style="display:flex; flex-direction:column; text-align:center; font-size:28px; font-weight:800; color:#14B670; line-height:56px; transition: transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);"></div></div>`;
       }
       if (isMobile) {
           html = `<div id="ivr-mobile" style="text-align:center; width:100%;"><div style="font-size:16px; font-weight:700; color:#003C43; margin-bottom:12px;">Jouw verificatiecode:</div><div id="pin-code-spinner-mobile" class="pin-spinner" style="display:flex; justify-content:center; margin-bottom:16px;">${digitsHtml}</div><a href="tel:${IVR_NUMBER_DIAL},${pinStr}#" class="cta-primary ivr-call-btn" onclick="window.handleIVRCall()" style="display:flex; align-items:center; justify-content:center; text-decoration:none; margin-bottom:8px; font-size:18px;">📞 Bel Nu</a><div style="font-size:12px; color:#777; margin-top:8px;">(De code wordt automatisch ingetoetst)</div></div>`;
           setTimeout(() => animatePinRevealSpinner(pinStr, "pin-code-spinner-mobile"), 100);
       } else {
           html = `<div id="ivr-desktop" style="text-align:center; width:100%;"><div style="font-size:15px; color:#444; margin-bottom:16px; font-weight:500;">Bel naar: <span style="font-size:26px; font-weight:800; color:#14B670; display:block; margin-top:6px; letter-spacing:1px;">${IVR_NUMBER_DISPLAY}</span></div><div style="font-size:16px; font-weight:700; color:#003C43; margin-bottom:12px;">En toets deze code in:</div><div id="pin-container-desktop" style="margin-bottom:24px;"><div id="pin-code-spinner-desktop" class="pin-spinner" style="display:flex; justify-content:center;">${digitsHtml}</div></div><button type="button" class="cta-primary" onclick="window.handleIVRCall()" style="font-size:16px;">Ik heb gebeld & bevestigd</button></div>`;
           setTimeout(() => animatePinRevealSpinner(pinStr, "pin-code-spinner-desktop"), 100);
       }
    }
    else if (step.inputType === "coreg_interaction") {
        const camp = step.campaign;
        const answers = camp.coreg_answers || [];
        
        html = `<div class="chat-btn-group" style="flex-direction:column; gap:0;">`;
        html += `<select id="coreg-select-${camp.id}" class="coreg-auto-dropdown" onchange="window.handleCoregAutoChange(this, '${camp.cid}', '${camp.sid}')">
                    <option value="" disabled selected>Kies een optie...</option>`;
        
        answers.forEach(opt => {
            const val = opt.answer_value || "yes";
            const cid = opt.has_own_campaign ? opt.cid : camp.cid;
            const sid = opt.has_own_campaign ? opt.sid : camp.sid;
            html += `<option value="${val}" data-cid="${cid}" data-sid="${sid}">${opt.label}</option>`;
        });

        html += `<option value="no" data-cid="${camp.cid}" data-sid="${camp.sid}">Nee, bedankt</option>`;
        html += `</select></div>`;
    }
    else if (step.inputType === "sovendus_end") {
        html = `
          <div style="text-align:center; color:#14B670; font-weight:800; font-size:18px; margin-bottom:10px;">Je deelname is definitief! 🎉</div>
          <div id="sovendus-loading" style="text-align:center; padding:12px; font-size:14px; color:#555;">Even geduld… jouw voordeel wordt geladen!</div>
          <div id="sovendus-container-1" style="width:100%; min-height:60px; overflow:hidden; border-radius:8px;"></div>
        `;
        setTimeout(() => loadSovendusInChat(), 100);
    }

    controlsEl.innerHTML = html;
    
    const firstInput = controlsEl.querySelector("input");
    if(firstInput && !isMobile) setTimeout(() => firstInput.focus(), 100); 

    const inputs = controlsEl.querySelectorAll("input, select");
    inputs.forEach(input => {
        input.addEventListener("blur", () => { if(isMobile) window.scrollTo(0, 0); });
        input.addEventListener("keydown", (e) => { 
            if(e.key === "Enter") {
                e.preventDefault();
                input.blur(); 
                window.submitChatText(e); 
            }
        });
    });
    if (step.id === "dob") initDobMask();
  }

  // =============================================================
  // 6. SOVENDUS CHAT MODULE
  // =============================================================
  let sovendusLogged = false;

  function loadSovendusInChat() {
      const containerId = "sovendus-container-1";
      const container = document.getElementById(containerId);
      if (!container) return;

      const t_id = sessionStorage.getItem("t_id") || "unknown";
      const gender = sessionStorage.getItem("gender") || "";
      const firstname = sessionStorage.getItem("firstname") || "";
      const lastname = sessionStorage.getItem("lastname") || "";
      const email = sessionStorage.getItem("email") || "";
      const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

      window.sovConsumer = { consumerSalutation: gender, consumerFirstName: firstname, consumerLastName: lastname, consumerEmail: email };
      window.sovIframes = window.sovIframes || [];
      window.sovIframes.push({ trafficSourceNumber: "5592", trafficMediumNumber: "1", sessionId: t_id, timestamp, orderId: "", orderValue: "", orderCurrency: "", usedCouponCode: "", iframeContainerId: containerId });

      const script = document.createElement("script");
      script.src = "https://api.sovendus.com/sovabo/common/js/flexibleIframe.js";
      script.async = true;

      script.onload = () => {
          const observer = new MutationObserver((_, obs) => {
              const iframe = container.querySelector("iframe");
              if (iframe) {
                  document.getElementById("sovendus-loading")?.remove();
                  logSovendusImpression();
                  obs.disconnect();
              }
          });
          observer.observe(container, { childList: true, subtree: true });
      };
      document.body.appendChild(script);
  }

  function logSovendusImpression() {
      if (sovendusLogged) return;
      const t_id = sessionStorage.getItem("t_id");
      const offer_id = sessionStorage.getItem("offer_id");
      const sub_id = sessionStorage.getItem("sub_id") || sessionStorage.getItem("aff_id") || "unknown";
      if (!t_id) return;
      sovendusLogged = true;

      let baseUrl = "https://globalcoregflow-nl.vercel.app";
      if (window.API_COREG && window.API_COREG.includes("vercel.app")) baseUrl = new URL(window.API_COREG).origin;
      const url = `${baseUrl}/api/sovendus-impression.js`;
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t_id, offer_id, sub_id }) }).catch(e => console.error(e));
  }

  // =============================================================
  // 7. ANIMATIES & INPUT HANDLERS
  // =============================================================
  function animatePinRevealSpinner(pin, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;
    const digits = container.querySelectorAll(".digit-inner");
    pin.split("").forEach((digit, index) => {
      const inner = digits[index];
      if (!inner) return;
      inner.innerHTML = "";
      for (let i = 0; i <= 9; i++) {
        const span = document.createElement("span");
        span.textContent = i; span.style.display = "block"; span.style.height = "56px"; 
        inner.appendChild(span);
      }
      setTimeout(() => { inner.style.transform = `translateY(-${parseInt(digit, 10) * 56}px)`; }, 100);
    });
  }

  window.handleChatInput = function(id, value) {
    addMessage("user", value);
    sessionStorage.setItem(id, value);
    runStep(currentStepIndex + 1);
  };

  window.submitChatText = async function(e) {
    if (e) e.preventDefault(); 
    const step = currentFlow[currentStepIndex];
    let userDisplay = "";
    
    if (step.inputType === "address_zip_lookup") {
        const zipEl = document.getElementById("chat-input-zipcode");
        const numEl = document.getElementById("chat-input-housenumber");
        const zip = zipEl.value.trim();
        const num = numEl.value.trim();
        if(!zip || !num) { alert("Vul postcode en huisnummer in."); return; }
        
        zipEl.blur(); numEl.blur();

        sessionStorage.setItem("postcode", zip);
        sessionStorage.setItem("huisnummer", num);
        addMessage("user", `${zip} ${num}`);
        
        typingEl.style.display = "flex"; scrollToBottom();
        
        try {
            let baseUrl = "https://globalcoregflow-nl.vercel.app";
            if (window.API_COREG && window.API_COREG.includes("vercel.app")) {
                baseUrl = new URL(window.API_COREG).origin;
            }
            
            const res = await fetch(baseUrl + "/api/validateAddressNL.js", {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postcode: zip, huisnummer: num })
            });
            
            const data = await res.json();
            typingEl.style.display = "none";
            
            if (data.valid && data.street && data.city) {
                sessionStorage.setItem("straat", data.street);
                sessionStorage.setItem("woonplaats", data.city);
                addMessage("bot", `Gevonden! Je adres is:<br><strong>${data.street}, ${data.city}</strong>`);
                runStep(currentStepIndex + 2); 
                return;
            } else {
                addMessage("bot", "Ik kon je straat niet automatisch vinden. Vul het hieronder even handmatig in.");
            }
        } catch(err) { 
            typingEl.style.display = "none";
        }
        
        runStep(currentStepIndex + 1); 
        return;
    }
    else if (step.inputType === "text-multi") {
       let values = []; let valid = true;
       step.fields.forEach(f => {
           const el = document.getElementById(`chat-input-${f.id}`);
           if(!el || !el.value.trim()) valid = false;
           else { 
               const keyMap = { "street": "straat", "city": "woonplaats" };
               const targetKey = keyMap[f.id] || f.id;
               sessionStorage.setItem(targetKey, el.value.trim()); 
               values.push(el.value.trim()); 
           }
       });
       if(!valid) { alert("Vul alle velden in."); return; }
       userDisplay = values.join(" ");
    }
    else if (step.inputType === "tel") {
        const val = document.getElementById(`chat-input-${step.fieldId}`).value.trim();
        if(val.length < 8) { alert("Vul een geldig nummer in."); return; }
        sessionStorage.setItem("telefoon", val); 
        userDisplay = val;
    }
    else if (step.id === "email") {
        const val = document.getElementById(`chat-input-email`).value.trim();
        if(!val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { alert("Vul een geldig e-mailadres in."); return; }
        sessionStorage.setItem("email", val); userDisplay = val;
    }
    else if (step.id === "dob") {
        const val = document.getElementById(`chat-input-dob`).value;
        const cleanVal = val.replace(/\s+/g, ''); 
        if(cleanVal.length !== 10) { alert("Vul je volledige geboortedatum in (DD/MM/JJJJ)."); return; }
        
        const parts = cleanVal.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10); const year = parseInt(parts[2], 10);
            const dobDate = new Date(year, month - 1, day); const today = new Date();
            if (dobDate.getFullYear() !== year || dobDate.getMonth() !== month - 1 || dobDate.getDate() !== day) {
                alert("Deze datum bestaat niet. Check je invoer."); return;
            }
            let age = today.getFullYear() - year;
            const m = today.getMonth() - (month - 1);
            if (m < 0 || (m === 0 && today.getDate() < day)) { age--; }
            if (age < 18) { alert("Je moet minimaal 18 jaar oud zijn om deel te nemen."); return; }
            if (age > 110) { alert("Vul een geldige geboortedatum in."); return; }
        } else {
            alert("Vul een geldige datum in (DD/MM/JJJJ)."); return;
        }

        sessionStorage.setItem("dob", cleanVal); userDisplay = val;
    }

    addMessage("user", userDisplay);
    runStep(currentStepIndex + 1);
  };

  window.handleTermsAgree = function() { addMessage("user", "Ik ga akkoord"); runStep(currentStepIndex + 1); };
  
  window.handlePartnerChoice = function(accepted) {
    sessionStorage.setItem("sponsorsAccepted", accepted ? "true" : "false");
    addMessage("user", accepted ? "Ja, prima" : "Nee, liever niet");
    runStep(currentStepIndex + 1);
  };

  window.handleIVRCall = function() {
      if (!isMobile) addMessage("user", "Ik heb gebeld en bevestigd.");
      runStep(currentStepIndex + 1); 
  };

  window.handleCoregAutoChange = function(selectEl, fallbackCid, fallbackSid) {
      if(!selectEl.value) return;
      selectEl.blur(); 
      
      const opt = selectEl.options[selectEl.selectedIndex];
      const cid = opt.getAttribute("data-cid") || fallbackCid;
      const sid = opt.getAttribute("data-sid") || fallbackSid;
      
      window.submitCoregAnswer(selectEl.value, cid, sid, opt.text);
  };

  window.submitCoregAnswer = async function(answerValue, cid, sid, userText) {
      addMessage("user", userText); 
      const camp = currentFlow[currentStepIndex].campaign;

      const key = `coreg_answers_${cid}`;
      const prev = JSON.parse(sessionStorage.getItem(key) || "[]");
      if (answerValue && answerValue !== "no" && !prev.includes(answerValue)) {
          prev.push(answerValue);
      }
      sessionStorage.setItem(key, JSON.stringify(prev));
      
      if(prev.length > 0) {
          sessionStorage.setItem(`f_2014_coreg_answer_${cid}`, prev.join(" - "));
      }

      if (answerValue !== "no") {
          const isLongForm = camp.requiresLongForm || camp.requires_long_form === true || camp.requires_long_form === "true";
          
          if (isLongForm) {
              let pending = JSON.parse(sessionStorage.getItem("pendingLongFormLeads") || "[]");
              if (!pending.some(p => p.cid === cid)) pending.push({ cid, sid });
              sessionStorage.setItem("pendingLongFormLeads", JSON.stringify(pending));
          } else {
              if (window.buildPayload && window.fetchLead) {
                  try {
                      const coregAns = sessionStorage.getItem(`f_2014_coreg_answer_${cid}`);
                      const payload = await window.buildPayload({ cid, sid, is_shortform: false, f_2014_coreg_answer: coregAns });
                      window.fetchLead(payload);
                  } catch(e) {}
              }
          }
      }

      let nextIdx = currentStepIndex + 1;
      if (answerValue === "no" && currentFlow === coregFlow) {
          while (nextIdx < coregFlow.length && coregFlow[nextIdx].campaign.cid === camp.cid) {
              nextIdx++;
          }
      }
      runStep(nextIdx);
  };

  // =============================================================
  // 8. TRANSITIE LOGICA TUSSEN DE FLOWS (+ COSPONSORS)
  // =============================================================
  async function handleFlowComplete() {
      if (currentFlow === chatFlow) {
          controlsEl.innerHTML = ``; 
          typingEl.style.display = "flex"; scrollToBottom();
          
          if (window.buildPayload && window.fetchLead) {
              try {
                  const payload = await window.buildPayload({ cid: "1123", sid: "34", is_shortform: true });
                  await window.fetchLead(payload);
                  sessionStorage.setItem("shortFormCompleted", "true");
                  
                  // ✅ VERZEND LEADS NAAR ALLE COSPONSORS IN DE ACHTERGROND
                  const sponsorsAccepted = sessionStorage.getItem("sponsorsAccepted") === "true";
                  if (sponsorsAccepted && cosponsorsList && cosponsorsList.length > 0) {
                      console.log(`🚀 Partners geaccepteerd! Stuur lead naar ${cosponsorsList.length} cosponsors...`);
                      cosponsorsList.forEach(async (sponsor) => {
                          if(!sponsor.cid || !sponsor.sid) return;
                          try {
                              const spPayload = await window.buildPayload({ cid: sponsor.cid, sid: sponsor.sid, is_shortform: true });
                              window.fetchLead(spPayload);
                          } catch(err) { console.error(`Cosponsor ${sponsor.title} mislukt:`, err); }
                      });
                  }
                  
              } catch (e) { console.error("Fout bij versturen hoofdlead", e); }
          }
          
          await new Promise(r => setTimeout(r, 600)); 
          typingEl.style.display = "none";

          if (coregFlow && coregFlow.length > 0) {
              switchFlow(coregFlow);
          } else {
              switchFlow(longChatFlow);
          }
      } 
      else if (currentFlow === coregFlow) {
          switchFlow(longChatFlow);
      }
  }

  function switchFlow(newFlow) {
      currentFlow = newFlow;
      setTimeout(() => runStep(0), 400); 
  }

  // =============================================================
  // 9. HELPERS
  // =============================================================
  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = text;
    historyEl.insertBefore(div, typingEl);
    scrollToBottom();
  }

  function scrollToBottom() { setTimeout(() => { historyEl.scrollTop = historyEl.scrollHeight; }, 50); }
  function getAllData() { return { firstname: sessionStorage.getItem("firstname") || "Jij", lastname: sessionStorage.getItem("lastname") || "" }; }
  
  function initDobMask() {
    const input = document.getElementById("chat-input-dob");
    if(!input) return;
    input.addEventListener("input", (e) => {
        const isDelete = e.inputType && e.inputType.includes('delete');
        let v = input.value.replace(/\D/g, ""); 
        if (!isDelete) {
            if (v.length === 1 && parseInt(v[0]) > 3) v = "0" + v;
            if (v.length === 3 && parseInt(v[2]) > 1) v = v.slice(0, 2) + "0" + v[2];
        }
        if (v.length > 8) v = v.slice(0, 8);
        let output = "";
        if (v.length > 4) output = `${v.slice(0, 2)} / ${v.slice(2, 4)} / ${v.slice(4)}`;
        else if (v.length > 2) output = `${v.slice(0, 2)} / ${v.slice(2)}`;
        else output = v;
        if (!isDelete) {
            if (v.length === 2) output += " / ";
            if (v.length === 4) output += " / ";
        }
        input.value = output;
    });
  }

})();
