const fs = require('fs');

// PATCH 2: Affichage UI (timer status, byes grouping, rank medals, compact tables)

const pathAffichage = 'test/page/AffichagePage.js';
let contentAffichage = fs.readFileSync(pathAffichage, 'utf8');

// 1. Byes grouping HTML
const oldByesRender = `            <div class="byes-list">
                \${data.byes && data.byes.length ? data.byes.map(b => \`<div class="bye-badge">\${b}</div>\`).join('') : '<div class="bye-badge empty">Aucun</div>'}
            </div>`;

const newByesRender = `            <div class="byes-list" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                \${data.byes && data.byes.length ? data.byes.map(b => {
                    if (typeof b === 'object' && b.poule) {
                        return \`
                        <div class="poule-byes" style="background: var(--surface-color); border: 2px solid var(--poule-\${b.color}); border-radius: var(--radius-md); padding: 5px 10px; min-width: 150px;">
                            <div style="font-weight: bold; color: var(--poule-\${b.color}); border-bottom: 1px solid var(--border-color); margin-bottom: 5px; text-align: center;">\${b.poule}</div>
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                \${b.joueurs.map(j => \`<div class="bye-badge" style="background: var(--bg-color); color: var(--text-color); margin: 0; text-align: center;">\${j}</div>\`).join('')}
                            </div>
                        </div>\`;
                    }
                    return \`<div class="bye-badge" style="background: var(--primary-color);">\${b}</div>\`;
                }).join('') : '<div class="bye-badge empty">Aucun joueur en attente</div>'}
            </div>`;

contentAffichage = contentAffichage.replace(oldByesRender, newByesRender);


// 2. Classement Medals and logic
const oldClassementMethod = `    buildClassementBloc1HTML(stats, isDuo) {
        if (!stats || stats.length === 0) {
            return '<div class="empty-state">Aucune donnée disponible</div>';
        }

        let html = \`
            <table class="table-stats">
                <thead>
                    <tr>
                        <th class="col-rank">#</th>
                        <th>\${isDuo ? 'Équipe' : 'Joueur'}</th>
                        <th class="col-pts" title="Points (Victoire=3, Nul=2, Défaite=1)">Pts</th>
                        <th class="col-diff" title="Différence de points (Pour - Contre)">Diff</th>
                    </tr>
                </thead>
                <tbody>
        \`;

        stats.forEach((row, index) => {
            let name = isDuo ? 
                \`\${row.joueur1.prenom} \${row.joueur1.nom ? row.joueur1.nom.charAt(0) + '.' : ''} & \${row.joueur2.prenom} \${row.joueur2.nom ? row.joueur2.nom.charAt(0) + '.' : ''}\` : 
                \`\${row.joueur.prenom} \${row.joueur.nom ? row.joueur.nom.charAt(0) + '.' : ''}\`;

            html += \`
                <tr>
                    <td class="col-rank">\${index + 1}</td>
                    <td class="player-name">\${name}</td>
                    <td class="col-pts">\${row.points}</td>
                    <td class="col-diff \${row.difference > 0 ? 'positive' : row.difference < 0 ? 'negative' : ''}">\${row.difference > 0 ? '+' : ''}\${row.difference}</td>
                </tr>
            \`;
        });

        html += \`</tbody></table>\`;
        return html;
    }`;

const newClassementMethod = `    buildClassementBloc1HTML(stats, isDuo) {
        if (!stats || stats.length === 0) {
            return '<div class="empty-state">Aucune donnée disponible</div>';
        }

        let html = \`
            <table class="table-stats">
                <thead>
                    <tr>
                        <th class="col-rank">Rang</th>
                        <th>\${isDuo ? 'Équipe' : 'Joueur'}</th>
                        <th class="col-pts" title="Points (Victoire=3, Nul=2, Défaite=1)">Pts</th>
                        <th class="col-diff" title="Différence de points (Pour - Contre)">Diff</th>
                    </tr>
                </thead>
                <tbody>
        \`;

        stats.forEach((row, index) => {
            let name = isDuo ? 
                \`\${row.joueur1.prenom} \${row.joueur1.nom ? row.joueur1.nom.charAt(0) + '.' : ''} & \${row.joueur2.prenom} \${row.joueur2.nom ? row.joueur2.nom.charAt(0) + '.' : ''}\` : 
                \`\${row.joueur.prenom} \${row.joueur.nom ? row.joueur.nom.charAt(0) + '.' : ''}\`;

            let rankDisplay = index + 1;
            let rankClass = "col-rank";
            if (index === 0) { rankDisplay = "🥇"; rankClass += " rank-1"; }
            else if (index === 1) { rankDisplay = "🥈"; rankClass += " rank-2"; }
            else if (index === 2) { rankDisplay = "🥉"; rankClass += " rank-3"; }

            html += \`
                <tr>
                    <td class="\${rankClass}" style="\${index < 3 ? 'font-size: 1.5em;' : ''}">\${rankDisplay}</td>
                    <td class="player-name">\${name}</td>
                    <td class="col-pts">\${row.points}</td>
                    <td class="col-diff \${row.difference > 0 ? 'positive' : row.difference < 0 ? 'negative' : ''}">\${row.difference > 0 ? '+' : ''}\${row.difference}</td>
                </tr>
            \`;
        });

        html += \`</tbody></table>\`;
        return html;
    }`;

contentAffichage = contentAffichage.replace(oldClassementMethod, newClassementMethod);

// Add Timer status in TournoiPage so it can be pushed
const pathTournoi = 'test/page/TournoiPage.js';
let contentTournoi = fs.readFileSync(pathTournoi, 'utf8');

const oldTimerExport = `            timer: {
                display: document.getElementById('timer-display') ? document.getElementById('timer-display').textContent : '00:00'
            },`;
            
const newTimerExport = `            timer: {
                display: document.getElementById('timer-display') ? document.getElementById('timer-display').textContent : '00:00',
                running: document.querySelector('.timer-controls .play-btn.hidden') !== null,
                paused: document.querySelector('.timer-controls .pause-btn:not(.hidden)') !== null
            },`;

contentTournoi = contentTournoi.replace(oldTimerExport, newTimerExport);

fs.writeFileSync(pathAffichage, contentAffichage);
fs.writeFileSync(pathTournoi, contentTournoi);


// 3. CSS Updates for AffichagePage.css
const pathCSS = 'test/css/AffichagePage.css';
let contentCSS = fs.readFileSync(pathCSS, 'utf8');

const cssAdditions = `
/* Timer Adjustments */
.timer-container {
    background: var(--surface-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
}
.timer-container .timer-display {
    font-size: 3.5rem !important; /* Make it significantly larger */
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--primary-color);
    letter-spacing: 2px;
}
.timer-status-icon {
    font-size: 2.5rem;
}
.timer-status-icon.running { color: #10b981; }
.timer-status-icon.paused { color: #f59e0b; }
.timer-status-icon.stopped { color: #ef4444; }

/* Table Compact Adjustments */
.table-stats th, .table-stats td {
    padding: 2px 8px !important; /* Extremely compact rows to fit more data without scrolling */
    font-size: 0.95rem;          /* Slightly smaller font to save space */
}

/* Make sure header allows grid display properly */
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--surface-color);
    border-bottom: 2px solid var(--border-color);
}
`;

contentCSS += cssAdditions;
fs.writeFileSync(pathCSS, contentCSS);
