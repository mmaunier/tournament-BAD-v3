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
        }, 1000);

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
                <div>
                   <span id="aff-timer" style="margin-right:20px; font-weight:bold; font-size:2.5vh; color:#e74c3c;"></span>
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
        }

        if (this.data.mode === 'tournoi') {
            titleEl.textContent = "🔥 Matchs en cours";
            contentEl.innerHTML = this.buildTournoiHTML();
        } 
        else if (this.data.mode === 'classement-bloc1') {
            titleEl.textContent = "🏅 Classement Général (Phase 1)";
            contentEl.innerHTML = this.buildClassementBloc1HTML();
        }
        else if (this.data.mode === 'classement-bloc2') {
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
            <div class="byes-area">
                <div class="byes-title">🛋 Joueurs au repos / Sortants</div>
                <div class="byes-list">
                    ${byes.map(b => `<div class="bye-badge">\${b}</div>`).join('')}
                    ${byes.length === 0 ? '<span style="color:#7f8c8d; font-style:italic;">Aucun joueur en attente</span>' : ''}
                </div>
            </div>
        `;

        return html;
    }

    buildClassementBloc1HTML() {
        let html = '<div class="classement-area">';
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
                <div class="poule-classement-box">
                    <div class="poule-classement-title">${poule.nom}</div>
                    <table class="table-stats">
                        <thead>
                            <tr><th>R</th><th>Joueur</th><th>Pts/M</th><th>V/N/D</th></tr>
                        </thead>
                        <tbody>
                            ${jPoule.map((j, idx) => `
                                <tr>
                                    <td>${idx+1}</td>
                                    <td class="text-left">${j.prenom} ${(j.nom||'').charAt(0)}.</td>
                                    <td>${Number(j.ratioPoints).toFixed(2)}</td>
                                    <td><span style="color:#2ecc71">${j.victoires}</span> - <span style="color:#e74c3c">${j.defaites}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    buildClassementBloc2HTML() {
        let html = '<div class="classement-area">';
        let repartition = this.data.repartitionPoules || [];
        let noms = this.data.nomsPoules || [];

        repartition.forEach((pool, idx) => {
            html += `
                <div class="poule-classement-box">
                    <div class="poule-classement-title">${noms[idx] || 'Poule ' + (idx+1)}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${pool.map(j => `
                            <div class="bye-badge" style="background:#3498db; color:white;">
                                ${j.prenom} ${(j.nom||'').charAt(0)}.
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
