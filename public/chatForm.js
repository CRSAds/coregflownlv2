// =============================================================
// 💬 CHAT FORM LOGIC (Julia - Auto Pilot)
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

  // 2. STATE
  let currentStepIndex = 0;
  let hasStarted = false;
  
  const historyEl = document.getElementById("chat-history");
  const controlsEl = document.getElementById("chat-controls");
  const typingEl = document.getElementById("typing-indicator");
  const chatInterface = document.getElementById("chat-interface");

  // 3. INIT (AUTO START)
  function initChat() {
    if(!historyEl || !controlsEl) return;
    
    // Wacht 1.5 seconde en pop dan de chat open
    setTimeout(() => {
        openChat();
    }, 1500);
  }

  function openChat() {
    chatInterface.classList.remove("closed");
    if (!hasStarted) {
      hasStarted = true;
      setTimeout(() => runStep(0), 600); // Start gesprek na animatie
    }
    scrollToBottom();
  }

  function closeChat() {
    chatInterface.classList.add("closed");
  }

  // 4. CORE LOGICA
  async function runStep(index) {
    currentStepIndex = index;
    const step = chatFlow[index];
    
    controlsEl.innerHTML = ""; 
    controlsEl.style.opacity = "0";

    // Loop door berichten
    for (const textTemplate of step.botTexts) {
      typingEl.style.display = "flex"; 
      scrollToBottom();
      
      await new Promise(r => setTimeout(r, 1100)); // Natuurlijke typ-tijd
      
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
    
    // ... (Zelfde input logic als V7 voor buttons, text, email, dob) ...
    if (step.inputType === "buttons") {
      html = `<div class="chat-btn-group">`;
      step.options.forEach(opt => {
        html += `<button class="chat-option-btn" onclick="window.handleChatInput('${step.id}', '${opt.value}')">${opt.label}</button>`;
      });
      html += `</div>`;
    } 
    else if (step.inputType === "text-multi") {
      step.fields.forEach(f => {
        html += `<input type="text" id="chat-input-${f.id}" class="chat-input-text" placeholder="${f.placeholder}" style="margin-bottom:10px;">`;
      });
      html += `<button class="cta-primary" onclick="window.submitChatText()" style="margin-top:5px;">Volgende</button>`;
    }
    else if (step.inputType === "dob") {
       html = `
        <div style="display:flex; gap:10px; width:100%;">
          <input type="tel" inputmode="numeric" id="chat-input-dob" class="chat-input-text" placeholder="DD / MM / JJJJ" autocomplete="bday" maxlength="14"> 
          <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
        </div>`;
    }
    else if (step.inputType === "email") {
        html = `
          <div style="display:flex; gap:10px; width:100%;">
            <input type="email" id="chat-input-${step.fieldId}" class="chat-input-text" placeholder="${step.placeholder}" autocomplete="email">
            <button class="chat-submit-btn" onclick="window.submitChatText()">➤</button>
          </div>`;
    }
    else if (step.inputType === "action") {
      html = `
        <button class="cta-primary" onclick="window.handleFinalSubmit()">${step.buttonText}</button>
        <div style="font-size:12px; color:#999; text-align:center; margin-top:10px; line-height:1.4;">${step.subText}</div>
      `;
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

  // 5. INPUT HANDLERS
  window.handleChatInput = function(id, value) {
    addMessage("user", value);
    sessionStorage.setItem(id, value);
    runStep(currentStepIndex + 1);
  };

  window.submitChatText = function() {
    const step = chatFlow[currentStepIndex];
    let userDisplay = "";

    // ... (Validatie logica blijft gelijk aan V7) ...
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

  // 6. FINAL SUBMIT & AUTO CLOSE
  window.handleFinalSubmit = async function() {
    addMessage("user", "Ja, ik ga akkoord! 🚀");
    controlsEl.innerHTML = ``; // Geen knoppen meer

    // Julia bedankt
    typingEl.style.display = "flex"; scrollToBottom();
    await new Promise(r => setTimeout(r, 800));
    typingEl.style.display = "none";
    addMessage("bot", "Dankjewel! Ik stuur je gegevens door. Een momentje... ✨");

    if (window.buildPayload && window.fetchLead) {
        try {
            const payload = await window.buildPayload({ 
                cid: "1123", 
                sid: "34", 
                is_shortform: true 
            });
            await window.fetchLead(payload);
            sessionStorage.setItem("shortFormCompleted", "true");
            
            // Wacht 2 seconden, sluit chat, en ga door
            setTimeout(() => {
                closeChat(); // Klapt in elkaar
                
                // Wacht op de 'inklappen' animatie (500ms) voordat we van slide wisselen
                setTimeout(() => {
                    document.dispatchEvent(new Event("shortFormSubmitted"));
                }, 600);
            }, 2000);

        } catch (e) {
            console.error(e);
            alert("Er ging iets mis.");
        }
    } else {
        setTimeout(() => {
             closeChat();
             setTimeout(() => document.dispatchEvent(new Event("shortFormSubmitted")), 600);
        }, 1500);
    }
  };

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

  function initDobMask() {
    const input = document.getElementById("chat-input-dob");
    if(!input) return;
    input.addEventListener("input", (e) => {
        let v = input.value.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        if (v.length > 4) input.value = `${v.slice(0, 2)} / ${v.slice(2, 4)} / ${v.slice(4)}`;
        else if (v.length > 2) input.value = `${v.slice(0, 2)} / ${v.slice(2)}`;
        else input.value = v;
    });
  }

})();
