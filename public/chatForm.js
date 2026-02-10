// =============================================================
// 💬 CHAT FORM LOGIC (Julia - NL + IVR + LongForm + Sovendus)
// =============================================================

(function() {
  document.addEventListener("DOMContentLoaded", initChat);
  
  // Luister naar het einde van de Coreg flow om de chat te hervatten
  document.addEventListener("coregFlowFinished", startLongFormChat);

  // 0. GLOBALE SETTINGS & DETECTIE
  const urlParams = new URLSearchParams(window.location.search);
  const isLive = urlParams.get("status") === "live"; // Alleen IVR als ?status=live
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Mockup settings voor IVR (Pas deze aan met echte data)
  const IVR_NUMBER = "0906-0000"; // Het belnummer
  const IVR_NUMBER_CLEAN = "09060000"; 
  // In het echt komt deze PIN waarschijnlijk uit je backend response
  const USER_PIN = Math.floor(1000 + Math.random() * 9000); 

  // 1. SHORT FORM FLOW (Eerste deel)
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
    // --- NIEUW: IVR STAP (Alleen als status=live) ---
    {
      id: "ivr",
      condition: () => isLive, // Skip als niet live
      botTexts: [
        "Bedankt! We moeten alleen nog even je deelname verifiëren om misbruik te voorkomen 🛡️",
        isMobile 
          ? "Klik op de knop hieronder om direct te bellen en je deelname te bevestigen (gratis)." 
          : "Bel het onderstaande nummer en toets de code in om te bevestigen."
      ],
      inputType: "ivr_verify",
      pin: USER_PIN
    }
  ];

  // 2. LONG FORM FLOW (Tweede deel - na Coreg)
  const longChatFlow = [
    {
      id: "address_zip",
      botTexts: ["Zo, dat is geregeld! 🎉", "Om je prijs eventueel op te sturen, hebben we je adres nodig.", "Wat is je postcode en huisnummer?"],
      inputType: "text-multi",
      fields: [{ id: "zipcode", placeholder: "1234AB" }, { id: "housenumber", placeholder: "Nr" }]
    },
    {
      id: "address_street", // Eventueel auto-fillen via API, nu handmatig
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

  // 3. STATE
  let currentFlow = chatFlow; // We beginnen met short form
  let currentStepIndex = 0;
  
  const historyEl = document.getElementById("chat-history");
  const controlsEl = document.getElementById("chat-controls");
  const typingEl = document.getElementById("typing-indicator");
  const chatInterface = document.getElementById("chat-interface");

  // 4. INIT
  function initChat() {
    if(!historyEl || !controlsEl) return;
    setTimeout(() => {
        if(chatInterface) chatInterface.classList.add("visible");
        runStep(0);
    }, 100);
  }

  // 5. CORE LOGIC
  async function runStep(index) {
    if (index >= currentFlow.length) {
       // Einde van huidige flow
       if (currentFlow === chatFlow) handleShortFormComplete();
       return;
    }

    const step = currentFlow[index];
    
    // Check conditie (bijv. IVR alleen als live)
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
    
    // ... (Bestaande button/text/dob/email/terms logica) ...
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
    else if (step.inputType === "email") {
        html = `<div style="display:flex; gap:10px; width:100%;"><input type="email" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="email"><button class="chat-submit-btn" onclick="window.submitChatText()">➤</button></div>`;
    }
    else if (step.inputType === "tel") { // Nieuw voor Longform
        html = `<div style="display:flex; gap:10px; width:100%;"><input type="tel" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="tel"><button class="chat-submit-btn" onclick="window.submitChatText()">➤</button></div>`;
    }
    else if (step.inputType === "terms_agree") {
      html = `<button class="cta-primary" onclick="window.handleTermsAgree()">${step.buttonText}</button><div style="font-size:12px; color:#999; text-align:center; margin-top:10px; line-height:1.4;">${step.subText}</div>`;
    }
    else if (step.inputType === "partners_choice") {
      html = `<button class="cta-primary" onclick="window.handlePartnerChoice(true)">${step.btnAccept}</button><button onclick="window.handlePartnerChoice(false)" style="display:block; width:100%; background:none; border:none; margin-top:12px; padding:5px; color:#999; text-decoration:underline; font-size:13px; cursor:pointer;">${step.btnDecline}</button>`;
    }
    
    // --- NIEUW: IVR CONTROLS ---
    else if (step.inputType === "ivr_verify") {
       if (isMobile) {
           // MOBIEL: Bel direct met pauze (,) en code
           const telUri = `tel:${IVR_NUMBER_CLEAN},${step.pin}#`;
           html = `
             <a href="${telUri}" class="cta-primary" onclick="window.handleIVRCall()" style="display:flex; align-items:center; justify-content:center; text-decoration:none;">
               📞 Bel & Bevestig
             </a>
             <div style="font-size:12px; color:#999; text-align:center; margin-top:10px;">
               Druk op de knop, de code wordt automatisch verstuurd.
             </div>
           `;
       } else {
           // DESKTOP: Toon nummer en code
           html = `
             <div style="text-align:center; background:#f0f9f4; padding:15px; border-radius:12px; border:1px solid #14B670; margin-bottom:10px;">
               <div style="font-size:14px; color:#555;">Bel dit nummer:</div>
               <div style="font-size:24px; font-weight:800; color:#111; margin:4px 0;">${IVR_NUMBER}</div>
               <div style="font-size:14px; color:#555; margin-top:8px;">En toets deze code:</div>
               <div style="font-size:32px; font-weight:900; color:#14B670; letter-spacing:2px;">${step.pin}</div>
             </div>
             <button class="cta-primary" onclick="window.handleIVRCall()">Ik heb gebeld & bevestigd</button>
           `;
       }
    }
    // --- NIEUW: SOVENDUS EINDE ---
    else if (step.inputType === "sovendus_end") {
        html = `<div style="text-align:center; color:#14B670; font-weight:bold;">Bedankt voor je deelname!</div>`;
        // Trigger sovendus hier direct of via timeout
        setTimeout(() => { 
            if(window.renderSovendusBanner) window.renderSovendusBanner(); 
            // Of trigger de functie in sovendus.js
        }, 500);
    }

    controlsEl.innerHTML = html;
    
    // Focus logic
    const firstInput = controlsEl.querySelector("input");
    if(firstInput) setTimeout(() => firstInput.focus(), 100);
    
    const inputs = controlsEl.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("keydown", (e) => {
             if(e.key === "Enter") window.submitChatText();
        });
    });

    if (step.id === "dob") initDobMask();
  }

  // 6. HANDLERS
  window.handleChatInput = function(id, value) {
    addMessage("user", value);
    sessionStorage.setItem(id, value);
    runStep(currentStepIndex + 1);
  };

  window.submitChatText = function() {
    const step = currentFlow[currentStepIndex];
    let userDisplay = "";
    
    // ... (Bestaande validatie logica voor naam/email/dob) ...
    if (step.inputType === "text-multi") {
       // Pak alle velden dynamically
       let values = [];
       let valid = true;
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
    const text = accepted ? "Ja, prima" : "Nee, liever niet";
    addMessage("user", text);
    
    // Als IVR aan staat, gaan we eerst naar IVR. 
    // runStep zal checken of de volgende stap (IVR) mag.
    runStep(currentStepIndex + 1);
  };

  // Handler voor IVR
  window.handleIVRCall = function() {
      // Op mobiel: de call is gestart. Op desktop: gebruiker zegt dat ie gebeld heeft.
      // Hier zou je eventueel kunnen checken bij backend of verificatie gelukt is.
      // Voor nu gaan we er vanuit dat het gelukt is.
      
      if (!isMobile) addMessage("user", "Ik heb gebeld en de code ingevoerd.");
      
      // Nu sturen we de short form data op en triggeren we Coreg
      finalizeShortForm();
  };

  // 7. FLOW CONTROLLERS

  async function handleShortFormComplete() {
     // Als we hier zijn, is Short Form (+ evt IVR) klaar.
     // Normaal zou handleIVRCall dit triggeren, maar als IVR uit staat, komen we hier automatisch.
     if (!isLive) finalizeShortForm(); // Als niet live, direct submitten
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
            
            // FADE OUT CHAT -> START COREG
            setTimeout(() => {
                if(chatInterface) chatInterface.classList.add("finished"); // Chat weg
                setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600); // Coreg start
            }, 1500);

        } catch (e) { console.error(e); }
    } else {
        // Fallback
        setTimeout(() => {
             if(chatInterface) chatInterface.classList.add("finished");
             setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600);
        }, 1500);
    }
  }

  // Functie die aangeroepen wordt nadat Coreg klaar is
  window.startLongFormChat = function() {
      // Reset de chat view
      chatInterface.classList.remove("finished");
      chatInterface.classList.add("visible");
      
      // Wis controls en history (optioneel, of behoud geschiedenis)
      // historyEl.innerHTML = ""; // Uncomment als je lege chat wil
      controlsEl.innerHTML = "";

      // Switch naar Long Form vragen
      currentFlow = longChatFlow;
      runStep(0);
  };

  // Helpers (addMessage, scrollToBottom, getAllData, initDobMask)
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
