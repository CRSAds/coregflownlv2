// =============================================================
// 💬 CHAT FORM LOGIC (Julia)
// =============================================================

(function() {
  // Wacht tot de pagina geladen is
  document.addEventListener("DOMContentLoaded", initChat);

  // 1. CONFIGURATIE & SCRIPT
  // -----------------------------------------------------------
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
      inputType: "text-multi", // Voornaam + Achternaam
      fields: [
        { id: "firstname", placeholder: "Voornaam" },
        { id: "lastname", placeholder: "Achternaam" }
      ]
    },
    {
      id: "dob",
      botTexts: [
        (data) => `Aangenaam, ${data.firstname}!`, // Dynamische tekst
        "Even checken of je 18+ bent. Wanneer ben je jarig? 🎂"
      ],
      inputType: "text",
      fieldId: "dob",
      placeholder: "DD / MM / JJJJ",
      validation: "dob" // Speciale validatie
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
    {
      id: "optin",
      botTexts: [
        "Bijna klaar! 🚀",
        "Om deze actie mogelijk te maken, werken we samen met partners. Ga je akkoord met de voorwaarden en dat zij je mogen benaderen?"
      ],
      inputType: "action",
      buttonText: "Ja, ik ga akkoord & verder!",
      subText: "Door te klikken ga je akkoord met de <a href='#' id='open-actievoorwaarden-inline'>voorwaarden</a>."
    }
  ];

  // 2. STATE VARIABELEN
  // -----------------------------------------------------------
  let currentStepIndex = 0;
  const historyEl = document.getElementById("chat-history");
  const controlsEl = document.getElementById("chat-controls");
  const typingEl = document.getElementById("typing-indicator");

  // 3. INIT FUNCTIE
  // -----------------------------------------------------------
  function initChat() {
    if(!historyEl) return; // Veiligheidje
    runStep(0);
  }

  // 4. CORE LOGICA
  // -----------------------------------------------------------
  async function runStep(index) {
    currentStepIndex = index;
    const step = chatFlow[index];
    controlsEl.innerHTML = ""; // Inputs weghalen tijdens praten

    // Loop door de berichtjes van Julia
    for (const textTemplate of step.botTexts) {
      await showTyping(600); // Korte typ-vertraging voor realisme
      
      // Check of tekst een functie is (voor dynamische naam)
      let text = typeof textTemplate === "function" 
        ? textTemplate(getAllData()) 
        : textTemplate;
        
      addMessage("bot", text);
    }

    // Toon de juiste inputs
    renderControls(step);
    
    // Auto-scroll naar beneden
    scrollToBottom();
  }

  function renderControls(step) {
    let html = "";

    if (step.inputType === "buttons") {
      html = `<div class="chat-btn-group">`;
      step.options.forEach(opt => {
        html += `<button class="chat-option-btn" onclick="window.handleChatInput('${step.id}', '${opt.value}')">${opt.label}</button>`;
      });
      html += `</div>`;
    } 
    
    else if (step.inputType === "text") {
      html = `
        <div style="display:flex; gap:8px;">
          <input type="text" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}">
          <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
        </div>`;
    }

    else if (step.inputType === "email") {
        html = `
          <div style="display:flex; gap:8px;">
            <input type="email" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}">
            <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
          </div>`;
      }

    else if (step.inputType === "text-multi") {
      step.fields.forEach(f => {
        html += `<input type="text" id="chat-input-${f.id}" class="chat-input-text" placeholder="${f.placeholder}" style="margin-bottom:8px;">`;
      });
      html += `<button class="cta-primary" onclick="window.submitChatText()" style="margin-top:4px;">Volgende</button>`;
    }

    else if (step.inputType === "action") {
      html = `
        <button class="cta-primary" onclick="window.handleFinalSubmit()">${step.buttonText}</button>
        <div style="font-size:11px; color:#888; text-align:center; margin-top:8px;">${step.subText}</div>
      `;
    }

    controlsEl.innerHTML = html;
    
    // Focus op eerste input (UX)
    const firstInput = controlsEl.querySelector("input");
    if(firstInput) firstInput.focus();

    // Enter key support
    controlsEl.addEventListener("keydown", (e) => {
        if(e.key === "Enter") window.submitChatText();
    });

    // Speciale handler voor DOB maskering
    if (step.id === "dob") initDobMask();
  }

  // 5. INPUT HANDLERS (Globaal beschikbaar maken)
  // -----------------------------------------------------------
  
  // Klik op een knop (Geslacht)
  window.handleChatInput = function(id, value) {
    // 1. Toon wat gebruiker koos
    addMessage("user", value);
    
    // 2. Sla op
    sessionStorage.setItem(id, value); // bijv 'gender' -> 'Man'

    // 3. Volgende stap
    runStep(currentStepIndex + 1);
  };

  // Klik op verzenden (Tekstvelden)
  window.submitChatText = function() {
    const step = chatFlow[currentStepIndex];
    let isValid = true;
    let userDisplay = "";

    // Validatie & Opslaan
    if (step.inputType === "text-multi") {
      const v1 = document.getElementById(`chat-input-${step.fields[0].id}`).value.trim();
      const v2 = document.getElementById(`chat-input-${step.fields[1].id}`).value.trim();
      
      if(!v1 || !v2) { alert("Vul alsjeblieft beide velden in."); return; }
      
      sessionStorage.setItem(step.fields[0].id, v1);
      sessionStorage.setItem(step.fields[1].id, v2);
      userDisplay = `${v1} ${v2}`;
    } 
    
    else if (step.id === "email") {
        const val = document.getElementById(`chat-input-email`).value.trim();
        if(!val.includes("@") || !val.includes(".")) { alert("Vul een geldig e-mailadres in."); return; }
        sessionStorage.setItem("email", val);
        userDisplay = val;
    }

    else if (step.id === "dob") {
        const val = document.getElementById(`chat-input-dob`).value.trim();
        // Simpele check op lengte (masker doet de rest)
        if(val.length < 10) { alert("Vul je volledige geboortedatum in."); return; }
        // Opslaan voor formSubmit.js (die verwacht 'dob' in session)
        sessionStorage.setItem("dob", val); 
        userDisplay = val;
    }

    // 1. Toon antwoord
    addMessage("user", userDisplay);

    // 2. Volgende stap
    runStep(currentStepIndex + 1);
  };

 // De Grote Finale in chatForm.js
  window.handleFinalSubmit = async function() {
    addMessage("user", "Ja, ik ga akkoord! 🚀");
    controlsEl.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">Een ogenblik...</div>`;

    if (window.buildPayload && window.fetchLead) {
        try {
            const payload = await window.buildPayload({ 
                cid: "925", // Check of dit je juiste Shortform CID is!
                sid: "34", 
                is_shortform: true 
            });

            // Fire & Forget (of await als je zeker wilt weten dat het aankomt)
            window.fetchLead(payload);
            
            sessionStorage.setItem("shortFormCompleted", "true");
            
            // Wacht heel even voor UX (anders flitst het weg)
            setTimeout(() => {
                console.log("🚀 Chat completed -> Triggering flow switch");
                document.dispatchEvent(new Event("shortFormSubmitted"));
            }, 800);

        } catch (e) {
            console.error("Chat submit error:", e);
            alert("Er ging iets mis. Probeer het opnieuw.");
        }
    } else {
        console.error("CRITICAL: formSubmit.js functies niet gevonden!");
        // Noodoplossing: stuur ze toch door
        document.dispatchEvent(new Event("shortFormSubmitted"));
    }
  };

  // 6. HELPERS
  // -----------------------------------------------------------
  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = text;
    
    // Voeg toe VOOR de typ-indicator
    historyEl.insertBefore(div, typingEl);
    scrollToBottom();
  }

  function showTyping(duration) {
    return new Promise(resolve => {
      typingEl.style.display = "flex";
      scrollToBottom();
      setTimeout(() => {
        typingEl.style.display = "none";
        resolve();
      }, duration);
    });
  }

  function scrollToBottom() {
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function getAllData() {
    return {
        firstname: sessionStorage.getItem("firstname") || "Vreemdeling",
        lastname: sessionStorage.getItem("lastname") || ""
    };
  }

  // Simpele DOB Masker (DD / MM / JJJJ)
  function initDobMask() {
    const input = document.getElementById("chat-input-dob");
    if(!input) return;
    
    input.addEventListener("input", (e) => {
        let v = input.value.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        
        if (v.length > 4) {
            input.value = `${v.slice(0, 2)} / ${v.slice(2, 4)} / ${v.slice(4)}`;
        } else if (v.length > 2) {
            input.value = `${v.slice(0, 2)} / ${v.slice(2)}`;
        } else {
            input.value = v;
        }
    });
  }

})();
