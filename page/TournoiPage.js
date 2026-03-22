/**
 * TournoiPage.js — Page d'organisation et de suivi d'un tournoi V3 (multi-poules en parallèle)
 */

class TournoiPage {
    constructor(db) {
        this.db = db;
        this.poules = [];
        this.terrainsCount = 0;
        setInterval(() => this._syncAffichage(), 1000);
        
        // États pour la pop-up de score
        this.editingMatch = null;
        this.editingPoule = null;
        
        // Références DOM
        this.dom = {
            container: null,
            sidebar: null,
            grid: null,
            byesGrid: null,
            modal: null
        };
    }

    async render(container) {
        this.dom.container = container;
        container.innerHTML = '';
        container.className = 'tournoi-layout';
        
        // 1. Charger les données
        await this._loadData();
        
        // 2. Construire la structure globale
        this._buildSkeleton();
        
        // 3. Dessiner le contenu
        this.renderAll();
    }

    async _loadData() {
        // Dans TournoiDB, getPoules() renvoie les poules. On a injecté les infos supplémentaires.
        const dbPoules = await this.db.getPoules();
        if (!dbPoules || dbPoules.length === 0) {
            console.error("Aucune poule trouvée en base de données.");
            return;
        }

        // On crée un tableau métier basé sur la db
        this.poules = dbPoules.map(p => {
            // Re-construire ou s'assurer de la présence des champs
            p.viewedRoundIndex = p.viewedRoundIndex || 0;
            p.liveRoundIndex = p.liveRoundIndex || 0;
            
            // Calculer le nombre max de terrains utilisés toutes poules confondues
            if (p.terrainEnd > this.terrainsCount) {
                this.terrainsCount = p.terrainEnd;
            }
            
            // Initialisation des scores si absents des matchs (la génération a créé 'equipe1', 'equipe2', etc.)
            if (p.tours) {
                p.tours.forEach(tour => {
                    if (tour.matchs) {
                        tour.matchs.forEach(match => {
                            if (match.score1 === undefined) match.score1 = null;
                            if (match.score2 === undefined) match.score2 = null;
                        });
                    }
                });
            }

            return p;
        });
    }

    // ─── CONSTRUCTION DU DOM ───────────────────────────────────────────────────

