const fs = require('fs');
const path = 'test/page/AffichagePage.js';
let content = fs.readFileSync(path, 'utf8');

const oldHeader = `    buildHeaderHTML() {
        return \`
            <div class="logo">
                <span class="material-icons">sports_tennis</span>
                <h1>Tournoi Badminton</h1>
            </div>
            <div class="timer-container">
                <span class="material-icons">timer</span>
                <span class="timer-display">\${this.state.tournoi?.timer?.display || '00:00'}</span>
            </div>
            <div class="theme-toggle">
                <button class="btn-icon" id="theme-btn" onclick="document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark'">
                    <span class="material-icons">brightness_4</span>
                </button>
            </div>
        \`;
    }`;

const newHeader = `    buildHeaderHTML() {
        const t = this.state.tournoi?.timer || {};
        let statusIcon = 'stop_circle';
        let statusClass = 'stopped';
        
        if (t.running) {
            statusIcon = 'play_circle';
            statusClass = 'running';
        } else if (t.paused) {
            statusIcon = 'pause_circle';
            statusClass = 'paused';
        }
    
        return \`
            <div class="logo">
                <span class="material-icons">sports_tennis</span>
                <h1>Tournoi Badminton</h1>
            </div>
            <div class="timer-container">
                <span class="material-icons timer-status-icon \${statusClass}">\${statusIcon}</span>
                <span class="timer-display">\${t.display || '00:00'}</span>
            </div>
            <div class="theme-toggle">
                <button class="btn-icon" id="theme-btn" onclick="document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark'" title="Changer le thème">
                    <span class="material-icons">brightness_4</span>
                </button>
            </div>
        \`;
    }`;
    
content = content.replace(oldHeader, newHeader);
fs.writeFileSync(path, content);
