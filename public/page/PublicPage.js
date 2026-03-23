class PublicPage {
    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="public-container">
                <header class="public-header">
                    <h1>🏆 Saisie des Scores (Public)</h1>
                    <button id="btn-back-home" class="btn">Retour</button>
                    <button id="btn-refresh" class="btn btn-secondary">🔄 Rafraîchir</button>
                </header>
                
                <div class="public-content">
                    <div id="selection-area"></div>
                    <div id="matchs-list" class="hidden"></div>
                </div>
            </div>

            <!-- Modale de saisie de score -->
            <div id="score-modal" class="modal hidden">
                <div class="modal-content">
                    <h2>Saisir le score</h2>
                    <p id="score-match-desc"></p>
                    
                    <div class="score-inputs">
                        <div class="equipe-score">
                            <label id="label-eq1"></label>
                            <input type="number" id="input-score1" min="0" max="99" value="0">
                        </div>
                        <span class="vs-text">-</span>
                        <div class="equipe-score">
                            <label id="label-eq2"></label>
                            <input type="number" id="input-score2" min="0" max="99" value="0">
                        </div>
                    </div>

                    <div id="score-error" class="error-text hidden"></div>

                    <div class="modal-actions">
                        <button id="btn-score-cancel" class="btn">Annuler</button>
                        <button id="btn-score-confirm" class="btn btn-primary">Valider (Verrouiller)</button>
                    </div>
                </div>
            </div>
        `;

        this.currentPouleId = null;
        this.currentTour = null;
        this.allMatchs = [];
        this.poulesMap = {};

        this.bindEvents();
        await this.loadData();
        
        if (window.io && !window.publicSocketInit) {
            window.publicSocketInit = true;
            const socket = io();
            socket.on('data_updated', () => this.loadDataSilent());
        } else if (!window.io) {
            // Auto-refresh silencieux toutes les 5 secondes en fallback
            if (window.publicPollInterval) clearInterval(window.publicPollInterval);
            window.publicPollInterval = setInterval(() => this.loadDataSilent(), 5000);
        }
    }

    async loadDataSilent(force = false) {
        // Ne pas interrompre si l'utilisateur est en train de saisir un score
        if (!force) {
            const modal = this.container.querySelector('#score-modal');
            if (modal && !modal.classList.contains('hidden')) return;
        }

        try {
            const resMatchs = await fetch('/api/matchs');
            if (!resMatchs.ok) return;
            const dataMatchs = await resMatchs.json();
            
            const newMatchs = dataMatchs.matchs || [];
            
            // Vérifier s'il y a un changement (nombre ou ids des matchs)
            const oldIds = this.allMatchs.map(m => m.id).sort().join(',');
            const newIds = newMatchs.map(m => m.id).sort().join(',');

            if (oldIds !== newIds) {
                // S'il y a une différence (un match a été validé ou ajouté)
                this.allMatchs = newMatchs;

                // On actualise la liste selon là où se trouve l'utilisateur
                if (this.currentPouleId && this.currentTour) {
                    this.renderMatchs();
                } else {
                    this.renderSelection();
                }
            }
        } catch (e) {
            // Silence e
        }
    }

    async loadData() {
        const selectionArea = this.container.querySelector('#selection-area');
        const listContainer = this.container.querySelector('#matchs-list');
        selectionArea.innerHTML = "<p>Chargement des données du tournoi...</p>";
        listContainer.classList.add('hidden');

        try {
            // Récupérer la structure du tournoi pour avoir les noms des poules
            const resTournoi = await fetch('/api/tournoi');
            const dataTournoi = await resTournoi.json();
            
            if (dataTournoi.poules) {
                dataTournoi.poules.forEach(p => {
                    this.poulesMap[p.id.toString()] = p.nom;
                });
            }

            // Récupérer les matchs déverrouillés
            const resMatchs = await fetch('/api/matchs');
            const dataMatchs = await resMatchs.json();

            this.allMatchs = dataMatchs.matchs || [];

            if (this.allMatchs.length === 0) {
                selectionArea.innerHTML = "<p>Aucun match en attente de score actuellement.</p>";
                return;
            }

            this.renderSelection();

        } catch (e) {
            console.error(e);
            selectionArea.innerHTML = "<p>Erreur lors du chargement des matchs.</p>";
        }
    }

    renderSelection() {
        const selectionArea = this.container.querySelector('#selection-area');
        
        // 1. Si aucune poule n'est sélectionnée, on liste les poules disponibles
        if (!this.currentPouleId) {
            // Trouver les poules qui ont des matchs en attente
            const poulesIds = [...new Set(this.allMatchs.map(m => m.poule_id))];
            
            let html = '<h2>1. Choisissez la Poule :</h2><div class="button-grid">';
            poulesIds.forEach(id => {
                const nom = this.poulesMap[id] || `Poule ${id}`;
                html += `<button class="btn btn-primary size-large btn-select-poule" data-id="${id}">${nom}</button>`;
            });
            html += '</div>';
            
            selectionArea.innerHTML = html;

            selectionArea.querySelectorAll('.btn-select-poule').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.currentPouleId = e.target.dataset.id;
                    this.currentTour = null; 
                    this.renderSelection(); // Passer à l'étape suivante
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
            return;
        }

        // 2. Si un poule est sélectionnée mais pas de tour
        if (!this.currentTour) {
            // Trouver les tours pour cette poule spécifique
            const matchsPoule = this.allMatchs.filter(m => m.poule_id == this.currentPouleId);
            const tours = [...new Set(matchsPoule.map(m => m.tour_numero))].sort((a, b) => a - b);

            const pouleName = this.poulesMap[this.currentPouleId] || `Poule ${this.currentPouleId}`;

            let html = `
                <div class="breadcrumb">
                    <button class="btn btn-secondary btn-back-step">🔙 Retour aux Poules</button>
                    <span><strong>${pouleName}</strong></span>
                </div>
                <h2>2. Choisissez le Tour :</h2>
                <div class="button-grid">
            `;

            tours.forEach(tour => {
                html += `<button class="btn btn-primary size-large btn-select-tour" data-tour="${tour}">Tour ${tour}</button>`;
            });
            html += '</div>';

            selectionArea.innerHTML = html;

            selectionArea.querySelector('.btn-back-step').addEventListener('click', () => {
                this.currentPouleId = null;
                this.renderSelection();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            selectionArea.querySelectorAll('.btn-select-tour').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.currentTour = e.target.dataset.tour;
                    // Afficher les matchs !
                    this.renderMatchs();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
            return;
        }
    }

    renderMatchs() {
        const selectionArea = this.container.querySelector('#selection-area');
        const listContainer = this.container.querySelector('#matchs-list');
        
        selectionArea.classList.add('hidden');
        listContainer.classList.remove('hidden');

        const pouleName = this.poulesMap[this.currentPouleId] || `Poule ${this.currentPouleId}`;
        const matchsToShow = this.allMatchs.filter(m => m.poule_id == this.currentPouleId && m.tour_numero == this.currentTour);

            // Trier les matchs par numéro de terrain, puis par tour
            matchsToShow.sort((a, b) => {
                if (a.terrain !== b.terrain) return a.terrain.localeCompare(b.terrain);
                return a.tour_numero - b.tour_numero;
            });

            let html = `
                <div class="breadcrumb" style="margin-bottom: 20px;">
                    <button class="btn btn-secondary btn-back-step">🔙 Choix du tour</button>
                    <span><strong>${pouleName} - Tour ${this.currentTour}</strong></span>
                </div>
                <h2>3. Choisissez le terrain :</h2>
                <div class="match-grid">
            `;

            matchsToShow.forEach(matchInfo => {
                const match = JSON.parse(matchInfo.json_detail);
                
                const getNomEquipe = (equipe) => {
                    if (!equipe || equipe.length === 0) return "Bye / En attente";
                    return equipe.map(j => `${j.prenom ? j.prenom + ' ' : ''}${j.nom}`).join(' & ');
                };

                const eq1 = getNomEquipe(match.equipe1);
                const eq2 = getNomEquipe(match.equipe2);
                const isBye = match.equipe1?.length === 0 || match.equipe2?.length === 0;

                if (!isBye) {
                    html += `
                        <div class="match-card" data-id="${matchInfo.id}" data-eq1="${eq1}" data-eq2="${eq2}">
                            <div class="match-card-header">
                                <span class="badge">Terrain ${matchInfo.terrain}</span>
                            </div>
                            <div class="match-card-body">
                                <div>${eq1}</div>
                                <div class="vs">VS</div>
                                <div>${eq2}</div>
                            </div>
                            <button class="btn btn-primary btn-saisir">Saisir le score</button>
                        </div>
                    `;
                }
            });

        if (matchsToShow.length === 0 || matchsToShow.every(m => {
            const parsed = JSON.parse(m.json_detail);
            return !parsed.equipe1 || parsed.equipe1.length === 0 || !parsed.equipe2 || parsed.equipe2.length === 0;
        })) {
             html += `<p>Aucun match jouable (ou que des BYE) dans ce tour pour le moment.</p>`;
        }

        html += '</div>';
        listContainer.innerHTML = html;

        listContainer.querySelector('.btn-back-step').addEventListener('click', () => {
            this.currentTour = null;
            listContainer.classList.add('hidden');
            selectionArea.classList.remove('hidden');
            this.renderSelection();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        this.bindMatchEvents();
    }

    bindEvents() {
        const btnBack = this.container.querySelector('#btn-back-home');
        const btnRefresh = this.container.querySelector('#btn-refresh');
        
        btnBack.addEventListener('click', () => {
            const gate = new GatePage();
            gate.render(this.container);
        });

        btnRefresh.addEventListener('click', async () => {
            // Lors du raffraichissement, on retourne à l'étape 1 pour être sûr d'avoir les données à jour
            this.currentPouleId = null;
            this.currentTour = null;
            this.container.querySelector('#matchs-list').classList.add('hidden');
            this.container.querySelector('#selection-area').classList.remove('hidden');
            await this.loadData();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Event Modal Score
        const modal = this.container.querySelector('#score-modal');
        const btnCancel = this.container.querySelector('#btn-score-cancel');
        const btnConfirm = this.container.querySelector('#btn-score-confirm');
        const inputScore1 = this.container.querySelector('#input-score1');
        const inputScore2 = this.container.querySelector('#input-score2');

        // Auto-sélection du contenu au focus (pratique sur smartphone)
        inputScore1.addEventListener('focus', () => inputScore1.select());
        inputScore2.addEventListener('focus', () => inputScore2.select());

        btnCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
            // En sortant, on s'assure d'avoir les données à jour (ratées pendant la saisie)
            this.loadDataSilent();
        });

        btnConfirm.addEventListener('click', async () => {
            const matchId = modal.dataset.matchId;
            const score1 = parseInt(this.container.querySelector('#input-score1').value, 10) || 0;
            const score2 = parseInt(this.container.querySelector('#input-score2').value, 10) || 0;
            const errorText = this.container.querySelector('#score-error');

            const originalText = btnConfirm.textContent;
            btnConfirm.textContent = "Validation...";
            btnConfirm.disabled = true;

            try {
                const token = localStorage.getItem('adminToken'); // Si jamais c'est un admin
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = token;

                const response = await fetch(`/api/matchs/${matchId}/score`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ score1, score2 })
                });

                const data = await response.json();

                if (data.success) {
                    modal.classList.add('hidden');
                    // Recharge sans changer d'état
                    await this.loadData();
                    this.renderMatchs();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    errorText.textContent = data.message || "Erreur de validation.";
                    errorText.classList.remove('hidden');
                    // On force le rechargement en arrière-plan pour retirer le match verrouillé
                    this.loadDataSilent(true);
                }
            } catch (err) {
                errorText.textContent = "Erreur de connexion au serveur.";
                errorText.classList.remove('hidden');
            } finally {
                btnConfirm.textContent = originalText;
                btnConfirm.disabled = false;
            }
        });
    }

    bindMatchEvents() {
        const cards = this.container.querySelectorAll('.match-card');
        const modal = this.container.querySelector('#score-modal');
        const desc = this.container.querySelector('#score-match-desc');
        const labelEq1 = this.container.querySelector('#label-eq1');
        const labelEq2 = this.container.querySelector('#label-eq2');
        const input1 = this.container.querySelector('#input-score1');
        const input2 = this.container.querySelector('#input-score2');
        const errorText = this.container.querySelector('#score-error');

        cards.forEach(card => {
            const btn = card.querySelector('.btn-saisir');
            btn.addEventListener('click', () => {
                const id = card.dataset.id;
                const eq1 = card.dataset.eq1;
                const eq2 = card.dataset.eq2;

                modal.dataset.matchId = id;
                desc.textContent = "Une fois saisi, ce score sera verrouillé.";
                labelEq1.textContent = eq1;
                labelEq2.textContent = eq2;
                input1.value = 0;
                input2.value = 0;
                errorText.classList.add('hidden');

                modal.classList.remove('hidden');
            });
        });
    }
}