    _buildSkeleton() {
        const c = this.dom.container;
        
        // SIDEBAR
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'app-title';
        titleDiv.innerHTML = 'Gestion Tournoi<br><span style="font-size:0.6em;color:#95a5a6;font-weight:normal;">Vue Organisateur</span>';
        
        const pouleControls = document.createElement('div');
        pouleControls.id = 'poule-controls';
        
        sidebar.appendChild(titleDiv);
        sidebar.appendChild(pouleControls);
        
        // MAIN CONTENT
        const main = document.createElement('div');
        main.className = 'main-content';
        
        const header = document.createElement('div');
        header.className = 'dashboard-header';
        header.innerHTML = `
            <h2>Vue d'ensemble des Terrains</h2>
            <div id="top-timer" class="top-timer">
                <button class="btn-timer btn-play" id="btn-timer-play" title="Démarrer/Pause"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
                <button class="btn-timer btn-stop" id="btn-timer-stop" title="Arrêter/Reset"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="2" ry="2"/></svg></button>
                <span id="timer-display" class="timer-display">08:00</span>
                <button class="btn-timer btn-settings" id="btn-timer-settings" title="Paramètres"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
            <div class="header-actions">
                <button class="btn-action" style="background:#f39c12" id="btn-open-stats">Voir Stats</button>
                <button class="btn-action" id="btn-open-retrait" style="background:#e74c3c">Gérer Joueurs (Abandon)</button>
                <button class="btn-action btn-projection" style="background:#8e44ad; font-weight:bold;" id="btn-open-proj">📺 Vidéoprojecteur</button>
                <button class="btn-action" style="background:#2c3e50" id="btn-open-classement">Voir Classements</button>
                <button class="btn-action" style="background:#c0392b; font-weight: bold;" id="btn-finish-tournoi">FINIR le tournoi</button>
            </div>
        `;
        
        const grid = document.createElement('div');
        grid.className = 'courts-grid';
        grid.id = 'courtsGrid';
        
        const byesSection = document.createElement('div');
        byesSection.className = 'byes-section';
        byesSection.innerHTML = `
            <h3>Joueurs au repos (Sortants / Byes)</h3>
            <div class="byes-grid" id="byesGrid"></div>
        `;
        
        main.appendChild(header);
        main.appendChild(grid);
        main.appendChild(byesSection);
        
        // MODAL
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'scoreModal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">Saisir le score</h3>
                <p id="modalMatchInfo"></p>
                <div class="score-inputs">
                    <div class="score-input-group">
                        <label id="labelTeam1">Eq 1</label>
                        <input type="number" id="score1" class="score-input" min="0" value="0">
                    </div>
                    <div>-</div>
                    <div class="score-input-group">
                        <label id="labelTeam2">Eq 2</label>
                        <input type="number" id="score2" class="score-input" min="0" value="0">
                    </div>
                </div>
                <button class="btn-validate" id="btn-save-score">Valider</button>
                <button class="btn-validate btn-close" id="btn-close-modal">Annuler</button>
            </div>
        `;
        
        const statsModal = document.createElement('div');
        statsModal.className = 'modal-overlay';
        statsModal.id = 'statsModal';
        statsModal.innerHTML = `
            <div class="modal-content modal-large">
                <h3 class="modal-title">Statistiques des Joueurs</h3>
                <div id="statsTableContainer" style="max-height: 60vh; overflow-y: auto;"></div>
                <button class="btn-validate btn-close" id="btn-close-stats-modal" style="margin-top: 20px;">Quitter</button>
            </div>
        `;

        const timerModal = document.createElement('div');
        timerModal.className = 'modal-overlay';
        timerModal.id = 'timerModal';
        timerModal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">Configurer le Timer</h3>
                <div style="margin-bottom: 20px; text-align: center;">
                    <input type="text" id="timer-config-input" class="score-input" style="width:100px; display:inline-block; margin-bottom:15px;" placeholder="ex: 8m ou 30s">
                    <div class="timer-shortcuts" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn-action" data-time="3s">3s</button>
                        <button class="btn-action" data-time="30s">30s</button>
                        <button class="btn-action" data-time="1m">1m</button>
                        <button class="btn-action" data-time="5m">5m</button>
                        <button class="btn-action" data-time="7m">7m</button>
                        <button class="btn-action" data-time="8m">8m</button>
                        <button class="btn-action" data-time="10m">10m</button>
                    </div>
                </div>
                <button class="btn-validate" id="btn-save-timer">Appliquer</button>
                <button class="btn-validate btn-close" id="btn-close-timer-modal">Annuler</button>
            </div>
        `;

        const retraitModal = document.createElement('div');
        retraitModal.className = 'modal-overlay';
        retraitModal.id = 'retraitModal';
        retraitModal.innerHTML = `
            <div class="modal-content modal-large">
                <h3 class="modal-title">Gérer les Abandons / Retirer des joueurs</h3>
                <p style="text-align: center; color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px;">Les joueurs sélectionnés seront retirés du tournoi à partir du tour courant. Leurs scores précédents seront conservés mais ils ne participeront plus aux prochains matchs.</p>
                <div id="retraitModalBody" style="display: flex; gap: 20px; overflow-x: auto; margin-bottom: 20px; min-height: 200px;">
                    <!-- Rempli dynamiquement -->
                </div>
                <button class="btn-validate" id="btn-valider-retrait" style="background-color: var(--color-danger, #e74c3c);">Valider le retrait</button>
                <button class="btn-validate btn-close" id="btn-close-retrait-modal">Annuler</button>
            </div>
        `;

        const classementModal = document.createElement('div');
        classementModal.className = 'modal-overlay';
        classementModal.id = 'classementModal';
        classementModal.innerHTML = `
            <div class="modal-content modal-large" style="max-width: 95vw; width: 1400px;">
                <h3 class="modal-title">Classement Provisoire</h3>
                <div id="classementModalBody" style="display: flex; gap: 20px; overflow-x: auto; margin-bottom: 20px; min-height: 300px;">
                    <!-- Rempli dynamiquement -->
                </div>
                <button class="btn-validate btn-close" id="btn-close-classement-modal">Fermer</button>
            </div>
        `;

        c.appendChild(sidebar);
        c.appendChild(main);
        c.appendChild(modal);
        c.appendChild(statsModal);
        c.appendChild(timerModal);
        c.appendChild(retraitModal);
        c.appendChild(classementModal);
        
        this.dom.sidebar = pouleControls;
        this.dom.grid = grid;
        this.dom.byesGrid = byesSection.querySelector('#byesGrid');
        this.dom.modal = modal;
        this.dom.statsModal = statsModal;
        this.dom.timerModal = timerModal;
        this.dom.retraitModal = retraitModal;
        this.dom.classementModal = classementModal;
        
        // Event listeners fixes
        header.querySelector('#btn-open-proj').addEventListener('click', () => {
            window.open('affichage.html', 'AffichageTournoiV3', 'menubar=no,toolbar=no,location=no,status=no');
        });
        
        header.querySelector('#btn-open-stats').addEventListener('click', () => this.openStatsModal());
        header.querySelector('#btn-open-retrait').addEventListener('click', () => this.openRetraitModal());
        header.querySelector('#btn-open-classement').addEventListener('click', () => this.openClassementModal());
        header.querySelector('#btn-finish-tournoi').addEventListener('click', () => this.finirTournoi());

        modal.querySelector('#btn-save-score').addEventListener('click', () => this.saveScore());
        modal.querySelector('#btn-close-modal').addEventListener('click', () => this.closeModal());
        
        // Permettre de valider le score avec la touche Entrée dans les inputs
        const handleEnterKey = (e) => {
            if (e.key === 'Enter') {
                this.saveScore();
            }
        };
        modal.querySelector('#score1').addEventListener('keydown', handleEnterKey);
        modal.querySelector('#score2').addEventListener('keydown', handleEnterKey);

        statsModal.querySelector('#btn-close-stats-modal').addEventListener('click', () => {
            this.dom.statsModal.classList.remove('active');
        });

        retraitModal.querySelector('#btn-close-retrait-modal').addEventListener('click', () => {
            this.dom.retraitModal.classList.remove('active');
        });
        retraitModal.querySelector('#btn-valider-retrait').addEventListener('click', () => this.validerRetrait());

        classementModal.querySelector('#btn-close-classement-modal').addEventListener('click', () => {
            this.dom.classementModal.classList.remove('active');
        });

        // ================= FERMETURE GLOBALE DES MODALES =================
        const closeAllModals = () => {
            if (this.dom.modal.classList.contains('active')) this.closeModal();
            if (this.dom.statsModal) this.dom.statsModal.classList.remove('active');
            if (this.dom.timerModal) this.dom.timerModal.classList.remove('active');
            if (this.dom.retraitModal) this.dom.retraitModal.classList.remove('active');
            if (this.dom.classementModal) this.dom.classementModal.classList.remove('active');
        };

        // Fermeture sur Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        // Fermeture au clic à l'extérieur
        const allModals = [this.dom.modal, this.dom.statsModal, this.dom.timerModal, this.dom.retraitModal, this.dom.classementModal];
        allModals.forEach(m => {
            if (m) {
                m.addEventListener('click', (e) => {
                    if (e.target === m) {
                        if (m === this.dom.modal) this.closeModal();
                        else m.classList.remove('active');
                    }
                });
            }
        });

        // ================= TIMER =================
        this.initTimer(header);
    }

