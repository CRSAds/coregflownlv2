// =============================================================
// 💬 CHAT FORM LOGIC (Julia - Premium V4)
// =============================================================

(function() {
  // Wacht tot de pagina geladen is
  document.addEventListener("DOMContentLoaded", initChat);

  // 1. CONFIGURATIE & SCRIPT (Pas hier je teksten aan)
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
        (data) => `Aangenaam, ${data.firstname}!`, // Dynamische naam
        "Even checken of je 18+ bent. Wanneer ben je jarig? 🎂"
      ],
      inputType: "text",
      fieldId: "dob",
      placeholder: "DD / MM / JJJJ",
      validation: "dob" 
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
        "Om deze actie mogelijk te maken, werken we samen met partners.",
        "Ga je akkoord met de voorwaarden en dat zij je mogen benaderen?"
      ],
      inputType: "action",
      buttonText: "Ja, ik ga akkoord & verder!",
      subText: "Door te klikken ga je akkoord met de <a href='#' style='color:#888; text-decoration:underline;'>actievoorwaarden</a>."
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
    if(!historyEl || !controlsEl) return; 
    
    // Check of we al een keer gedaan hebben (optioneel)
    // if(sessionStorage.getItem("shortFormCompleted")) ...

    runStep(0);
  }

  // 4. CORE LOGICA
  // -----------------------------------------------------------
  async function runStep(index) {
    currentStepIndex = index;
    const step = chatFlow[index];
    
    // Verberg inputs tijdens het typen van Julia
    controlsEl.innerHTML = ""; 
    controlsEl.style.opacity = "0";

    // Loop door de berichtjes van Julia
    for (const textTemplate of step.botTexts) {
      await showTyping(800); // 800ms typ-vertraging voor realisme
      
      // Check of tekst een functie is (voor dynamische data zoals naam)
      let text = typeof textTemplate === "function" 
        ? textTemplate(getAllData()) 
        : textTemplate;
        
      addMessage("bot", text);
    }

    // Toon de juiste inputs
    renderControls(step);
    
    // Fade-in effect voor controls
    controlsEl.style.transition = "opacity 0.3s";
    controlsEl.style.opacity = "1";
    
    scrollToBottom();
  }

  function renderControls(step) {
    let html = "";

    // A. KNOPPEN (Geslacht)
    if (step.inputType === "buttons") {
      html = `<div class="chat-btn-group">`;
      step.options.forEach(opt => {
        html += `<button class="chat-option-btn" onclick="window.handleChatInput('${step.id}', '${opt.value}')">${opt.label}</button>`;
      });
      html += `</div>`;
    } 
    
    // B. ENKEL TEKSTVELD (DOB)
    else if (step.inputType === "text") {
      html = `
        <div style="display:flex; gap:10px; width:100%;">
          <input type="text" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="off">
          <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
        </div>`;
    }

    // C. EMAIL
    else if (step.inputType === "email") {
        html = `
          <div style="display:flex; gap:10px; width:100%;">
            <input type="email" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="email">
            <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
          </div>`;
      }

    // D. MULTI TEXT (Naam)
    else if (step.inputType === "text-multi") {
      step.fields.forEach(f => {
        html += `<input type="text" id="chat-input-${f.id}" class="chat-input-text" placeholder="${f.placeholder}" style="margin-bottom:10px;">`;
      });
      html += `<button class="cta-primary" onclick="window.submitChatText()" style="margin-top:5px;">Volgende</button>`;
    }

    // E. ACTIE KNOP (Opt-in)
    else if (step.inputType === "action") {
      html = `
        <button class="cta-primary" onclick="window.handleFinalSubmit()">${step.buttonText}</button>
        <div style="font-size:12px; color:#999; text-align:center; margin-top:10px; line-height:1.4;">${step.subText}</div>
      `;
    }

    controlsEl.innerHTML = html;
    
    // Focus op eerste input (UX)
    const firstInput = controlsEl.querySelector("input");
    if(firstInput) {
        // Kleine timeout voor mobiel toetsenbord behavior
        setTimeout(() => firstInput.focus(), 100);
    }

    // Enter key support
    const inputs = controlsEl.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("keydown", (e) => {
            if(e.key === "Enter") window.submitChatText();
        });
    });

    // Speciale handler voor DOB maskering
    if (step.id === "dob") initDobMask();
  }

  // 5. INPUT HANDLERS (Globaal beschikbaar maken)
  // -----------------------------------------------------------
  
  // Handler voor knoppen
  window.handleChatInput = function(id, value) {
    addMessage("user", value);
    sessionStorage.setItem(id, value); // Opslaan
    runStep(currentStepIndex + 1);
  };

  // Handler voor tekstvelden
  window.submitChatText = function() {
    const step = chatFlow[currentStepIndex];
    let userDisplay = "";

    // Validatie & Opslaan Logic
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
        // Simpele regex check
        if(!val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { alert("Vul een geldig e-mailadres in."); return; }
        sessionStorage.setItem("email", val);
        userDisplay = val;
    }

    else if (step.id === "dob") {
        const val = document.getElementById(`chat-input-dob`).value.trim();
        if(val.length < 10) { alert("Vul je volledige geboortedatum in (DD/MM/JJJJ)."); return; }
        sessionStorage.setItem("dob", val); 
        userDisplay = val;
    }

    // Toon antwoord en ga door
    addMessage("user", userDisplay);
    runStep(currentStepIndex + 1);
  };

  // De Grote Finale: Submit naar Databowl/Directus
  window.handleFinalSubmit = async function() {
    addMessage("user", "Ja, ik ga akkoord! 🚀");
    controlsEl.innerHTML = `<div style="text-align:center; color:#888; padding:20px; font-style:italic;">Een ogenblik...</div>`;

    if (window.buildPayload && window.fetchLead) {
        try {
            // 1. Bouw Payload (Gebruikt formSubmit.js logica)
            const payload = await window.buildPayload({ 
                // ⚠️ LET OP: Pas deze ID's aan naar je NL campagne als dat nodig is!
                // Voor nu staan ze op de UK ID's die je eerder noemde.
                cid: "1123", 
                sid: "34", 
                is_shortform: true 
            });

            console.log("🚀 Chat submitting payload:", payload);

            // 2. Verstuur
            await window.fetchLead(payload);
            
            // 3. Zet vlaggen
            sessionStorage.setItem("shortFormCompleted", "true");
            
            // 4. Trigger Event (voor initFlow-lite.js navigatie)
            // Wacht heel even zodat de user de "Een ogenblik..." ziet
            setTimeout(() => {
                document.dispatchEvent(new Event("shortFormSubmitted"));
            }, 800);

        } catch (e) {
            console.error("Chat submit error:", e);
            alert("Er ging iets mis met versturen. Probeer het opnieuw.");
            controlsEl.innerHTML = `<button class="cta-primary" onclick="window.handleFinalSubmit()">Probeer opnieuw</button>`;
        }
    } else {
        console.error("CRITICAL: formSubmit.js functies niet gevonden!");
        // Fallback voor testen zonder backend
        setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 1000);
    }
  };

  // 6. HELPERS
  // -----------------------------------------------------------
  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = text;
    
    // Voeg toe VOOR de typ-indicator
    // (Zorg dat #typing-indicator BINNEN #chat-history staat in je HTML!)
    historyEl.insertBefore(div, typingEl);
    scrollToBottom();
  }

  function showTyping(duration) {
    return new Promise(resolve => {
      typingEl.style.display = "flex"; // of "block" afhankelijk van CSS
      scrollToBottom();
      setTimeout(() => {
        typingEl.style.display = "none";
        resolve();
      }, duration);
    });
  }

  function scrollToBottom() {
    // Scroll soepel naar beneden
    setTimeout(() => {
        historyEl.scrollTop = historyEl.scrollHeight;
    }, 50);
  }

  function getAllData() {
    return {
        firstname: sessionStorage.getItem("firstname") || "Jij",
        lastname: sessionStorage.getItem("lastname") || ""
    };
  }

  // DOB Masker (DD / MM / JJJJ) - Auto slash
  function initDobMask() {
    const input = document.getElementById("chat-input-dob");
    if(!input) return;
    
    input.addEventListener("input", (e) => {
        // Verwijder alles behalve cijfers
        let v = input.value.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        
        // Formatteer
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
