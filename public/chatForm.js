// =============================================================
// 💬 CHAT FORM LOGIC (Julia - V9 Embedded & Smooth)
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
      subText: "Door te klikken ga je akkoord met de <button type='button' id='open-actievoorwaarden-inline' style='background:none; border:none; padding:0; color:#888; text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;'>actievoorwaarden</button>."    }
  ];

  // 2. STATE
  let currentStepIndex = 0;
  
  const historyEl = document.getElementById("chat-history");
  const controlsEl = document.getElementById("chat-controls");
  const typingEl = document.getElementById("typing-indicator");
  const chatInterface = document.getElementById("chat-interface");

  // 3. INIT (DIRECT START)
  function initChat() {
    if(!historyEl || !controlsEl) return;
    
    // Voeg 'visible' class toe na een mini-timeout voor de slide-up animatie
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

    // Loop door berichten
    for (const textTemplate of step.botTexts) {
      typingEl.style.display = "flex"; 
      scrollToBottom();
      
      // Natuurlijke typ-tijd
      await new Promise(r => setTimeout(r, 1000)); 
      
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

  // 6. FINAL SUBMIT & EXIT
  window.handleFinalSubmit = async function() {
    addMessage("user", "Ja, ik ga akkoord! 🚀");
    controlsEl.innerHTML = ``; 

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
            
            // Wacht 2 sec, fade out, en ga door
            setTimeout(() => {
                if(chatInterface) chatInterface.classList.add("finished"); // Fade out
                
                setTimeout(() => {
                    document.dispatchEvent(new Event("shortFormSubmitted"));
                }, 600); // Wacht op fade out
            }, 2000);

        } catch (e) {
            console.error(e);
            alert("Er ging iets mis.");
        }
    } else {
        setTimeout(() => {
             if(chatInterface) chatInterface.classList.add("finished");
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
        // Check of de gebruiker aan het weghalen is (backspace), dan geen auto-jump doen
        const isDelete = e.inputType && e.inputType.includes('delete');
        
        // Haal alle niet-cijfers weg
        let v = input.value.replace(/\D/g, ""); 
        
        if (!isDelete) {
            // 1. DAG CHECK: Als 1e cijfer > 3 (bijv. 4, 5...9), dan bedoelt men 04, 05 etc.
            if (v.length === 1 && parseInt(v[0]) > 3) {
                v = "0" + v;
            }
            
            // 2. MAAND CHECK: Als 3e cijfer (1e van maand) > 1 (bijv. 2...9), dan bedoelt men 02, 03 etc.
            // We kijken hier naar v[2] omdat v[0] en v[1] de dag zijn.
            if (v.length === 3 && parseInt(v[2]) > 1) {
                v = v.slice(0, 2) + "0" + v[2];
            }
        }

        // Maximaal 8 cijfers (DDMMJJJJ)
        if (v.length > 8) v = v.slice(0, 8);

        // Opbouwen van de weergave met slashes
        let output = "";
        if (v.length > 4) {
            output = `${v.slice(0, 2)} / ${v.slice(2, 4)} / ${v.slice(4)}`;
        } else if (v.length > 2) {
            output = `${v.slice(0, 2)} / ${v.slice(2)}`;
        } else {
            output = v;
        }
        
        // Automatisch slash toevoegen als een blokje 'klaar' is
        if (!isDelete) {
            if (v.length === 2) output += " / ";
            if (v.length === 4) output += " / ";
        }

        input.value = output;
    });
  }

})();