    initTimer(header) {
        // Init logic for Timer using utils/Timer.js
        this.timer = new Timer({
            duration: 8 * 60, // 8m
            soundPath: 'assets/sons/buzzer.wav', // Copied to test environment
            onTick: (remaining) => this.updateTimerDisplay(remaining),
            onStateChange: (state) => this.updateTimerUIState(state)
        });

        this.dom.timerDisplay = header.querySelector('#timer-display');
        this.dom.btnTimerPlay = header.querySelector('#btn-timer-play');
        this.dom.btnTimerStop = header.querySelector('#btn-timer-stop');
        this.dom.btnTimerSettings = header.querySelector('#btn-timer-settings');

        this.dom.btnTimerPlay.addEventListener('click', () => this.timer.togglePlayPause());
        this.dom.btnTimerStop.addEventListener('click', () => this.timer.stop());
        this.dom.btnTimerSettings.addEventListener('click', () => this.openTimerModal());

        // Event listeners pour modal
        const tModal = this.dom.timerModal;
        const tInput = tModal.querySelector('#timer-config-input');
        
        tModal.querySelector('#btn-close-timer-modal').addEventListener('click', () => tModal.classList.remove('active'));
        tModal.querySelector('#btn-save-timer').addEventListener('click', () => {
            const parsed = Timer.parseDuration(tInput.value);
            if (parsed > 0) {
                this.timer.setDuration(parsed);
                tModal.classList.remove('active');
            }
        });
        
        const shortcuts = tModal.querySelectorAll('.timer-shortcuts button');
        shortcuts.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tInput.value = e.target.getAttribute('data-time');
            });
        });
        
        // Initial display
        this.updateTimerDisplay(this.timer.getRemaining());
    }

    updateTimerDisplay(remaining) {
        if (!this.dom.timerDisplay) return;
        this.dom.timerDisplay.textContent = Timer.formatTime(remaining);
        
        // Sync immediate state to projector
        this._syncAffichage();
        
        // Changer la couleur
        if (remaining <= 0) {
            this.dom.timerDisplay.style.color = 'red';
            this.dom.timerDisplay.classList.add('blink');
        } else if (remaining <= 30) {
            this.dom.timerDisplay.style.color = 'red';
            this.dom.timerDisplay.classList.remove('blink');
        } else if (remaining <= 60) {
            this.dom.timerDisplay.style.color = 'orange';
            this.dom.timerDisplay.classList.remove('blink');
        } else {
            this.dom.timerDisplay.style.color = '';
            this.dom.timerDisplay.classList.remove('blink');
        }
    }

    updateTimerUIState(state) {
        if (state === 'running') {
            this.dom.btnTimerPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
            this.dom.btnTimerPlay.style.background = '#e67e22'; // Orange pour Pause
        } else {
            this.dom.btnTimerPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
            this.dom.btnTimerPlay.style.background = '#27ae60'; // Vert pour Play
        }
    }

    openTimerModal() {
        const tInput = this.dom.timerModal.querySelector('#timer-config-input');
        tInput.value = ''; // Reset input ou mettre la valeur actuelle
        this.dom.timerModal.classList.add('active');
        tInput.focus();
    }

    // ─── RENDUS SPECIFIQUES ────────────────────────────────────────────────────

    renderAll() {
        this.renderSidebar();
        this.renderGrid();
        this.renderByes();
        this._saveStateToDB(); // Sauvegarde automatique du state (scores, indexes de tours)
    }

    renderSidebar() {
        const container = this.dom.sidebar;
        container.innerHTML = '';

        this.poules.forEach(poule => {
            const div = document.createElement('div');
            div.className = `poule-control bg-poule-${poule.colorIndex}`;
            
            const vRound = poule.viewedRoundIndex;
            const nbTours = poule.tours ? poule.tours.length : 0;
            
            if (nbTours === 0) {
                div.innerHTML = `<div class="poule-header"><span class="poule-name">${poule.nom}</span> - Erreur : Aucun tour généré</div>`;
                container.appendChild(div);
                return;
            }
            
            const progress = this._calcProgress(poule, vRound);
            const isFinished = this._isRoundFinished(poule, vRound);
            const isLive = (vRound === poule.liveRoundIndex);
            
            let statusHtml = '';
            if (isLive) {
                 statusHtml = `<div class="round-status status-live">Live - Projecteur</div>`;
            } else if (isFinished) {
                 statusHtml = `<div class="round-status status-done">Terminé (Scores remplis)</div>`;
            } else {
                 statusHtml = `<div class="round-status status-editing">En cours de modification</div>`;
            }

            div.innerHTML = `
                <div class="poule-header">
                    <span class="poule-name text-poule-${poule.colorIndex}">${poule.nom}</span>
                    <span class="court-badge">Terrains ${poule.terrainStart}-${poule.terrainEnd}</span>
                </div>
                
                <div class="round-nav">
                    <button class="btn-nav btn-prev" ${vRound === 0 ? 'disabled' : ''}>&#9664;</button>
                    <span style="font-weight:bold;">Tour affiché : ${vRound + 1} / ${nbTours}</span>
                    <button class="btn-nav btn-next" ${vRound === nbTours - 1 ? 'disabled' : ''}>&#9654;</button>
                </div>
                
                ${statusHtml}
                
                <div class="progress-bar-container">
                    <div class="progress-bar color-poule-${poule.colorIndex}" style="width: ${progress}%"></div>
                </div>
                
                <button class="btn-set-live" ${isLive ? 'style="display:none;"' : ''}>
                    Définir comme ACTIF
                </button>
            `;
            
            // Events
            const btnPrev = div.querySelector('.btn-prev');
            if (btnPrev) btnPrev.addEventListener('click', () => { this.changeRound(poule.id, -1); });
            
            const btnNext = div.querySelector('.btn-next');
            if (btnNext) btnNext.addEventListener('click', () => { this.changeRound(poule.id, 1); });
            
            const btnLive = div.querySelector('.btn-set-live');
            if (btnLive) btnLive.addEventListener('click', () => { this.setLive(poule.id); });

            container.appendChild(div);
        });
    }

    renderGrid() {
        const grid = this.dom.grid;
        grid.innerHTML = '';
        
        // Si terrainsCount n'a pas pu être déduit, on se base sur Max terrainsEnd
        const maxCourts = this.terrainsCount || 7;

        for (let t = 1; t <= maxCourts; t++) {
            const card = document.createElement('div');
            const occupancy = this._getPouleAndMatchForCourt(t);
            
            if (occupancy) {
                const { poule, match } = occupancy;
                
                card.className = `court-card bg-poule-${poule.colorIndex}`;
                if (match && match.score1 !== null) {
                    card.classList.add('finished-match'); // Remplace opacity:0.7 pour ne pas délaver les couleurs
                }

                const formatPlayerHTML = p => {
                    if (!p) return "";
                    const sexeClass = p.genre === 'F' ? 'p-name-f' : 'p-name-h';
                    if (p.prenom) {
                        return `<div class="p-name ${sexeClass}"><span>${p.prenom}</span><strong>${p.nom}</strong></div>`;
                    } else {
                        return `<div class="p-name ${sexeClass}"><strong>${p.nom}</strong></div>`;
                    }
                };
                const formatPlayerText = p => p ? (p.prenom ? `${p.prenom} ${p.nom}` : p.nom) : "?";
                
                const n1_html = formatPlayerHTML(match.equipe1[0]);
                const n2_html = formatPlayerHTML(match.equipe1[1]);
                const n3_html = formatPlayerHTML(match.equipe2[0]);
                const n4_html = formatPlayerHTML(match.equipe2[1]);

                const n1_txt = formatPlayerText(match.equipe1[0]);
                const n2_txt = formatPlayerText(match.equipe1[1]);
                const n3_txt = formatPlayerText(match.equipe2[0]);
                const n4_txt = formatPlayerText(match.equipe2[1]);

                let scoreDisplay = '--';
                if (match.score1 !== null && match.score2 !== null) {
                    const s1 = match.score1;
                    const s2 = match.score2;
                    let c1 = '', c2 = '';
                    
                    if (Math.abs(s1 - s2) <= 2) {
                        c1 = 'score-tight';
                        c2 = 'score-tight';
                    } else if (s1 > s2) {
                        c1 = 'score-win';
                        c2 = 'score-lose';
                    } else if (s2 > s1) {
                        c1 = 'score-lose';
                        c2 = 'score-win';
                    }
                    
                    scoreDisplay = `<span class="${c1}">${s1}</span> <span class="score-dash">-</span> <span class="${c2}">${s2}</span>`;
                }

                card.addEventListener('click', () => this.openScoreModal(poule.id, match, n1_txt, n2_txt, n3_txt, n4_txt));

                card.innerHTML = `
                    <div class="court-header">
                        <span>Terrain ${t}</span>
                        <span class="court-badge">Tour ${poule.viewedRoundIndex + 1}</span>
                    </div>
                    <div class="court-content">
                        <div class="match-display">
                            <div class="teams-container">
                                <div class="team">
                                    <div class="team-players">
                                        ${n1_html ? `<div class="player">${n1_html}</div>` : ''}
                                        ${n2_html ? `<div class="player">${n2_html}</div>` : ''}
                                    </div>
                                </div>
                                <div class="vs-text">VS</div>
                                <div class="team">
                                    <div class="team-players">
                                        ${n3_html ? `<div class="player">${n3_html}</div>` : ''}
                                        ${n4_html ? `<div class="player">${n4_html}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="score-container">
                                <div class="match-score">${scoreDisplay}</div>
                            </div>
                        </div>
                        <div class="match-status">
                            ${match.score1 !== null ? "Terminé (cliquer pour modif)" : "En attente/En cours..."}
                        </div>
                    </div>
                `;
            } else {
                card.className = "court-card empty";
                card.innerHTML = `
                    <div class="court-header">Terrain ${t}</div>
                    <div class="court-content empty-state">
                        Disponible (Aucun match)
                    </div>
                `;
            }
            grid.appendChild(card);
        }
    }

    renderByes() {
        const grid = this.dom.byesGrid;
        grid.innerHTML = '';

        this.poules.forEach(poule => {
            if (!poule.tours || poule.tours.length === 0) return;
            const currentTour = poule.tours[poule.viewedRoundIndex];
            if (!currentTour) return;
            
            const byesList = currentTour.byes || [];
            
            if (byesList.length > 0) {
                const formatByePlayer = p => {
                    if (!p) return "Inconnu";
                    const sexeClass = p.genre === 'F' ? 'p-name-f' : 'p-name-h';
                    if (p.prenom) {
                        return `<div class="p-name ${sexeClass}"><span>${p.prenom}</span><strong>${p.nom}</strong></div>`;
                    } else {
                        return `<div class="p-name ${sexeClass}"><strong>${p.nom}</strong></div>`;
                    }
                };

                const byesNames = byesList.map(j => {
                    const nameHTML = formatByePlayer(j);
                    return `<div class="bye-player text-center">${nameHTML}</div>`;
                }).join('');
                
                const card = document.createElement('div');
                card.className = `poule-byes-card border-poule-${poule.colorIndex}`;
                card.innerHTML = `
                    <div class="poule-byes-header text-poule-${poule.colorIndex}">
                        <span>${poule.nom} - Sortants</span>
                        <span class="court-badge">Tour ${poule.viewedRoundIndex + 1}</span>
                    </div>
                    <div class="byes-list">
                        ${byesNames}
                    </div>
                `;
                grid.appendChild(card);
            }
        });
    }

    // ─── LOGIQUE D'ETAT ────────────────────────────────────────────────────────

    _isRoundFinished(poule, roundIdx) {
        if (!poule.tours || roundIdx >= poule.tours.length) return true;
        const matches = poule.tours[roundIdx].matchs || [];
        if (matches.length === 0) return true;
        return matches.every(m => m.score1 !== null && m.score2 !== null);
    }

    _calcProgress(poule, roundIdx) {
        if (!poule.tours || roundIdx >= poule.tours.length) return 100;
        const matches = poule.tours[roundIdx].matchs || [];
        if (matches.length === 0) return 100;
        const done = matches.filter(m => m.score1 !== null).length;
        return (done / matches.length) * 100;
    }

    _getLivePouleAndMatchForCourt(terrainId) {
        for (let p of this.poules) {
            // Est-ce que le terrain est assigné à cette poule ?
            if (terrainId >= p.terrainStart && terrainId <= p.terrainEnd) {
                if (!p.tours || p.tours.length === 0) continue;
                
                const currentTour = p.tours[p.liveRoundIndex !== undefined ? p.liveRoundIndex : p.tours.length - 1];
                if (!currentTour || !currentTour.matchs) continue;
                
                // Recherche du match sur ce terrain précis
                const match = currentTour.matchs.find(m => m.terrain === terrainId);
                if (match) return { poule: p, match: match };
            }
        }
        return null;
    }
    
    _getPouleAndMatchForCourt(terrainId) {
        for (let p of this.poules) {
            // Est-ce que le terrain est assigné à cette poule ?
            if (terrainId >= p.terrainStart && terrainId <= p.terrainEnd) {
                if (!p.tours || p.tours.length === 0) continue;
                
                const currentTour = p.tours[p.viewedRoundIndex];
                if (!currentTour || !currentTour.matchs) continue;
                
                // Recherche du match sur ce terrain précis
                const match = currentTour.matchs.find(m => m.terrain === terrainId);
                // Si pas de match explicite, vérifier que l'index du match correspond (parfois le format db varie)
                // Dans GenerateurTournoiV3 on a mis : match.terrain
                if (match) return { poule: p, match: match };
            }
        }
        return null;
    }

    changeRound(pouleId, delta) {
        const poule = this.poules.find(p => p.id === pouleId);
        if (!poule) return;
        
        const limit = (poule.tours ? poule.tours.length : 1) - 1;
        let newVal = poule.viewedRoundIndex + delta;
        
        if (newVal >= 0 && newVal <= limit) {
            poule.viewedRoundIndex = newVal;
            this.renderAll();
        }
    }
    
    setLive(pouleId) {
        const poule = this.poules.find(p => p.id === pouleId);
        if (poule) {
            poule.liveRoundIndex = poule.viewedRoundIndex;
            this.renderAll();
        }
    }

    // ─── GESTION DE LA MODAL DE SCORE ──────────────────────────────────────────

    openScoreModal(pouleId, match, n1, n2, n3, n4) {
        this.editingPoule = this.poules.find(p => p.id === pouleId);
        this.editingMatch = match;
        
        this.dom.modal.querySelector('#modalMatchInfo').innerHTML = `<strong>${n1} & ${n2}</strong> vs <strong>${n3} & ${n4}</strong>`;
        this.dom.modal.querySelector('#score1').value = match.score1 !== null ? match.score1 : 0;
        this.dom.modal.querySelector('#score2').value = match.score2 !== null ? match.score2 : 0;
        
        // Focus auto avec sélection du texte
        setTimeout(() => {
            const input1 = this.dom.modal.querySelector('#score1');
            input1.focus();
            input1.select();
        }, 50);
        
        this.dom.modal.classList.add('active');
    }

    closeModal() {
         this.dom.modal.classList.remove('active');
         this.editingMatch = null;
         this.editingPoule = null;
    }

    saveScore() {
        if (this.editingMatch) {
            const s1 = parseInt(this.dom.modal.querySelector('#score1').value);
            const s2 = parseInt(this.dom.modal.querySelector('#score2').value);
            
            this.editingMatch.score1 = isNaN(s1) ? 0 : s1;
            this.editingMatch.score2 = isNaN(s2) ? 0 : s2;
            
            this.closeModal();
            this.renderAll(); // Met à jour la grille, et ça déclenchera _saveStateToDB
        }
    }

    // ─── RETRAIT DE JOUEURS (ABANDON) ──────────────────────────────────────────────────

    openRetraitModal() {
        const body = this.dom.retraitModal.querySelector('#retraitModalBody');
        body.innerHTML = '';

        this.poules.forEach(poule => {
            const col = document.createElement('div');
            col.className = 'retrait-poule-col';
            col.style.flex = '1';
            col.style.minWidth = '200px';
            col.style.border = '1px solid #ddd';
            col.style.borderRadius = '5px';
            col.style.padding = '10px';
            col.style.backgroundColor = '#f9f9f9';

            const h4 = document.createElement('h4');
            h4.textContent = poule.nom;
            h4.style.marginTop = '0';
            h4.style.textAlign = 'center';
            col.appendChild(h4);

            const list = document.createElement('div');
            list.className = 'retrait-joueurs-list';
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.gap = '8px';

            const joueursActifs = poule.joueurs
                .filter(j => !j.abandon)
                .sort((a, b) => a.nom.localeCompare(b.nom));
            
            if (joueursActifs.length === 0) {
                list.innerHTML = `<em style="color:#999; font-size:0.9em;">Aucun joueur actif</em>`;
            } else {
                joueursActifs.forEach(j => {
                    const badge = document.createElement('div');
                    const isF = j.genre === 'F';
                    badge.className = `joueur-badge p-name-${isF ? 'f' : 'h'}`;
                    badge.style.padding = '8px 12px';
                    badge.style.borderRadius = '20px';
                    badge.style.cursor = 'pointer';
                    badge.style.textAlign = 'center';
                    badge.style.userSelect = 'none';
                    badge.style.transition = 'all 0.2s';
                    
                    badge.textContent = `${j.nom.toUpperCase()} ${j.prenom || ''}`;
                    badge.dataset.id = j.id;
                    badge.dataset.pouleId = poule.id;

                    badge.addEventListener('click', () => {
                        badge.classList.toggle('selected');
                        if (badge.classList.contains('selected')) {
                            badge.style.backgroundColor = 'var(--color-danger, #e74c3c)';
                            badge.style.color = '#fff';
                            badge.style.borderColor = 'darkred';
                        } else {
                            // Remettre la couleur d'origine selon la classe CSS
                            badge.style.backgroundColor = '';
                            badge.style.color = '';
                            badge.style.borderColor = '';
                        }
                    });

                    list.appendChild(badge);
                });
            }

            col.appendChild(list);
            body.appendChild(col);
        });

        this.dom.retraitModal.classList.add('active');
    }

    async validerRetrait() {
        const selected = this.dom.retraitModal.querySelectorAll('.joueur-badge.selected');
        if (selected.length === 0) {
            alert("Veuillez sélectionner au moins un joueur à retirer.");
            return;
        }

        if (!confirm(`Vous allez retirer définitivement ${selected.length} joueur(s) à partir du tour courant. Continuer ?`)) {
            return;
        }

        // Grouper les IDs par poule
        const retraitsParPoule = {};
        selected.forEach(badge => {
            const pid = parseInt(badge.dataset.pouleId, 10);
            const jid = parseInt(badge.dataset.id, 10) || badge.dataset.id; // selon le type d'ID
            if (!retraitsParPoule[pid]) retraitsParPoule[pid] = [];
            retraitsParPoule[pid].push(jid);
        });

        let requiresUpdate = false;

        // Traiter chaque poule
        for (const pouleId in retraitsParPoule) {
            const idsToRemove = retraitsParPoule[pouleId];
            const poule = this.poules.find(p => p.id == pouleId);
            if (!poule) continue;

            // Marquer comme abandon
            poule.joueurs.forEach(j => {
                if (idsToRemove.includes(j.id)) j.abandon = true;
            });

            // L'ensemble des joueurs retirés (anciens + nouveaux)
            const allIdsToRemove = poule.joueurs.filter(j => j.abandon).map(j => j.id);

            // Ré-instancier le générateur V3 et regénérer à partir de `viewedRoundIndex`
            const genV3 = new window.GenerateurTournoiV3({
                joueurs: poule.joueurs, // Tous les joueurs sont passés (le générateur filtrera via allIdsToRemove)
                nbTours: poule.config?.nbTours || 10,
                nbTerrains: poule.config?.nbTerrains || poule.terrainsCount || 7,
                premierTerrain: poule.config?.premierTerrain || 1
            });
            // Appeler la nouvelle méthode qui rehydrate l'historique et recrée la suite
            const result = genV3.regenererApresRetrait(poule.tours, allIdsToRemove, poule.viewedRoundIndex);

            if (result.succes) {
                // Remplacer les tours
                poule.tours = genV3.tours;
                requiresUpdate = true;
            } else {
                alert(`Erreur de génération pour la poule ${poule.nom} : ${result.message}`);
            }
        }

        this.dom.retraitModal.classList.remove('active');

        if (requiresUpdate) {
            await this._saveStateToDB();
            this.renderAll();
            alert("Les joueurs ont été retirés et la suite du tournoi a été recalculée.");
        }
    }


    finirTournoi() {
        if (confirm("Êtes-vous sûr de vouloir terminer le tournoi et générer les classements finaux ?")) {
            // Sauvegarder l'état actuel
            this._saveStateToDB()
                .then(() => {
                    // Rediriger vers la page de classement
                    window.location.href = "classement.html";
                })
                .catch(err => {
                    console.error("Erreur lors de la sauvegarde avant la fin du tournoi", err);
                    alert("Erreur lors de la clôture du tournoi.");
                });
        }
    }

    // ─── CLASSEMENTS ──────────────────────────────────────────────────────────

    openClassementModal() {
        const statsParPoule = new Map();

        // 1. Initialiser les classements
        this.poules.forEach(poule => {
            const statsJoueurs = new Map();
            poule.joueurs.forEach(j => {
                if (j.abandon) return; // Ne pas afficher les joueurs retirés
                const id = j.id || (j.nom + j.prenom);
                statsJoueurs.set(id, {
                    id: id,
                    nom: j.nom,
                    prenom: j.prenom,
                    victoires: 0,
                    defaites: 0,
                    egalites: 0,
                    matchsJoues: 0,
                    pointsMarques: 0,
                    pointsEncaisses: 0,
                    pointsClassement: 0
                });
            });
            statsParPoule.set(poule.id, {
                nom: poule.nom,
                colorIndex: poule.colorIndex,
                joueurs: statsJoueurs
            });
        });

        // 2. Calculer les points sur tous les tours
        this.poules.forEach(poule => {
            const stats = statsParPoule.get(poule.id).joueurs;
            if (!poule.tours) return;

            poule.tours.forEach(tour => {
                // On limite aux matchs terminés avec un score
                if (!tour.matchs) return;
                tour.matchs.forEach(match => {
                    if (match.score1 === undefined || match.score2 === undefined || match.score1 === '' || match.score2 === '') return;

                    const score1 = parseInt(match.score1, 10);
                    const score2 = parseInt(match.score2, 10);
                    const diff = Math.abs(score1 - score2);

                    const isEgalite = diff <= 2;
                    const equipe1Gagne = !isEgalite && score1 > score2;
                    const equipe2Gagne = !isEgalite && score2 > score1;

                    // MAJ Equipe 1
                    if (match.equipe1) {
                        match.equipe1.forEach(j => {
                            if (!j) return;
                            const id = j.id || (j.nom + j.prenom);
                            if(stats.has(id)) {
                                const stat = stats.get(id);
                                stat.matchsJoues++;
                                stat.pointsMarques += score1;
                                stat.pointsEncaisses += score2;

                                if (isEgalite) { stat.egalites++; stat.pointsClassement += 2; }
                                else if (equipe1Gagne) { stat.victoires++; stat.pointsClassement += 3; }
                                else { stat.defaites++; stat.pointsClassement += 1; }
                            }
                        });
                    }

                    // MAJ Equipe 2
                    if (match.equipe2) {
                        match.equipe2.forEach(j => {
                            if (!j) return;
                            const id = j.id || (j.nom + j.prenom);
                            if(stats.has(id)) {
                                const stat = stats.get(id);
                                stat.matchsJoues++;
                                stat.pointsMarques += score2;
                                stat.pointsEncaisses += score1;

                                if (isEgalite) { stat.egalites++; stat.pointsClassement += 2; }
                                else if (equipe2Gagne) { stat.victoires++; stat.pointsClassement += 3; }
                                else { stat.defaites++; stat.pointsClassement += 1; }
                            }
                        });
                    }
                });
            });
        });

        // 3. Trier et générer l'affichage
        const container = document.getElementById('classementModalBody');
        container.innerHTML = '';

        statsParPoule.forEach(pouleInfo => {
            const joueurs = Array.from(pouleInfo.joueurs.values()).map(j => {
                const pointsDiff = j.pointsMarques - j.pointsEncaisses;
                // Calcul des ratios (division par le nombre de matchs joués)
                const ratioPoints = j.matchsJoues > 0 ? j.pointsClassement / j.matchsJoues : 0;
                const ratioDiff = j.matchsJoues > 0 ? pointsDiff / j.matchsJoues : 0;
                const ratioMarques = j.matchsJoues > 0 ? j.pointsMarques / j.matchsJoues : 0;
                
                return {
                    ...j,
                    pointsDiff,
                    ratioPoints,
                    ratioDiff,
                    ratioMarques
                };
            });

            // Tri par: Ratio de points, puis ratio de différence de points, puis ratio de points marqués
            joueurs.sort((a, b) => {
                if (b.ratioPoints !== a.ratioPoints) return b.ratioPoints - a.ratioPoints;
                if (b.ratioDiff !== a.ratioDiff) return b.ratioDiff - a.ratioDiff;
                return b.ratioMarques - a.ratioMarques;
            });

            // Affichage
            const pouleDiv = document.createElement('div');
            pouleDiv.style.flex = "1";
            pouleDiv.style.minWidth = "300px";

            let tableHtml = `
                <h4 style="margin-bottom: 10px; color: var(--color-poule-${pouleInfo.colorIndex}); border-bottom: 2px solid; padding-bottom: 5px;">${pouleInfo.nom}</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; text-align: center;">
                    <thead>
                        <tr style="background-color: #f1f2f6;">
                            <th style="padding: 8px;" title="Rang">#</th>
                            <th style="padding: 8px; text-align: left;">Joueur</th>
                            <th style="padding: 8px;" title="Matchs Joués">M</th>
                            <th style="padding: 8px;" title="Ratio de points par match (Pts / M)">Ratio Pts</th>
                            <th style="padding: 8px;" title="Points totaux">Pts total</th>
                            <th style="padding: 8px;" title="Victoires / Égalités / Défaites">V/E/D</th>
                            <th style="padding: 8px;" title="Ratio Différence (+/- par match)">Ratio +/-</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            const medailles = ['🥇', '🥈', '🥉'];

            joueurs.forEach((j, index) => {
                const rang = index < 3 ? medailles[index] : (index + 1);
                // Formater les ratios pour afficher maximum 2 décimales (ex: 2.5)
                const formatRatio = (val) => Number.isInteger(val) ? val : val.toFixed(2);
                
                tableHtml += `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">${rang}</td>
                        <td style="padding: 8px; text-align: left; font-weight: bold;">${j.nom} ${j.prenom}</td>
                        <td style="padding: 8px;">${j.matchsJoues}</td>
                        <td style="padding: 8px; font-weight: bold; color: #2980b9;">${formatRatio(j.ratioPoints)}</td>
                        <td style="padding: 8px; color: #7f8c8d;">${j.pointsClassement}</td>
                        <td style="padding: 8px; font-size: 0.9em; white-space: nowrap;">
                            <span style="color: #27ae60;">${j.victoires}</span> - 
                            <span style="color: #f39c12;">${j.egalites}</span> - 
                            <span style="color: #c0392b;">${j.defaites}</span>
                        </td>
                        <td style="padding: 8px; color: ${j.ratioDiff > 0 ? '#27ae60' : (j.ratioDiff < 0 ? '#c0392b' : '#7f8c8d')};">
                            ${j.ratioDiff > 0 ? '+' : ''}${formatRatio(j.ratioDiff)}
                        </td>
                    </tr>
                `;
            });

            tableHtml += `</tbody></table>`;
            pouleDiv.innerHTML = tableHtml;
            container.appendChild(pouleDiv);
        });

        this.dom.classementModal.classList.add('active');
    }

    // ─── STATISTIQUES ──────────────────────────────────────────────────────────

    openStatsModal() {
        const statsMap = new Map(); // id_joueur -> stats object

        // Initialiser tous les joueurs
        this.poules.forEach(poule => {
            poule.joueurs.forEach(j => {
                const id = j.id || (j.nom + j.prenom);
                statsMap.set(id, {
                    nom: j.nom,
                    prenom: j.prenom,
                    matchsJoues: 0,
                    toursBye: [],
                    pouleNom: poule.nom
                });
            });
        });

        // Parcourir tous les tours pour calculer
        this.poules.forEach(poule => {
            if (!poule.tours) return;
            poule.tours.forEach((tour, tourIdx) => {
                // Byes
                if (tour.byes) {
                    tour.byes.forEach(j => {
                        const id = j.id || (j.nom + j.prenom);
                        if (statsMap.has(id)) {
                            statsMap.get(id).toursBye.push(tourIdx + 1);
                        }
                    });
                }
                
                // Matchs 
                if (tour.matchs) {
                    tour.matchs.forEach(m => {
                        const joueursMatch = [...m.equipe1, ...m.equipe2];
                        joueursMatch.forEach(j => {
                            if (j) {
                                const id = j.id || (j.nom + j.prenom);
                                if (statsMap.has(id)) {
                                    statsMap.get(id).matchsJoues++;
                                }
                            }
                        });
                    });
                }
            });
        });

        const joueursStats = Array.from(statsMap.values());
        
        // Tri alphabétique (Poule > Nom > Prénom)
        joueursStats.sort((a, b) => {
            if (a.pouleNom !== b.pouleNom) return a.pouleNom.localeCompare(b.pouleNom);
            if (a.nom !== b.nom) return (a.nom || '').localeCompare(b.nom || '');
            return (a.prenom || '').localeCompare(b.prenom || '');
        });

        // Couleurs de fond pastel très légères par poule
        const distinctPoules = [...new Set(joueursStats.map(s => s.pouleNom))];
        const pastelColors = ['#fdf2e9', '#eaf2f8', '#e8f8f5', '#fef9e7', '#f5eef8', '#eaeded'];
        const bgColors = {};
        distinctPoules.forEach((p, i) => { bgColors[p] = pastelColors[i % pastelColors.length]; });

        // Construire les lignes HTML
        const rowsHTML = joueursStats.map(s => {
            // Ecart min
            let ecartMin = '-';
            if (s.toursBye.length >= 2) {
                const sortedByes = [...s.toursBye].sort((a,b) => a-b);
                let minDiff = Infinity;
                for (let i = 1; i < sortedByes.length; i++) {
                    const diff = sortedByes[i] - sortedByes[i-1];
                    if (diff < minDiff) minDiff = diff;
                }
                ecartMin = minDiff;
            }

            return `
                <tr style="background-color: ${bgColors[s.pouleNom]};">
                    <td><strong>${s.nom || '?'}</strong></td>
                    <td>${s.prenom || ''}</td>
                    <td>${s.pouleNom}</td>
                    <td style="text-align: center;">${s.matchsJoues}</td>
                    <td>${s.toursBye.length > 0 ? s.toursBye.join(', ') : 'Aucun'}</td>
                    <td style="text-align: center;"><strong>${ecartMin}</strong></td>
                </tr>
            `;
        }).join('');

        const tableHTML = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Poule</th>
                        <th style="text-align: center;">Matchs</th>
                        <th>Tours BYE (Sortant)</th>
                        <th style="text-align: center;">Écart Min</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
        `;

        this.dom.statsModal.querySelector('#statsTableContainer').innerHTML = tableHTML;
        this.dom.statsModal.classList.add('active');
    }

    // ─── PERSISTANCE ───────────────────────────────────────────────────────────
    

    _syncAffichage() {
        if (!this.poules) return;
        let terrains = [];
        for (let i = 1; i <= this.terrainsCount; i++) {
            let info = this._getLivePouleAndMatchForCourt(i);
            if (info) {
                let e1 = info.match.equipe1.filter(Boolean);
                let e2 = info.match.equipe2.filter(Boolean);
                
                terrains.push({
                    numero: i,
                    occupe: true,
                    poule: info.poule.nom,
                    pouleColor: info.poule.colorIndex || 1,
                    score1: typeof info.match.score1 === 'number' ? info.match.score1 : '',
                    score2: typeof info.match.score2 === 'number' ? info.match.score2 : '',
                    equipe1: e1.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / '),
                    equipe2: e2.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / ')
                });
            } else {
                terrains.push({ numero: i, occupe: false });
            }
        }
        
        let byes = [];
        this.poules.forEach(p => {
            let targetIdx = p.liveRoundIndex !== undefined ? p.liveRoundIndex : (p.tours.length - 1);
            if (targetIdx !== -1 && p.tours[targetIdx]) {
                 let tour = p.tours[targetIdx];
                 let pouleByes = [];
                 (tour.byes || []).forEach(j => {
                     if(j) pouleByes.push(j.prenom + " " + (j.nom ? j.nom.charAt(0)+'.' : ''));
                 });
                 if (pouleByes.length > 0) {
                     byes.push({ poule: p.nom, color: p.colorIndex || 1, joueurs: pouleByes });
                 }
            }
        });

        let timerData = null;
        if (this.timer) {
            timerData = {
                display: Timer.formatTime(this.timer.getRemaining()),
                running: this.timer.getState() === 'running',
                paused: this.timer.getState() === 'paused'
            };
        }

        const data = {
            mode: 'tournoi',
            terrains,
            byes,
            timer: timerData,
            timestamp: Date.now()
        };
        localStorage.setItem('affichage_v3_data', JSON.stringify(data));
    }

    async _saveStateToDB() {
        // Met à jour this.db._cache.poules avec this.poules modifiés.
        // Puisque nous utilisons importState en remplaçant tout d'un coup dans l'accueil,
        // on peut juste ré-importer l'état poules dans TournoiDB (qui le serialisera).
        
        const state = this.db.exportState();
        state.poules = this.poules; // On écrase
        await this.db.importState(state);
    }
}

// Export global
window.TournoiPage = TournoiPage;