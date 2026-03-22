const fs = require('fs');

const pathAff = 'js/pages/AffichagePage.js';
let content = fs.readFileSync(pathAff, 'utf8');

// The timer card is rendered in renderTimerCard
// We need to make the timer bigger in CSS.
// We also need to group byes.

const oldRenderAttente = `    renderJoueursAttente(container) {
        if (!this.joueursAttente || this.joueursAttente.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucun joueur en attente</div>';
            return;
        }

        const grid = UI.createElement('div', { className: 'attente-grid' });
        
        this.joueursAttente.forEach(joueur => {
            const badge = UI.createElement('div', { 
                className: \`attente-badge theme-\${joueur.theme || 'blue'}\`,
                text: \`\${joueur.prenom} \${joueur.nom ? joueur.nom.charAt(0) + '.' : ''}\`
            });
            grid.appendChild(badge);
        });

        container.appendChild(grid);
    }`;

const newRenderAttente = `    renderJoueursAttente(container) {
        if (!this.joueursAttente || this.joueursAttente.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucun joueur en attente</div>';
            return;
        }

        const grid = UI.createElement('div', { className: 'attente-grid' });
        
        // Group by poule
        const byPoule = {};
        this.joueursAttente.forEach(joueur => {
            const p = joueur.poule || 'Sans Poule';
            if (!byPoule[p]) byPoule[p] = [];
            byPoule[p].push(joueur);
        });
        
        Object.keys(byPoule).forEach(pouleName => {
            const pouleGroup = UI.createElement('div', { className: 'attente-poule-group', style: 'background: var(--bg-card); padding: 5px; border-radius: 5px; border: 2px solid var(--primary-color); display: flex; flex-direction: column; gap: 5px; min-width: 120px;' });
            
            const pTitle = UI.createElement('div', { className: 'attente-poule-title', text: pouleName, style: 'text-align: center; font-weight: bold; border-bottom: 1px solid var(--border-color); color: var(--primary-color);' });
            pouleGroup.appendChild(pTitle);
            
            byPoule[pouleName].forEach(joueur => {
                const badge = UI.createElement('div', { 
                    className: \`attente-badge theme-\${joueur.theme || 'blue'}\`,
                    text: \`\${joueur.prenom} \${joueur.nom ? joueur.nom.charAt(0) + '.' : ''}\`,
                    style: 'margin: 0; text-align: center;'
                });
                pouleGroup.appendChild(badge);
            });
            
            grid.appendChild(pouleGroup);
        });

        container.appendChild(grid);
    }`;

// Classement Row Height
const pathCSS = 'css/pages/affichage.css';
let cssContent = fs.readFileSync(pathCSS, 'utf8');

const oldCSS = `    .table-classement td, .table-classement th {
        padding: 6px 10px;
    }`;

const newCSS = `    .table-classement td, .table-classement th {
        padding: 2px 5px !important;
        font-size: 0.9em;
    }`;

content = content.replace(oldRenderAttente, newRenderAttente);

// Rank medals
const oldRank = `            const tr = UI.createElement('tr', {
                className: index < 3 ? \`rank-\${index + 1}\` : ''
            });

            tr.innerHTML = \`
                <td class="text-center font-bold">\${index + 1}</td>
                <td>\${prenom} <span class="text-muted">\${nom}</span></td>
                <td class="text-center font-bold">\${joueur.stats.points}</td>
                <td class="text-center font-mono \${joueur.stats.difference > 0 ? 'text-success' : joueur.stats.difference < 0 ? 'text-danger' : ''}">
                    \${joueur.stats.difference > 0 ? '+' : ''}\${joueur.stats.difference}
                </td>
            \`;`;
            
const newRank = `            const tr = UI.createElement('tr', {
                className: index < 3 ? \`rank-\${index + 1}\` : ''
            });

            let rankDisplay = index + 1;
            if (index === 0) rankDisplay = "🥇";
            if (index === 1) rankDisplay = "🥈";
            if (index === 2) rankDisplay = "🥉";

            tr.innerHTML = \`
                <td class="text-center font-bold" style="\${index < 3 ? 'font-size: 1.5em;' : ''}">\${rankDisplay}</td>
                <td>\${prenom} <span class="text-muted">\${nom}</span></td>
                <td class="text-center font-bold">\${joueur.stats.points}</td>
                <td class="text-center font-mono \${joueur.stats.difference > 0 ? 'text-success' : joueur.stats.difference < 0 ? 'text-danger' : ''}">
                    \${joueur.stats.difference > 0 ? '+' : ''}\${joueur.stats.difference}
                </td>
            \`;`;

content = content.replace(oldRank, newRank);

fs.writeFileSync(pathAff, content);

// Also we make Timer Bigger in CSS
const cssTimerMod = `
/* BIG TIMER */
.timer-card-time {
    font-size: 4.5rem !important;
    font-weight: 800 !important;
}

.table-classement td, .table-classement th {
    padding: 2px 5px !important;
    font-size: 0.9em;
}
`;

cssContent += cssTimerMod;
fs.writeFileSync(pathCSS, cssContent);

