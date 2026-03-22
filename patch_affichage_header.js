const fs = require('fs');

const pathHTML = 'test/affichage.html';
if (fs.existsSync(pathHTML)) {
    let content = fs.readFileSync(pathHTML, 'utf8');
    const oldHeader = `    <header>
        <div class="logo">
            <span class="material-icons">sports_tennis</span>
            <h1>Tournoi Badminton</h1>
        </div>
        <div class="timer-container">
            <span class="material-icons">timer</span>
            <span class="timer-display" id="projector-timer">00:00</span>
        </div>
        <div class="theme-toggle">
            <button class="btn-icon" id="theme-btn" title="Changer le thème">
                <span class="material-icons">brightness_4</span>
            </button>
        </div>
    </header>`;
    
    // Oh wait, the header is in the HTML.
}

