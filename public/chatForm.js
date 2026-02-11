// =============================================================
// 💬 CHAT FORM LOGIC (Julia - NL + API FIXES + POSTCODE + LONGFORM)
// =============================================================

(function() {
  // --- CSS INJECTIE (Mobiele hoogte, desktop hoogte & compacte buttons) ---
  const style = document.createElement('style');
  style.innerHTML = `
    /* Mobiel: Chat vult exact het scherm */
    @media (max-width: 767px) {
      #chat-interface {
        position: fixed !important; top: 0; left: 0; right: 0; bottom: 0;
        height: 100dvh !important; max-height: 100dvh !important; width: 100vw !important;
        z-index: 999999 !important; border-radius: 0 !important;
        display: flex !important; flex-direction: column !important; margin: 0 !important;
      }
    }
    /* Desktop/Tablet: Nette maximale hoogte */
    @media (min-width: 768px) {
      #chat-interface {
        height: 700px !important; max-height: 80vh !important;
        border-radius: 12px !important; margin: 20px auto !important;
        display: flex !important; flex-direction: column !important;
      }
    }
    /* Scroll fix voor de geschiedenis */
    #chat-history { flex: 1 1 auto !important; overflow-y: auto !important; }
    #chat-controls { flex: 0 0 auto !important; }
    
    /* Compacte Coreg Buttons */
    .coreg-btn-compact {
      padding: 8px 12px !important; font-size: 13px !important;
      margin-bottom: 6px !important; min-height: 38px !important;
      line-height: 1.2 !important; width: 100% !important; border-radius: 6px !important;
    }
  `;
  document.head.appendChild(style);

  // 1. VARIABELEN
  let historyEl, controlsEl, typingEl, chatInterface;
  let currentStepIndex = 0;
  
  const urlParams = new URLSearchParams(window.location.search);
  const isLive = urlParams.get("status") === "live"; 
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const IVR_NUMBER_DISPLAY = "0906-1512"; 
  const IVR_NUMBER_DIAL = "09061512"; 
  let fetchedIvrPin = "000"; 
  let coregFlow = []; 

  // =============================================================
  // 2. API FETCHES (Achtergrond)
  // =============================================================
  async function initializeData() {
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

    try {
        const apiUrl = window.API_COREG || "https://coregflownlv2.vercel.app/api/coreg.js";
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
      id: "dob", botTexts: [(data) => `Aangenaam, ${data.firstname}!`, "Even checken of je 18+ bent. Wanneer ben je jarig? 🎂"],
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

    // Flush pending longform leads vlak voor Sovendus
    if (step.id === "sovendus") {
        const pending = JSON.parse(sessionStorage.getItem("pendingLongFormLeads") || "[]");
        if (pending.length > 0 && window.buildPayload && window.fetchLead) {
            pending.forEach(async (lead) => {
                try {
                    const payload = await window.buildPayload({ cid: lead.cid, sid: lead.sid, is_shortform: false });
                    window.fetchLead(payload);
                } catch(e) { console.error(e); }
            });
            sessionStorage.removeItem("pendingLongFormLeads"); // Clear queue
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
      step.options.forEach(opt => html += `<button class="chat-option-btn" onclick="window.handleChatInput('${step.id}', '${opt.value}')">${opt.label}</button>`);
      html += `</div>`;
    } 
    else if (step.inputType === "text-multi" || step.inputType === "address_zip_lookup") {
      step.fields.forEach(f => html += `<input type="text" id="chat-input-${f.id}" class="chat-input-text" placeholder="${f.placeholder}" style="margin-bottom:10px;">`);
      html += `<button class="cta-primary" onclick="window.submitChatText()" style="margin-top:5px;">Volgende</button>`;
    }
    else if (step.inputType === "dob") {
       html = `<div style="display:flex; gap:10px; width:100%;"><input type="tel" inputmode="numeric" id="chat-input-dob" class="chat-input-text" placeholder="DD / MM / JJJJ" autocomplete="bday" maxlength="14"> <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button></div>`;
    }
    else if (step.inputType === "email" || step.inputType === "tel") {
        html = `<div style="display:flex; gap:10px; width:100%;"><input type="${step.inputType}" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="${step.inputType}"><button class="chat-submit-btn" onclick="window.submitChatText()">➤</button></div>`;
    }
    else if (step.inputType === "terms_agree") {
      html = `<button class="cta-primary" onclick="window.handleTermsAgree()">${step.buttonText}</button><div style="font-size:12px; color:#999; text-align:center; margin-top:10px; line-height:1.4;">${step.subText}</div>`;
    }
    else if (step.inputType === "partners_choice") {
      html = `<button class="cta-primary" onclick="window.handlePartnerChoice(true)">${step.btnAccept}</button><button onclick="window.handlePartnerChoice(false)" style="display:block; width:100%; background:none; border:none; margin-top:12px; padding:5px; color:#999; text-decoration:underline; font-size:13px; cursor:pointer;">${step.btnDecline}</button>`;
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
           html = `<div id="ivr-desktop" style="text-align:center; width:100%;"><div style="font-size:15px; color:#444; margin-bottom:16px; font-weight:500;">Bel naar: <span style="font-size:26px; font-weight:800; color:#14B670; display:block; margin-top:6px; letter-spacing:1px;">${IVR_NUMBER_DISPLAY}</span></div><div style="font-size:16px; font-weight:700; color:#003C43; margin-bottom:12px;">En toets deze code in:</div><div id="pin-container-desktop" style="margin-bottom:24px;"><div id="pin-code-spinner-desktop" class="pin-spinner" style="display:flex; justify-content:center;">${digitsHtml}</div></div><button class="cta-primary" onclick="window.handleIVRCall()" style="font-size:16px;">Ik heb gebeld & bevestigd</button></div>`;
           setTimeout(() => animatePinRevealSpinner(pinStr, "pin-code-spinner-desktop"), 100);
       }
    }
    // --- COREG INTERACTIE (COMPACTE BUTTONS) ---
    else if (step.inputType === "coreg_interaction") {
        const camp = step.campaign;
        const answers = camp.coreg_answers || [];
        const style = camp.ui_style?.toLowerCase() || "buttons";
        
        html = `<div class="chat-btn-group" style="flex-direction:column; gap:0;">`;
        
        if (style === "dropdown") {
            html += `<select id="coreg-select-${camp.id}" class="chat-input-text" style="margin-bottom:6px; padding:10px; font-size:14px; border:1px solid #ccc; border-radius:6px; width:100%;">
                        <option value="">Kies een optie...</option>`;
            answers.forEach(opt => {
                const val = opt.answer_value || "yes";
                const cid = opt.has_own_campaign ? opt.cid : camp.cid;
                const sid = opt.has_own_campaign ? opt.sid : camp.sid;
                html += `<option value="${val}" data-cid="${cid}" data-sid="${sid}">${opt.label}</option>`;
            });
            html += `</select>`;
            html += `<button class="cta-primary coreg-btn-compact" onclick="window.submitCoregDropdown('${camp.id}', '${camp.cid}', '${camp.sid}')">Bevestigen</button>`;
        } else {
            answers.forEach(opt => {
                const cid = opt.has_own_campaign ? opt.cid : camp.cid;
                const sid = opt.has_own_campaign ? opt.sid : camp.sid;
                const val = opt.answer_value || "yes";
                html += `<button class="cta-primary coreg-btn-compact" onclick="window.submitCoregAnswer('${val}', '${cid}', '${sid}', '${opt.label}')">${opt.label}</button>`;
            });
        }
        
        html += `<button onclick="window.submitCoregAnswer('no', '${camp.cid}', '${camp.sid}', 'Nee, bedankt')" style="display:block; width:100%; background:none; border:none; padding:8px; color:#999; text-decoration:underline; font-size:12px; cursor:pointer; margin-top:4px;">Nee, bedankt</button>`;
        html += `</div>`;
    }
    else if (step.inputType === "sovendus_end") {
        html = `<div style="text-align:center; color:#14B670; font-weight:bold;">Je deelname is definitief!</div>`;
        setTimeout(() => { if(window.renderSovendusBanner) window.renderSovendusBanner(); }, 500);
    }

    controlsEl.innerHTML = html;
    
    const firstInput = controlsEl.querySelector("input");
    if(firstInput) setTimeout(() => firstInput.focus(), 100);
    const inputs = controlsEl.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("keydown", (e) => { if(e.key === "Enter") window.submitChatText(); });
    });
    if (step.id === "dob") initDobMask();
  }

  // =============================================================
  // 6. ANIMATIES & INPUT HANDLERS
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

  window.submitChatText = async function() {
    const step = currentFlow[currentStepIndex];
    let userDisplay = "";
    
    // --- POSTCODE CHECK (API) ---
    if (step.inputType === "address_zip_lookup") {
        const zip = document.getElementById("chat-input-zipcode").value.trim();
        const num = document.getElementById("chat-input-housenumber").value.trim();
        if(!zip || !num) { alert("Vul postcode en huisnummer in."); return; }
        
        sessionStorage.setItem("zipcode", zip);
        sessionStorage.setItem("housenumber", num);
        addMessage("user", `${zip} ${num}`);
        
        typingEl.style.display = "flex"; scrollToBottom();
        
        try {
            const res = await fetch("/api/validateAddressNL", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postcode: zip, huisnummer: num })
            });
            const data = await res.json();
            
            typingEl.style.display = "none";
            
            if (data.valid) {
                sessionStorage.setItem("street", data.street);
                sessionStorage.setItem("city", data.city);
                addMessage("bot", `Gevonden! Je adres is:<br><strong>${data.street}, ${data.city}</strong>`);
                runStep(currentStepIndex + 2); // Sla handmatige straatvraag over!
                return;
            }
        } catch(e) { console.error("Adres validatie fout:", e); }
        
        // Als API faalt of adres niet gevonden, ga naar handmatige invoer
        typingEl.style.display = "none";
        runStep(currentStepIndex + 1); 
        return;
    }
    else if (step.inputType === "text-multi") {
       let values = []; let valid = true;
       step.fields.forEach(f => {
           const el = document.getElementById(`chat-input-${f.id}`);
           if(!el || !el.value.trim()) valid = false;
           else { sessionStorage.setItem(f.id, el.value.trim()); values.push(el.value.trim()); }
       });
       if(!valid) { alert("Vul alle velden in."); return; }
       userDisplay = values.join(" ");
    }
    else if (step.inputType === "tel") {
        const val = document.getElementById(`chat-input-${step.fieldId}`).value.trim();
        if(val.length < 8) { alert("Vul een geldig nummer in."); return; }
        sessionStorage.setItem(step.fieldId, val); userDisplay = val;
    }
    else if (step.id === "email") {
        const val = document.getElementById(`chat-input-email`).value.trim();
        if(!val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { alert("Vul een geldig e-mailadres in."); return; }
        sessionStorage.setItem("email", val); userDisplay = val;
    }
    else if (step.id === "dob") {
        const val = document.getElementById(`chat-input-dob`).value;
        const cleanVal = val.replace(/\s+/g, ''); // Fix: Verwijder spaties voor Databowl
        if(cleanVal.length !== 10) { alert("Vul je volledige geboortedatum in."); return; }
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

  // --- COREG HANDLERS (LOGICA VERBETERD) ---
  window.submitCoregDropdown = function(campId, fallbackCid, fallbackSid) {
      const sel = document.getElementById(`coreg-select-${campId}`);
      if(!sel || !sel.value) { alert("Kies een optie om verder te gaan."); return; }
      const opt = sel.options[sel.selectedIndex];
      const cid = opt.getAttribute("data-cid") || fallbackCid;
      const sid = opt.getAttribute("data-sid") || fallbackSid;
      window.submitCoregAnswer(sel.value, cid, sid, opt.text);
  };

  window.submitCoregAnswer = async function(answerValue, cid, sid, userText) {
      addMessage("user", userText); 
      const camp = currentFlow[currentStepIndex].campaign;

      // Sla antwoord lokaal op
      const key = `coreg_answers_${cid}`;
      const prev = JSON.parse(sessionStorage.getItem(key) || "[]");
      if (answerValue && !prev.includes(answerValue)) prev.push(answerValue);
      sessionStorage.setItem(key, JSON.stringify(prev));
      sessionStorage.setItem(`f_2014_coreg_answer_${cid}`, prev.join(" - "));
      
      if (answerValue && answerValue !== 'yes' && answerValue !== 'no') {
           sessionStorage.setItem(`f_2575_coreg_answer_dropdown_${cid}`, answerValue);
      }

      // Verwerk Lead (Alleen als antwoord "Ja" / Positief is)
      if (answerValue !== "no") {
          const isLongForm = camp.requiresLongForm || camp.requires_long_form === true || camp.requires_long_form === "true";
          
          if (isLongForm) {
              // Zet in de wachtrij voor later (na invullen adres/telefoon)
              let pending = JSON.parse(sessionStorage.getItem("pendingLongFormLeads") || "[]");
              if (!pending.some(p => p.cid === cid)) pending.push({ cid, sid });
              sessionStorage.setItem("pendingLongFormLeads", JSON.stringify(pending));
          } else {
              // Direct verzenden (Shortform coreg)
              if (window.buildPayload && window.fetchLead) {
                  try {
                      const payload = await window.buildPayload({ cid, sid, is_shortform: false });
                      window.fetchLead(payload);
                  } catch(e) {}
              }
          }
      }

      // Multistep Logica: Als we "Nee" zeggen, sla rest van campagne over
      let nextIdx = currentStepIndex + 1;
      if (answerValue === "no" && currentFlow === coregFlow) {
          while (nextIdx < coregFlow.length && coregFlow[nextIdx].campaign.cid === camp.cid) {
              nextIdx++;
          }
      }
      runStep(nextIdx);
  };

  // =============================================================
  // 7. TRANSITIE LOGICA TUSSEN DE FLOWS
  // =============================================================
  async function handleFlowComplete() {
      if (currentFlow === chatFlow) {
          controlsEl.innerHTML = ``; 
          typingEl.style.display = "flex"; scrollToBottom();
          
          // Initial Lead versturen
          if (window.buildPayload && window.fetchLead) {
              try {
                  const payload = await window.buildPayload({ cid: "1123", sid: "34", is_shortform: true });
                  await window.fetchLead(payload);
                  sessionStorage.setItem("shortFormCompleted", "true");
              } catch (e) {}
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
  // 8. HELPERS
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
