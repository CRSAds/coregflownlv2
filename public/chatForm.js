// =============================================================
// 💬 CHAT FORM LOGIC (Julia - NL Version + Partner Split)
// =============================================================

(function() {
  document.addEventListener("DOMContentLoaded", initChat);

  // 1. CONFIGURATIE
  const chatFlow = [
    {
      id: "gender",
      botTexts: [
        "Hoi! Leuk dat je er bent 👋",
        "Laten we kijken of je in aanmerking komt. Ben je een man of een vrouw?"
      ],
      inputType: "buttons",
      options: [
        { label: "Man 🙋‍♂️", value: "Man" },
        { label: "Vrouw 🙋‍♀️", value: "Vrouw" }
      ]
    },
    {
      id: "name",
      botTexts: [
        "Duidelijk.",
        "Hoe heet je?"
      ],
      inputType: "text-multi",
      fields: [
        { id: "firstname", placeholder: "Voornaam" },
        { id: "lastname", placeholder: "Achternaam" }
      ]
    },
    {
      id: "dob",
      botTexts: [
        (data) => `Aangenaam, ${data.firstname}!`,
        "Even checken of je 18+ bent. Wanneer ben je jarig? 🎂"
      ],
      inputType: "dob",
      fieldId: "dob",
      placeholder: "DD / MM / JJJJ"
    },
    {
      id: "email",
      botTexts: [
        "Top.",
        "Waar mogen we de bevestiging heen sturen? 📧"
      ],
      inputType: "email",
      fieldId: "email",
      placeholder: "jouw@email.nl"
    },
    // --- STAP 1: ACTIEVOORWAARDEN (Verplicht) ---
    {
      id: "terms",
      botTexts: [
        "Bijna klaar! 🚀",
        "Om verder te gaan, dien je akkoord te gaan met de voorwaarden."
      ],
      inputType: "terms_agree", // Nieuw type
      buttonText: "Ik ga akkoord",
      // 👇 Link met ID opent de actievoorwaarden popup
      subText: "Bekijk hier de <button type='button' id='open-actievoorwaarden-inline' style='background:none; border:none; padding:0; color:#888; text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;'>actievoorwaarden</button>."
    },
    // --- STAP 2: PARTNERS (Keuze) ---
    {
      id: "partners",
      botTexts: [
        "Nog één dingetje...",
        "Om deze actie mogelijk te maken, werken we samen met partners.",
        // 👇 Link met class opent de partner popup
        "Vind je het goed dat onze <button class='open-sponsor-popup' style='background:none; border:none; padding:0; color:#14B670; text-decoration:underline; cursor:pointer; font-size:inherit; font-weight:700; font-family:inherit;'>partners</button> je benaderen met aanbiedingen?"
      ],
      inputType: "partners_choice", // Nieuw type
      btnAccept: "Ja, prima",
      btnDecline: "Nee, liever niet" // Wordt een klein linkje
    }
  ];

  // 2. STATE
  let currentStepIndex = 0;
  
  const historyEl = document.getElementById("chat-history");
  const controlsEl = document.getElementById("chat-controls");
  const typingEl = document.getElementById("typing-indicator");
  const chatInterface = document.getElementById("chat-interface");

  // 3. INIT
  function initChat() {
    if(!historyEl || !controlsEl) return;
    setTimeout(() => {
        if(chatInterface) chatInterface.classList.add("visible");
        runStep(0);
    }, 100);
  }

  // 4. CORE LOGICA
  async function runStep(index) {
    currentStepIndex = index;
    const step = chatFlow[index];
    
    controlsEl.innerHTML = ""; 
    controlsEl.style.opacity = "0";

    for (const textTemplate of step.botTexts) {
      typingEl.style.display = "flex"; 
      scrollToBottom();
      await new Promise(r => setTimeout(r, 800)); 
      typingEl.style.display = "none";

      let text = typeof textTemplate === "function" 
        ? textTemplate(getAllData()) 
        : textTemplate;
      addMessage("bot", text);
    }

    renderControls(step);
    
    controlsEl.style.transition = "opacity 0.3s";
    controlsEl.style.opacity = "1";
    scrollToBottom();
  }

  function renderControls(step) {
    let html = "";
    
    // --- STANDAARD KNOPPEN ---
    if (step.inputType === "buttons") {
      html = `<div class="chat-btn-group">`;
      step.options.forEach(opt => {
        html += `<button class="chat-option-btn" onclick="window.handleChatInput('${step.id}', '${opt.value}')">${opt.label}</button>`;
      });
      html += `</div>`;
    } 
    // --- TEKST VELDEN ---
    else if (step.inputType === "text-multi") {
      step.fields.forEach(f => {
        html += `<input type="text" id="chat-input-${f.id}" class="chat-input-text" placeholder="${f.placeholder}" style="margin-bottom:10px;">`;
      });
      html += `<button class="cta-primary" onclick="window.submitChatText()" style="margin-top:5px;">Volgende</button>`;
    }
    // --- DOB (Met Auto-Jump) ---
    else if (step.inputType === "dob") {
       html = `
        <div style="display:flex; gap:10px; width:100%;">
          <input type="tel" inputmode="numeric" id="chat-input-dob" class="chat-input-text" placeholder="DD / MM / JJJJ" autocomplete="bday" maxlength="14"> 
          <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
        </div>`;
    }
    // --- EMAIL ---
    else if (step.inputType === "email") {
        html = `
          <div style="display:flex; gap:10px; width:100%;">
            <input type="email" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="email">
            <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
          </div>`;
    }
    // --- STAP 1: ACTIEVOORWAARDEN (Verplicht) ---
    else if (step.inputType === "terms_agree") {
      html = `
        <button class="cta-primary" onclick="window.handleTermsAgree()">${step.buttonText}</button>
        <div style="font-size:12px; color:#999; text-align:center; margin-top:10px; line-height:1.4;">${step.subText}</div>
      `;
    }
    // --- STAP 2: PARTNERS (Keuze) ---
    else if (step.inputType === "partners_choice") {
      html = `
        <button class="cta-primary" onclick="window.handlePartnerChoice(true)">${step.btnAccept}</button>
        
        <button onclick="window.handlePartnerChoice(false)" 
                style="display:block; width:100%; background:none; border:none; margin-top:12px; padding:5px; color:#999; text-decoration:underline; font-size:13px; cursor:pointer;">
          ${step.btnDecline}
        </button>
      `;
    }

    controlsEl.innerHTML = html;
    
    // Focus & Enter key logic
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

  // 5. INPUT HANDLERS
  window.handleChatInput = function(id, value) {
    addMessage("user", value);
    sessionStorage.setItem(id, value);
    runStep(currentStepIndex + 1);
  };

  window.submitChatText = function() {
    const step = chatFlow[currentStepIndex];
    let userDisplay = "";

    if (step.inputType === "text-multi") {
      const v1 = document.getElementById(`chat-input-${step.fields[0].id}`).value.trim();
      const v2 = document.getElementById(`chat-input-${step.fields[1].id}`).value.trim();
      if(!v1 || !v2) { alert("Vul alle velden in."); return; }
      sessionStorage.setItem(step.fields[0].id, v1);
      sessionStorage.setItem(step.fields[1].id, v2);
      userDisplay = `${v1} ${v2}`;
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
        sessionStorage.setItem("dob", val); 
        userDisplay = val;
    }

    addMessage("user", userDisplay);
    runStep(currentStepIndex + 1);
  };

  // --- NIEUWE HANDLERS ---

  // Stap 1: Actievoorwaarden Accept
  window.handleTermsAgree = function() {
    addMessage("user", "Ik ga akkoord");
    // Ga door naar de volgende stap (Partners)
    runStep(currentStepIndex + 1);
  };

  // Stap 2: Partner Keuze & Submit
  window.handlePartnerChoice = function(accepted) {
    // Sla keuze op in sessionStorage (belangrijk voor backend!)
    sessionStorage.setItem("sponsorsAccepted", accepted ? "true" : "false");
    
    const text = accepted ? "Ja, prima" : "Nee, liever niet";
    addMessage("user", text);
    
    // Nu pas verzenden
    finalizeSubmission();
  };

  // 6. FINAL SUBMIT
  async function finalizeSubmission() {
    controlsEl.innerHTML = ``; 

    typingEl.style.display = "flex"; scrollToBottom();
    await new Promise(r => setTimeout(r, 800));
    typingEl.style.display = "none";
    
    addMessage("bot", "Dankjewel! Ik stuur je gegevens door. Een momentje... ✨");

    if (window.buildPayload && window.fetchLead) {
        try {
            // ✅ NL Campaign ID (Pas aan als dit anders moet zijn)
            const payload = await window.buildPayload({ 
                cid: "1123", 
                sid: "34", 
                is_shortform: true 
            });
            await window.fetchLead(payload);
            sessionStorage.setItem("shortFormCompleted", "true");
            
            setTimeout(() => {
                if(chatInterface) chatInterface.classList.add("finished");
                setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600);
            }, 2000);

        } catch (e) {
            console.error(e);
            alert("Er ging iets mis.");
        }
    } else {
        // Fallback voor testen zonder backend
        setTimeout(() => {
             if(chatInterface) chatInterface.classList.add("finished");
             setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600);
        }, 1500);
    }
  }

  // Helpers
  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = text;
    historyEl.insertBefore(div, typingEl);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => { historyEl.scrollTop = historyEl.scrollHeight; }, 50);
  }

  function getAllData() {
    return {
        firstname: sessionStorage.getItem("firstname") || "Jij",
        lastname: sessionStorage.getItem("lastname") || ""
    };
  }

  // ✅ VERBETERDE DOB LOGICA (Auto-Jump)
  function initDobMask() {
    const input = document.getElementById("chat-input-dob");
    if(!input) return;
    
    input.addEventListener("input", (e) => {
        const isDelete = e.inputType && e.inputType.includes('delete');
        let v = input.value.replace(/\D/g, ""); 
        
        if (!isDelete) {
            // Dag > 3? -> 0 ervoor (bijv 4 wordt 04)
            if (v.length === 1 && parseInt(v[0]) > 3) v = "0" + v;
            // Maand > 1? -> 0 ervoor (bijv 2 wordt 02)
            if (v.length === 3 && parseInt(v[2]) > 1) v = v.slice(0, 2) + "0" + v[2];
        }

        if (v.length > 8) v = v.slice(0, 8);

        let output = "";
        if (v.length > 4) output = `${v.slice(0, 2)} / ${v.slice(2, 4)} / ${v.slice(4)}`;
        else if (v.length > 2) output = `${v.slice(0, 2)} / ${v.slice(2)}`;
        else output = v;
        
        // Auto slashes toevoegen
        if (!isDelete) {
            if (v.length === 2) output += " / ";
            if (v.length === 4) output += " / ";
        }

        input.value = output;
    });
  }

})();
