// =============================================================
// 💬 CHAT FORM LOGIC (Julia - NL + REAL IVR API + LongForm)
// =============================================================

(function() {
  // 1. VARIABELEN VOORAF DECLAREREN
  let historyEl, controlsEl, typingEl, chatInterface;
  let currentStepIndex = 0;
  
  // URL & Device Checks
  const urlParams = new URLSearchParams(window.location.search);
  const isLive = urlParams.get("status") === "live"; 
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // IVR Settings
  const IVR_NUMBER_DISPLAY = "0906-1512"; 
  const IVR_NUMBER_DIAL = "09061512"; 
  let fetchedIvrPin = "000"; // Wordt overschreven door de API

  // =============================================================
  // 2. IVR API LOGICA (Achtergrond fetch)
  // =============================================================
  async function initializeIVR() {
    if (!isLive) return; // Geen onnodige API calls als we niet live zijn

    const affId = urlParams.get("aff_id") || "123";
    const offerId = urlParams.get("offer_id") || "234";
    const subId = urlParams.get("sub_id") || "345";
    
    // Genereer of haal Transaction ID op
    let t_id = urlParams.get("t_id") || localStorage.getItem("t_id");
    if (!t_id) {
        t_id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        localStorage.setItem("t_id", t_id);
    }
    
    localStorage.setItem("aff_id", affId);
    localStorage.setItem("offer_id", offerId);
    localStorage.setItem("sub_id", subId);

    try {
        // Stap 1: Registreer Visit
        let internalVisitId = localStorage.getItem("internalVisitId");
        if (!internalVisitId) {
            const resVisit = await fetch("https://cdn.909support.com/NL/4.1/assets/php/register_visit.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ clickId: t_id, affId, offerId, subId, subId2: subId })
            });
            const dataVisit = await resVisit.json();
            if (dataVisit.internalVisitId) {
                internalVisitId = dataVisit.internalVisitId;
                localStorage.setItem("internalVisitId", internalVisitId);
            }
        }

        // Stap 2: Vraag PIN aan
        if (internalVisitId) {
            const resPin = await fetch("https://cdn.909support.com/NL/4.1/stage/assets/php/request_pin.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ clickId: t_id, internalVisitId })
            });
            const dataPin = await resPin.json();
            if (dataPin.pincode) {
                fetchedIvrPin = dataPin.pincode.toString().padStart(3, "0");
                console.log("✅ IVR PIN Succesvol opgehaald:", fetchedIvrPin);
            }
        }
    } catch (err) {
        console.error("❌ Fout bij ophalen IVR PIN:", err);
    }
  }

  // =============================================================
  // 3. FLOW CONFIGURATIES
  // =============================================================
  const chatFlow = [
    {
      id: "gender",
      botTexts: ["Hoi! Leuk dat je er bent 👋", "Laten we kijken of je in aanmerking komt. Ben je een man of een vrouw?"],
      inputType: "buttons",
      options: [{ label: "Man 🙋‍♂️", value: "Man" }, { label: "Vrouw 🙋‍♀️", value: "Vrouw" }]
    },
    {
      id: "name",
      botTexts: ["Duidelijk.", "Hoe heet je?"],
      inputType: "text-multi",
      fields: [{ id: "firstname", placeholder: "Voornaam" }, { id: "lastname", placeholder: "Achternaam" }]
    },
    {
      id: "dob",
      botTexts: [(data) => `Aangenaam, ${data.firstname}!`, "Even checken of je 18+ bent. Wanneer ben je jarig? 🎂"],
      inputType: "dob",
      fieldId: "dob",
      placeholder: "DD / MM / JJJJ"
    },
    {
      id: "email",
      botTexts: ["Top.", "Waar mogen we de bevestiging heen sturen? 📧"],
      inputType: "email",
      fieldId: "email",
      placeholder: "jouw@email.nl"
    },
    {
      id: "terms",
      botTexts: ["Bijna klaar! 🚀", "Om verder te gaan, dien je akkoord te gaan met de voorwaarden."],
      inputType: "terms_agree",
      buttonText: "Ik ga akkoord",
      subText: "Bekijk hier de <button type='button' id='open-actievoorwaarden-inline' style='background:none; border:none; padding:0; color:#888; text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;'>actievoorwaarden</button>."
    },
    {
      id: "partners",
      botTexts: ["Nog één dingetje...", "Om deze actie mogelijk te maken, werken we samen met partners.", "Vind je het goed dat onze <button class='open-sponsor-popup' style='background:none; border:none; padding:0; color:#14B670; text-decoration:underline; cursor:pointer; font-size:inherit; font-weight:700; font-family:inherit;'>partners</button> je benaderen met aanbiedingen?"],
      inputType: "partners_choice",
      btnAccept: "Ja, prima",
      btnDecline: "Nee, liever niet"
    },
    {
      id: "ivr",
      condition: () => isLive, 
      botTexts: [
        "Bedankt! We moeten alleen nog even je deelname verifiëren om misbruik te voorkomen 🛡️",
        isMobile 
          ? "Klik op de knop hieronder om direct te bellen." 
          : "Bel het onderstaande nummer en toets de code in om te bevestigen."
      ],
      inputType: "ivr_verify"
    }
  ];

  const longChatFlow = [
    {
      id: "address_zip",
      botTexts: ["Zo, dat is geregeld! 🎉", "Om je prijs eventueel op te sturen, hebben we je adres nodig.", "Wat is je postcode en huisnummer?"],
      inputType: "text-multi",
      fields: [{ id: "zipcode", placeholder: "1234AB" }, { id: "housenumber", placeholder: "Nr" }]
    },
    {
      id: "address_street",
      botTexts: ["Check.", "En je straatnaam en woonplaats?"],
      inputType: "text-multi",
      fields: [{ id: "street", placeholder: "Straatnaam" }, { id: "city", placeholder: "Woonplaats" }]
    },
    {
      id: "phone",
      botTexts: ["Als laatste: Op welk nummer kunnen we je bereiken als je gewonnen hebt? 📞"],
      inputType: "tel",
      fieldId: "phonenumber",
      placeholder: "06 12345678"
    },
    {
      id: "sovendus",
      botTexts: ["Geweldig, alles staat erin! 🥂", "Als bedankje voor je deelname hebben we nog een cadeautje voor je."],
      inputType: "sovendus_end"
    }
  ];

  let currentFlow = chatFlow; 

  // =============================================================
  // 4. INIT & LISTENERS
  // =============================================================
  function startLongFormChat() {
      console.log("Chat resuming for Long Form...");
      if(!chatInterface) return;
      chatInterface.classList.remove("finished");
      chatInterface.classList.add("visible");
      controlsEl.innerHTML = "";
      currentFlow = longChatFlow;
      runStep(0);
  };
  
  window.startLongFormChat = startLongFormChat;

  document.addEventListener("DOMContentLoaded", () => {
      initializeIVR(); // Start de fetch in de achtergrond!
      initChat();
  });
  
  document.addEventListener("coregFlowFinished", startLongFormChat);

  function initChat() {
    historyEl = document.getElementById("chat-history");
    controlsEl = document.getElementById("chat-controls");
    typingEl = document.getElementById("typing-indicator");
    chatInterface = document.getElementById("chat-interface");

    if(!historyEl || !controlsEl) return;
    
    setTimeout(() => {
        if(chatInterface) chatInterface.classList.add("visible");
        runStep(0);
    }, 100);
  }

  // =============================================================
  // 5. CORE LOGICA & RENDERING
  // =============================================================
  async function runStep(index) {
    if (index >= currentFlow.length) {
       if (currentFlow === chatFlow) handleShortFormComplete();
       return;
    }

    const step = currentFlow[index];
    if (step.condition && !step.condition()) {
        runStep(index + 1);
        return;
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
    else if (step.inputType === "text-multi") {
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
    
    // --- IVR RENDERING ---
    else if (step.inputType === "ivr_verify") {
       const pinStr = fetchedIvrPin; // Nu gebruiken we de echte code!
       
       // Spinner HTML Opbouw (3 cijfers)
       let digitsHtml = "";
       for(let char of pinStr) {
           // We voegen standaard CSS toe om zeker te zijn dat de structuur klopt
           digitsHtml += `
             <div class="digit" style="display:inline-block; width:44px; height:56px; overflow:hidden; background:#f0f9f4; border:1px solid #c8e6c9; margin:0 4px; border-radius:8px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);">
               <div class="digit-inner" style="display:flex; flex-direction:column; text-align:center; font-size:28px; font-weight:800; color:#14B670; line-height:56px; transition: transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);"></div>
             </div>`;
       }

       if (isMobile) {
           const telUri = `tel:${IVR_NUMBER_DIAL},${pinStr}#`;
           html = `
             <div id="ivr-mobile" style="text-align:center; width:100%;">
               <div style="font-size:13px; color:#555; margin-bottom:8px;">Jouw verificatiecode:</div>
               <div id="pin-code-spinner-mobile" class="pin-spinner" style="display:flex; justify-content:center; margin-bottom:15px;">
                 ${digitsHtml}
               </div>
               
               <a href="${telUri}" class="cta-primary ivr-call-btn" onclick="window.handleIVRCall()" style="display:flex; align-items:center; justify-content:center; text-decoration:none; margin-bottom:8px;">
                 📞 Bel Nu
               </a>
               <div style="font-size:11px; color:#999;">Code wordt automatisch verstuurd</div>
             </div>
           `;
           setTimeout(() => animatePinRevealSpinner(pinStr, "pin-code-spinner-mobile"), 100);
       } else {
           html = `
             <div id="ivr-desktop" style="text-align:center; width:100%;">
                <div style="font-size:14px; margin-bottom:8px; color:#555;">Bel: <strong style="font-size:18px;">${IVR_NUMBER_DISPLAY}</strong></div>
                <div style="margin-bottom:10px; font-size:13px;">En toets deze code:</div>
                
                <div id="pin-container-desktop" style="margin-bottom:20px;">
                  <div id="pin-code-spinner-desktop" class="pin-spinner" style="display:flex; justify-content:center;">
                    ${digitsHtml}
                  </div>
                </div>

                <button class="cta-primary" onclick="window.handleIVRCall()">Ik heb gebeld & bevestigd</button>
             </div>
           `;
           setTimeout(() => animatePinRevealSpinner(pinStr, "pin-code-spinner-desktop"), 100);
       }
    }
    
    // --- SOVENDUS EINDE ---
    else if (step.inputType === "sovendus_end") {
        html = `<div style="text-align:center; color:#14B670; font-weight:bold;">Bedankt voor je deelname!</div>`;
        setTimeout(() => { if(window.renderSovendusBanner) window.renderSovendusBanner(); }, 500);
    }

    controlsEl.innerHTML = html;
    
    // Auto-focus & Enter Support
    const firstInput = controlsEl.querySelector("input");
    if(firstInput) setTimeout(() => firstInput.focus(), 100);
    const inputs = controlsEl.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("keydown", (e) => { if(e.key === "Enter") window.submitChatText(); });
    });
    if (step.id === "dob") initDobMask();
  }

  // =============================================================
  // 6. SPINNER ANIMATIE (Precies zoals in IVR.js)
  // =============================================================
  function animatePinRevealSpinner(pin, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    const digits = container.querySelectorAll(".digit-inner");
    pin.split("").forEach((digit, index) => {
      const inner = digits[index];
      if (!inner) return;

      inner.innerHTML = "";
      // Maak kolom met cijfers 0 t/m 9
      for (let i = 0; i <= 9; i++) {
        const span = document.createElement("span");
        span.textContent = i;
        span.style.display = "block";
        span.style.height = "56px"; // Exact zelfde hoogte als wrapper
        inner.appendChild(span);
      }

      // Bereken offset (56px per digit in plaats van 64px om het strakker te maken)
      const offset = parseInt(digit, 10) * 56;
      setTimeout(() => {
        inner.style.transform = `translateY(-${offset}px)`;
      }, 100); // Korte delay voor smooth trigger
    });
  }

  // =============================================================
  // 7. HANDLERS
  // =============================================================
  window.handleChatInput = function(id, value) {
    addMessage("user", value);
    sessionStorage.setItem(id, value);
    runStep(currentStepIndex + 1);
  };

  window.submitChatText = function() {
    const step = currentFlow[currentStepIndex];
    let userDisplay = "";
    
    if (step.inputType === "text-multi") {
       let values = []; let valid = true;
       step.fields.forEach(f => {
           const el = document.getElementById(`chat-input-${f.id}`);
           if(!el || !el.value.trim()) valid = false;
           else {
               sessionStorage.setItem(f.id, el.value.trim());
               values.push(el.value.trim());
           }
       });
       if(!valid) { alert("Vul alle velden in."); return; }
       userDisplay = values.join(" ");
    }
    else if (step.inputType === "tel") {
        const val = document.getElementById(`chat-input-${step.fieldId}`).value.trim();
        if(val.length < 8) { alert("Vul een geldig nummer in."); return; }
        sessionStorage.setItem(step.fieldId, val);
        userDisplay = val;
    }
    else if (step.id === "email") {
        const val = document.getElementById(`chat-input-email`).value.trim();
        if(!val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { alert("Vul een geldig e-mailadres in."); return; }
        sessionStorage.setItem("email", val);
        userDisplay = val;
    }
    else if (step.id === "dob") {
        const val = document.getElementById(`chat-input-dob`).value.trim();
        if(val.length < 10) { alert("Vul je volledige geboortedatum in."); return; }
        sessionStorage.setItem("dob", val); userDisplay = val;
    }

    addMessage("user", userDisplay);
    runStep(currentStepIndex + 1);
  };

  window.handleTermsAgree = function() {
    addMessage("user", "Ik ga akkoord");
    runStep(currentStepIndex + 1);
  };

  window.handlePartnerChoice = function(accepted) {
    sessionStorage.setItem("sponsorsAccepted", accepted ? "true" : "false");
    addMessage("user", accepted ? "Ja, prima" : "Nee, liever niet");
    runStep(currentStepIndex + 1);
  };

  window.handleIVRCall = function() {
      if (!isMobile) addMessage("user", "Ik heb gebeld en de code ingevoerd.");
      finalizeShortForm();
  };

  // =============================================================
  // 8. HELPERS & AFHANDELING
  // =============================================================
  async function handleShortFormComplete() {
     if (!isLive) finalizeShortForm();
  }

  async function finalizeShortForm() {
    controlsEl.innerHTML = ``; 
    typingEl.style.display = "flex"; scrollToBottom();
    await new Promise(r => setTimeout(r, 800));
    typingEl.style.display = "none";
    addMessage("bot", "Bedankt! Een momentje... ✨");

    if (window.buildPayload && window.fetchLead) {
        try {
            const payload = await window.buildPayload({ cid: "1123", sid: "34", is_shortform: true });
            await window.fetchLead(payload);
            sessionStorage.setItem("shortFormCompleted", "true");
            
            setTimeout(() => {
                if(chatInterface) chatInterface.classList.add("finished"); 
                setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600); 
            }, 1500);

        } catch (e) { console.error(e); }
    } else {
        setTimeout(() => {
             if(chatInterface) chatInterface.classList.add("finished");
             setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600);
        }, 1500);
    }
  }

  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = text;
    historyEl.insertBefore(div, typingEl);
    scrollToBottom();
  }

  function scrollToBottom() { setTimeout(() => { historyEl.scrollTop = historyEl.scrollHeight; }, 50); }
  
  function getAllData() { 
      return { 
          firstname: sessionStorage.getItem("firstname") || "Jij", 
          lastname: sessionStorage.getItem("lastname") || "" 
      }; 
  }
  
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
