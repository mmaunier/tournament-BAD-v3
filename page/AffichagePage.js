class AffichagePage {
    constructor() {
        this.container = null;
        this.data = null;
        this.theme = localStorage.getItem('affichage_theme') || 'dark';

        window.addEventListener('storage', (e) => {
            if (e.key === 'affichage_v3_data') {
                this.loadData();
                this.renderContent();
            }
        });

        // Polling en cas de protocol file://
        setInterval(() => {
            const raw = localStorage.getItem('affichage_v3_data');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (!this.data || this.data.timestamp !== parsed.timestamp) {
                    this.data = parsed;
                    this.renderContent();
                }
            }
        }, 150);

        this.updateRealViewportHeight();
        window.addEventListener('resize', () => this.updateRealViewportHeight());
    }

    updateRealViewportHeight() {
        const realVh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--real-vh', `${realVh}px`);
    }

    loadData() {
        try {
            this.data = JSON.parse(localStorage.getItem('affichage_v3_data') || 'null');
        } catch(e) {
            this.data = null;
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', this.theme);
        localStorage.setItem('affichage_theme', this.theme);
    }

    render(container) {
        this.container = container;
        document.body.setAttribute('data-theme', this.theme);
        
        this.loadData();

        container.innerHTML = `
            <div class="header-bar">
                <h1 id="aff-title">En attente de connexion...</h1>
                <div style="display: flex; align-items: center;">
                   <div id="aff-timer-container" style="margin-right:20px; font-weight:bold; font-size:4.5rem; display: flex; align-items: center; transition: all 0.3s ease;">
                       <span id="aff-timer-icon" style="margin-right:15px; font-size: 3rem; color: var(--text-color);"></span>
                       <span id="aff-timer" style="color:var(--text-color); letter-spacing: 2px; font-family: monospace;">00:00</span>
                   </div>
                   <button class="btn-theme" id="btn-toggle-theme">🎨 Inverser Thème</button>
                </div>
            </div>
            <div class="content-area" id="aff-content"></div>
        `;

        container.querySelector('#btn-toggle-theme').addEventListener('click', () => this.toggleTheme());

        this.renderContent();
    }

    renderContent() {
        if (!this.data || !this.container) return;

        const titleEl = this.container.querySelector('#aff-title');
        const timerEl = this.container.querySelector('#aff-timer');
        const contentEl = this.container.querySelector('#aff-content');

        const timerIconEl = this.container.querySelector('#aff-timer-icon');
        if (this.data.timer) {
            timerEl.textContent = this.data.timer.display;
            if (this.data.timer.running) {
                timerIconEl.textContent = "▶";
                timerIconEl.style.color = "#2ecc71";
                timerEl.style.color = "#2ecc71";
            } else if (this.data.timer.paused) {
                timerIconEl.textContent = "⏸";
                timerIconEl.style.color = "#f1c40f";
                timerEl.style.color = "#f1c40f";
            } else {
                timerIconEl.textContent = "⏹";
                timerIconEl.style.color = "var(--text-color, #7f8c8d)";
                timerEl.style.color = "var(--text-color, #7f8c8d)";
            }
        } else {
            timerEl.textContent = "00:00";
            timerIconEl.textContent = "⏹";
            timerIconEl.style.color = "var(--text-color, #7f8c8d)";
            timerEl.style.color = "var(--text-color, #7f8c8d)";
        }

        // --- Optimisation : On ne reconstruit le DOM (matchs, byes, classements) que s'il a changé
        const structData = { ...this.data };
        delete structData.timer;
        delete structData.timestamp;
        const currentHash = JSON.stringify(structData);
        
        if (this._lastStructHash === currentHash) {
            return; // Seul le timer a été mis à jour
        }
        this._lastStructHash = currentHash;

        const timerContainer = this.container.querySelector('#aff-timer-container');

        if (this.data.mode === 'tournoi') {
            if(timerContainer) timerContainer.style.display = 'flex';
            titleEl.textContent = "🔥 Matchs en cours";
            contentEl.innerHTML = this.buildTournoiHTML();
        } 
        else if (this.data.mode === 'classement-bloc1') {
            if(timerContainer) timerContainer.style.display = 'none';
            titleEl.textContent = "🏅 Classement Général";
            contentEl.innerHTML = this.buildClassementBloc1HTML();
        }
        else if (this.data.mode === 'classement-bloc2') {
            if(timerContainer) timerContainer.style.display = 'none';
            titleEl.textContent = "🔄 Nouvelles Poules de Répartition";
            contentEl.innerHTML = this.buildClassementBloc2HTML();
        }
    }

    buildTournoiHTML() {
        let html = '<div class="tournoi-grid">';
        
        let terrains = this.data.terrains || [];
        terrains.forEach(t => {
            if (t.occupe) {
                html += `
                    <div class="court-card">
                        <div class="court-header">Terrain ${t.numero}</div>
                        <div class="court-body">
                            <div class="poule-name">${t.poule}</div>
                            <div class="team">${t.equipe1}</div>
                            <div class="vs">VS</div>
                            <div class="team">${t.equipe2}</div>
                            <div class="score">${t.score1} - ${t.score2}</div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="court-card empty_court">
                        <div class="court-header">Terrain ${t.numero}</div>
                        <div class="court-body">Libre</div>
                    </div>
                `;
            }
        });
        html += '</div>';

        // Byes / Sortants
        let byes = this.data.byes || [];
        html += `
            <div class="byes-area" style="width: 100%;">
                <div class="byes-title">🛋 Joueurs au repos / Sortants</div>
                <div class="byes-list" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%;">
                    ${byes.map(b => {
                        if (typeof b === 'object' && b.poule) {
                            return `
                            <div class="poule-byes" style="flex: 1; background: var(--surface-color); border: 2px solid var(--poule-${b.color}); border-radius: var(--radius-md); padding: 5px 10px; min-width: 150px; max-width: 100%;">
                                <div style="font-weight: bold; color: var(--poule-${b.color}); border-bottom: 1px solid var(--border-color); margin-bottom: 5px; text-align: center;">${b.poule}</div>
                                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
                                    ${b.joueurs.map(j => `<div class="bye-badge" style="background: var(--bg-color); color: var(--text-color); margin: 0; padding: 4px 8px; border-radius: 4px; text-align: center; white-space: nowrap;">${j}</div>`).join('')}
                                </div>
                            </div>`;
                        }
                        return `<div class="bye-badge" style="background: var(--primary-color);">${b}</div>`;
                    }).join('')}
                    ${byes.length === 0 ? '<span style="color:#7f8c8d; font-style:italic;">Aucun joueur en attente</span>' : ''}
                </div>
            </div>
        `;

        return html;
    }

    buildClassementBloc1HTML() {
        let html = '<div class="classement-area" style="width: 100%; display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-start;">';
        let poules = this.data.poulesInit || [];
        let joueurs = this.data.joueurs || [];

        poules.forEach(poule => {
            let jPoule = joueurs.filter(j => j.pouleIdsInit === poule.id);
            if(jPoule.length === 0) return;

            jPoule.sort((a,b) => {
                if (b.ratioPoints !== a.ratioPoints) return b.ratioPoints - a.ratioPoints;
                if (b.ratioDiff !== a.ratioDiff) return b.ratioDiff - a.ratioDiff;
                return b.pointsClassement - a.pointsClassement;
            });

            html += `
                <div class="poule-classement-box" style="flex: 1 1 0; min-width: 300px;">
                    <div class="poule-classement-title">${poule.nom}</div>
                    <table class="table-stats" style="width: 100%; white-space: nowrap; line-height: 1.4; font-size: 1.1em;">
                        <thead>
                            <tr>
                                <th style="width: 1%;">R</th>
                                <th>Joueur</th>
                                <th style="width: 1%;">Pts/M</th>
                                <th style="width: 1%;">V/N/D</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${jPoule.map((j, idx) => {
                                let rankDisplay = idx + 1;
                                let styleClass = "";
                                if (idx === 0) { rankDisplay = "🥇"; styleClass = "font-weight: bold; font-size: 1.15em;"; }
                                else if (idx === 1) { rankDisplay = "🥈"; styleClass = "font-weight: bold; font-size: 1.1em;"; }
                                else if (idx === 2) { rankDisplay = "🥉"; styleClass = "font-weight: bold; font-size: 1.05em;"; }
                                
                                return `
                                <tr style="${styleClass}">
                                    <td style="text-align: center;">${rankDisplay}</td>
                                    <td class="text-left">${j.prenom} ${(j.nom||'').charAt(0)}.</td>
                                    <td style="text-align: center;">${Number(j.ratioPoints).toFixed(2)}</td>
                                    <td style="text-align: center;"><span style="color:#2ecc71">${j.victoires}</span> - <span style="color:#e74c3c">${j.defaites}</span></td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    buildClassementBloc2HTML() {
        let html = '<div class="classement-area" style="width: 100%; display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-start;">';
        let repartition = this.data.repartitionPoules || [];
        let noms = this.data.nomsPoules || [];

        repartition.forEach((pool, idx) => {
            let sortedPool = [...pool].sort((a,b) => (a.nom || '').localeCompare(b.nom || ''));
            html += `
                <div class="poule-classement-box" style="flex: 1 1 0; min-width: 250px;">
                    <div class="poule-classement-title">${noms[idx] || 'Poule ' + (idx+1)}</div>
                    <div style="display:flex; flex-wrap: wrap; justify-content: center; gap:8px;">
                        ${sortedPool.map(j => `
                            <div class="bye-badge" style="background:#3498db; color:white; padding: 8px 12px; border-radius: 6px; text-align: center; white-space: nowrap;">
                                <strong style="text-transform: uppercase;">${j.nom || ''}</strong> ${j.prenom}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }
}
window.AffichagePage = AffichagePage;
