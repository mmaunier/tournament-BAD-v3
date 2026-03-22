const fs = require('fs');

const pathAff = 'test/page/AffichagePage.js';
let content = fs.readFileSync(pathAff, 'utf8');

const oldHeader = `        this.container.innerHTML = \`
            <div class="header-band">
                <h1 id="aff-title">En attente de connexion...</h1>
                <div>
                   <span id="aff-timer" style="margin-right:20px; font-weight:bold; font-size:2.5vh; color:#e74c3c;"></span>
                   <button class="btn-theme" id="btn-toggle-theme">🎨 Inverser Thème</button>
                </div>
            </div>
            <div class="content-area" id="aff-content"></div>
        \`;`;

const newHeader = `        this.container.innerHTML = \`
            <div class="header-band" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5vh 2vw; background: var(--surface-bg); border-bottom: 2px solid var(--border-color); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 id="aff-title" style="margin: 0; font-size: 3vh; color: var(--text-color);">En attente de connexion...</h1>
                
                <div class="timer-container" style="display: flex; align-items: center; background: var(--bg-color); border: 2px solid #e74c3c; padding: 1vh 2vw; border-radius: 1vh; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);">
                    <span id="aff-timer-icon" style="font-size: 3.5vh; margin-right: 1vw;">⏱</span>
                    <span id="aff-timer" style="font-family: monospace; font-weight: 900; font-size: 4.5vh; color: #e74c3c; letter-spacing: 0.2vw;">00:00</span>
                </div>

                <div>
                   <button class="btn-theme" id="btn-toggle-theme" style="padding: 1vh 1vw; font-size: 1.5vh; border-radius: 0.5vh; cursor: pointer;">🎨 Inverser Thème</button>
                </div>
            </div>
            <div class="content-area" id="aff-content"></div>
        \`;`;


const oldTimerSync = `        if (this.data.timer) {
            timerEl.textContent = "⏱ " + this.data.timer.display;
        } else {
            timerEl.textContent = "";
        }`;

const newTimerSync = `        const timerIconEl = this.container.querySelector('#aff-timer-icon');
        if (this.data.timer) {
            timerEl.textContent = this.data.timer.display;
            if (this.data.timer.running) {
                timerIconEl.textContent = "▶️";
                timerIconEl.style.color = "#2ecc71";
                timerEl.style.color = "#2ecc71";
                timerEl.parentElement.style.borderColor = "#2ecc71";
            } else if (this.data.timer.paused) {
                timerIconEl.textContent = "⏸️";
                timerIconEl.style.color = "#f1c40f";
                timerEl.style.color = "#f1c40f";
                timerEl.parentElement.style.borderColor = "#f1c40f";
            } else {
                timerIconEl.textContent = "⏹️";
                timerIconEl.style.color = "#e74c3c";
                timerEl.style.color = "#e74c3c";
                timerEl.parentElement.style.borderColor = "#e74c3c";
            }
        } else {
            timerEl.textContent = "00:00";
            timerIconEl.textContent = "⏹️";
        }`;


content = content.replace(oldHeader, newHeader);
content = content.replace(oldTimerSync, newTimerSync);

fs.writeFileSync(pathAff, content);

