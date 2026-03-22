/**
 * ClassementPage.js - V3
 */

class ClassementPage {
    constructor(db) {
        this.db = db;
        this.etat = null;
        this.tournoi = null;
        this.poulesInit = [];
        this.joueurs = [];
        
        this.nbPoulesSplit = 2;
        this.terrainsParPoule = [];
        this.nomsPoules = [];
        
        // Structure de redistribution: un tableau de tableaux de joueurs
        this.repartitionPoules = [];
        setInterval(() => this._syncAffichage(), 1000);
    }

    async render(container) {
        this.container = container;
        container.innerHTML = '<div class="loading">Chargement...</div>';
        
        await this.loadData();
        
        this._buildHTML();
        this._attachEvents();
    }

    async loadData() {
        this.tournoi = await this.db.getTournoi();
        this.poulesInit = await this.db.getPoules() || [];
        
        // Initialiser l'état local pour les poules cibles
        const defaultTerrains = this.tournoi?.nbTerrains || 7;
        let tc1 = Math.round(defaultTerrains / 2) || 4;
        let tc2 = Math.max(1, defaultTerrains - tc1) || 3;
        
        if (this.terrainsParPoule.length === 0) {
            this.terrainsParPoule = [tc1, tc2];
            this.nomsPoules = ['Poule Haute', 'Poule Basse'];
        }
        
        // 1. Calcul des statistiques depuis l'historique des matchs
        const statsParPoule = new Map();

        this.poulesInit.forEach(poule => {
            const statsJoueurs = new Map();
            poule.joueurs.forEach(j => {
                if (j.abandon) return; // Ne pas inclure les joueurs retirés
                const id = j.id || (j.nom + j.prenom);
                statsJoueurs.set(id, {
                    ...j,
                    pouleIdsInit: poule.id,
                    pouleNomInit: poule.nom,
                    victoires: 0,
                    defaites: 0,
                    nuls: 0,
                    matchsJoues: 0,
                    pointsMarques: 0,
                    pointsEncaisses: 0,
                    pointsClassement: 0
                });
            });
            statsParPoule.set(poule.id, statsJoueurs);
        });

        // 2. Calculer les points sur tous les tours de toutes les poules
        this.poulesInit.forEach(poule => {
            const stats = statsParPoule.get(poule.id);
            if (!poule.tours) return;

            poule.tours.forEach(tour => {
                if (!tour.matchs) return;
                tour.matchs.forEach(match => {
                    if (match.score1 === undefined || match.score2 === undefined || match.score1 === '' || match.score2 === '') return;

                    const score1 = parseInt(match.score1, 10);
                    const score2 = parseInt(match.score2, 10);
                    const diff = Math.abs(score1 - score2);

                    const isEgalite = diff <= 2;
                    const equipe1Gagne = !isEgalite && score1 > score2;
                    const equipe2Gagne = !isEgalite && score2 > score1;

                    if (match.equipe1) {
                        match.equipe1.forEach(j => {
                            if (!j) return;
                            const id = j.id || (j.nom + j.prenom);
                            if(stats.has(id)) {
                                const stat = stats.get(id);
                                stat.matchsJoues++;
                                stat.pointsMarques += score1;
                                stat.pointsEncaisses += score2;

                                if (isEgalite) { stat.nuls++; stat.pointsClassement += 2; }
                                else if (equipe1Gagne) { stat.victoires++; stat.pointsClassement += 3; }
                                else { stat.defaites++; stat.pointsClassement += 1; }
                            }
                        });
                    }

                    if (match.equipe2) {
                        match.equipe2.forEach(j => {
                            if (!j) return;
                            const id = j.id || (j.nom + j.prenom);
                            if(stats.has(id)) {
                                const stat = stats.get(id);
                                stat.matchsJoues++;
                                stat.pointsMarques += score2;
                                stat.pointsEncaisses += score1;

                                if (isEgalite) { stat.nuls++; stat.pointsClassement += 2; }
                                else if (equipe2Gagne) { stat.victoires++; stat.pointsClassement += 3; }
                                else { stat.defaites++; stat.pointsClassement += 1; }
                            }
                        });
                    }
                });
            });
        });

        // 3. Aplatir en calculant les ratios
        this.joueurs = [];
        statsParPoule.forEach(statsJoueurs => {
            statsJoueurs.forEach(j => {
                const pointsDiff = j.pointsMarques - j.pointsEncaisses;
                j.ratioPoints = j.matchsJoues > 0 ? j.pointsClassement / j.matchsJoues : 0;
                j.ratioDiff = j.matchsJoues > 0 ? pointsDiff / j.matchsJoues : 0;
                this.joueurs.push(j);
            });
        });
        
        // Tri général (pour la répartition automatique globale)
        this.joueurs.sort((a, b) => {
            if (b.ratioPoints !== a.ratioPoints) return b.ratioPoints - a.ratioPoints;
            if (b.ratioDiff !== a.ratioDiff) return b.ratioDiff - a.ratioDiff;
            return b.pointsClassement - a.pointsClassement;
        });
        
        this._calculerRepartition();
    }

    _updatePoulesCount(newCount) {
        const old = this.nbPoulesSplit;
        this.nbPoulesSplit = newCount;
        if (newCount > old) {
            for (let i = old; i < newCount; i++) {
                this.terrainsParPoule.push(4); // Valeur par défaut si on ajoute
                this.nomsPoules.push(`Nouvelle Poule ${i + 1}`);
            }
        } else if (newCount < old) {
            this.terrainsParPoule.length = newCount;
            this.nomsPoules.length = newCount;
        }
    }

    _calculerRepartition() {
        this.repartitionPoules = Array.from({ length: this.nbPoulesSplit }, () => []);
        if (this.nbPoulesSplit === 1) {
            this.repartitionPoules[0] = [...this.joueurs];
            return;
        }
        
        let totalTerrains = this.terrainsParPoule.reduce((a, b) => a + b, 0) || 1;
        let totalJoueurs = this.joueurs.length;
        
        let indexCourant = 0;
        for (let i = 0; i < this.nbPoulesSplit; i++) {
            if (i === this.nbPoulesSplit - 1) {
                this.repartitionPoules[i] = this.joueurs.slice(indexCourant);
            } else {
                let proportion = this.terrainsParPoule[i] / totalTerrains;
                let nbDansPoule = Math.floor(proportion * totalJoueurs);
                this.repartitionPoules[i] = this.joueurs.slice(indexCourant, indexCourant + nbDansPoule);
                indexCourant += nbDansPoule;
            }
        }
    }

    _buildTerrainsSpinners() {
        if (this.nbPoulesSplit < 2) return '';
        let html = '';
        for (let i = 0; i < this.nbPoulesSplit; i++) {
            html += `
            <label>
                Terrains P${i+1}:
                <input type="number" class="spin-controle spin-terrain" data-idx="${i}" value="${this.terrainsParPoule[i]}" min="1">
            </label>
            `;
        }
        return html;
    }

    _buildHTML() {
        let html = `
            <div class="classement-page">
                <header class="header-classement">
                    <h1>🏆 Classement Final - ${this.tournoi?.nom || 'Tournoi V3'}</h1>
                    <div class="header-actions">
                        <div class="proj-controls" style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px; display: flex; align-items: center; gap: 10px; margin-right: 15px;">
                            <label style="font-size: 0.85em; cursor: pointer;"><input type="radio" name="proj_mode" value="bloc1" checked> Afficher Bloc 1 (Classement)</label>
                            <label style="font-size: 0.85em; cursor: pointer;"><input type="radio" name="proj_mode" value="bloc2"> Afficher Bloc 2 (Nouvelles Poules)</label>
                            <button class="btn-action" style="background:#8e44ad; font-weight:bold; padding: 4px 8px;" id="btn-open-proj-class">📺 Vidéoprojecteur</button>
                        </div>
                        <button class="btn-action" style="background:#e74c3c;" onclick="window.location.href='tournoi.html'">⬅ Retour</button>
                    </div>
                </header>
                
                <main class="main-content">
                    <section class="section-top">
                        <h2>🏅 Classements par Poule (Manche précédente)</h2>
                        <div class="classements-container">
                            ${this._buildClassementsPoulesHTML()}
                        </div>
                    </section>
                    
                    <section class="section-bottom">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h2 style="margin: 0;">🔄 Répartition pour la suite</h2>
                            <button class="btn-action btn-export" id="btn-export-xlsx">📊 Export vers XLSX</button>
                        </div>
                        <div class="repartition-controls">
                            <label>
                                Nb Poules:
                                <input type="number" id="spin-nb-poules" class="spin-controle" value="${this.nbPoulesSplit}" min="1" max="10">
                            </label>
                            ${this._buildTerrainsSpinners()}
                            <button id="btn-recalcul" class="btn-action" style="margin-left:15px; background:#2980b9;">⟳ Recalculer Répartition</button>
                        </div>
                        <p style="color:#666; font-size:0.9em; margin-bottom: 10px;"><i>Info: Glissez-déposez les joueurs pour affiner. Double-cliquez sur le nom d'une poule pour la renommer.</i></p>
                        <div class="poules-dnd-container">
                            ${this._buildDNDPoulesHTML()}
                        </div>
                    </section>
                </main>
            </div>
        `;
        
        this.container.innerHTML = html;
    }

    _buildClassementsPoulesHTML() {
        let html = '';
        this.poulesInit.forEach(poule => {
            let joueursPoule = this.joueurs.filter(j => j.pouleIdsInit === poule.id);
            if (joueursPoule.length === 0) return;
            
            joueursPoule.sort((a, b) => {
                if (b.ratioPoints !== a.ratioPoints) return b.ratioPoints - a.ratioPoints;
                if (b.ratioDiff !== a.ratioDiff) return b.ratioDiff - a.ratioDiff;
                return b.pointsClassement - a.pointsClassement;
            });
            
            html += `
                <div class="poule-classement">
                    <h3>${poule.nom}</h3>
                    <table class="table-stats">
                        <thead>
                            <tr>
                                <th>Rang</th>
                                <th>Joueur</th>
                                <th>Pts/M</th>
                                <th>Diff/M</th>
                                <th>Matchs</th>
                                <th>V/N/D</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${joueursPoule.map((j, idx) => `
                                <tr>
                                    <td>${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                                    <td>${j.prenom} ${j.nom}</td>
                                    <td>${j.ratioPoints.toFixed(2)}</td>
                                    <td>${j.ratioDiff.toFixed(2)}</td>
                                    <td>${j.matchsJoues}</td>
                                    <td><span style="color:green">${j.victoires}</span> / <span style="color:orange">${j.nuls}</span> / <span style="color:red">${j.defaites}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });
        return html;
    }

    _buildDNDPoulesHTML() {
        let html = '';
        this.repartitionPoules.forEach((pool, i) => {
            html += `
                <div class="dnd-poule" data-poule-idx="${i}">
                    <h4>
                        <span class="editable-title" data-idx="${i}" title="Double-clic pour modifier">${this.nomsPoules[i]}</span> 
                        <span class="badge-count">${pool.length} joueurs</span>
                    </h4>
                    <div class="dnd-zone" data-poule-idx="${i}">
                        ${pool.map(j => `
                            <div class="joueur-badge ${j.genre === 'F' ? 'joueur-badge-f' : 'joueur-badge-h'}" draggable="true" data-id="${j.id}">
                                ☰ ${j.prenom} ${j.nom} (${j.ratioPoints.toFixed(2)})
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        return html;
    }


    _attachEditableEvents() {
        const editables = this.container.querySelectorAll('.editable-title');
        editables.forEach(el => {
            el.addEventListener('dblclick', (e) => {
                e.target.contentEditable = true;
                e.target.focus();
            });
            el.addEventListener('blur', (e) => {
                e.target.contentEditable = false;
                const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                let newText = e.target.textContent.trim();
                if (newText) {
                    this.nomsPoules[idx] = newText;
                } else {
                    e.target.textContent = this.nomsPoules[idx];
                }
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });
    }


    _syncAffichage() {
        // Collect data
        let mode = 'classement-bloc1';
        const radio = document.querySelector('input[name="proj_mode"]:checked');
        if (radio) mode = radio.value === 'bloc2' ? 'classement-bloc2' : 'classement-bloc1';

        const data = {
            mode: mode,
            poulesInit: this.poulesInit,
            joueurs: this.joueurs,
            repartitionPoules: this.repartitionPoules,
            nomsPoules: this.nomsPoules,
            timestamp: Date.now()
        };
        localStorage.setItem('affichage_v3_data', JSON.stringify(data));
    }

    _attachEvents() {
        const spinPoules = this.container.querySelector('#spin-nb-poules');
        if (spinPoules) {
            spinPoules.addEventListener('change', (e) => {
                let val = parseInt(e.target.value, 10) || 1;
                this._updatePoulesCount(val);
                this._calculerRepartition();
                this._buildHTML(); 
                this._attachEvents();
            });
        }
        
        const spinTerrains = this.container.querySelectorAll('.spin-terrain');
        spinTerrains.forEach(spin => {
            spin.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                this.terrainsParPoule[idx] = parseInt(e.target.value, 10) || 1;
            });
        });
        
        const btnRecalcul = this.container.querySelector('#btn-recalcul');
        if (btnRecalcul) {
            btnRecalcul.addEventListener('click', () => {
                this._calculerRepartition();
                this._buildHTML();
                this._attachEvents();
            });
        }
        
        const btnExport = this.container.querySelector('#btn-export-xlsx');
        if (btnExport) {
            btnExport.addEventListener('click', () => this._exporterXLSX());
        }

        const btnProj = this.container.querySelector('#btn-open-proj-class');
        if (btnProj) {
            btnProj.addEventListener('click', () => {
                window.open('affichage.html', 'AffichageTournoiV3', 'menubar=no,toolbar=no,location=no,status=no');
            });
        }

        // Mode édition titre
        this._attachEditableEvents();
        
        // Drag and drop events using Delegation
        const dndContainer = this.container.querySelector('.poules-dnd-container');
        if (dndContainer) {
            dndContainer.addEventListener('dragstart', (e) => {
                const draggable = e.target.closest('.joueur-badge');
                if (draggable) {
                    const id = draggable.getAttribute('data-id');
                    const zone = draggable.closest('.dnd-poule');
                    const pouleIdx = zone ? zone.getAttribute('data-poule-idx') : null;
                    
                    if(e.dataTransfer && pouleIdx !== null) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", JSON.stringify({id, pouleIdx}));
                    }
                    setTimeout(() => draggable.classList.add('dragging'), 0);
                }
            });
            
            dndContainer.addEventListener('dragend', (e) => {
                const draggable = e.target.closest('.joueur-badge');
                if (draggable) draggable.classList.remove('dragging');
            });

            dndContainer.addEventListener('dragenter', (e) => {
                const zone = e.target.closest('.dnd-poule');
                if (zone) {
                    e.preventDefault();

                }
            });

            dndContainer.addEventListener('dragover', (e) => {
                const zone = e.target.closest('.dnd-poule');
                if (zone) {
                    e.preventDefault(); 
                    if(e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                }
            });

            dndContainer.addEventListener('dragleave', (e) => {
                const zone = e.target.closest('.dnd-poule');
                if (zone && !zone.contains(e.relatedTarget)) {

                }
            });

            dndContainer.addEventListener('drop', (e) => {
                const zone = e.target.closest('.dnd-poule');
                if (zone) {
                    e.preventDefault();

                    
                    try {
                        const dataStr = e.dataTransfer.getData("text/plain");
                        if (!dataStr) return;
                        
                        const data = JSON.parse(dataStr);
                        const targetIdx = parseInt(zone.getAttribute('data-poule-idx'), 10);
                        const sourceIdx = parseInt(data.pouleIdx, 10);
                        
                        if (!isNaN(targetIdx) && !isNaN(sourceIdx) && targetIdx !== sourceIdx) {
                            const sourcePoule = this.repartitionPoules[sourceIdx];
                            const targetPoule = this.repartitionPoules[targetIdx];
                            
                            const joueurIdx = sourcePoule.findIndex(j => String(j.id) === String(data.id));
                            if(joueurIdx !== -1) {
                                const [joueur] = sourcePoule.splice(joueurIdx, 1);
                                targetPoule.push(joueur);
                                
                                // Re-render only the DND area
                                dndContainer.innerHTML = this._buildDNDPoulesHTML();
                                this._attachEditableEvents();
                                this._updateCountsAndRender();
                            }
                        }
                    } catch(err) {
                        console.error("Drop error:", err);
                    }
                }
            });
        }
    }
 _getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.joueur-badge:not(.dragging)')];
        let closestSibling = null;
        
        for (let child of draggableElements) {
            const box = child.getBoundingClientRect();
            // child correspond au tag juste après le curseur
            const isCursorAboveRow = y < box.top - 10;
            const isCursorBeforeInRow = (y >= box.top - 10 && y <= box.bottom + 10) && x < (box.left + box.width / 2);
            
            if (isCursorAboveRow || isCursorBeforeInRow) {
                closestSibling = child;
                break;
            }
        }
        return closestSibling;
    }

    _updateRepartitionArray() {
        const zones = this.container.querySelectorAll('.dnd-zone');
        this.repartitionPoules = Array.from(zones).map(zone => {
            const badges = zone.querySelectorAll('.joueur-badge');
            return Array.from(badges).map(badge => {
                const id = badge.getAttribute('data-id');
                return this.joueurs.find(j => String(j.id) === String(id));
            });
        });
    }

    _updateCountsAndRender() {
        const zones = this.container.querySelectorAll('.dnd-zone');
        zones.forEach((zone, idx) => {
            const countSpan = zone.parentElement.querySelector('.badge-count');
            const num = zone.querySelectorAll('.joueur-badge').length;
            if (countSpan) countSpan.textContent = `${num} joueurs`;
        });
    }

    _exporterXLSX() {
        if (typeof XLSX === 'undefined') {
            alert("Librairie XLSX non chargée.");
            return;
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}_${hh}${min}`;

        // ==========================================
        // 1er Fichier : Classement par Poule
        // ==========================================
        const wbClassement = XLSX.utils.book_new();

        this.poulesInit.forEach(poule => {
            let joueursPoule = this.joueurs.filter(j => j.pouleIdsInit === poule.id);
            if(joueursPoule.length === 0) return;

            joueursPoule.sort((a, b) => {
                if (b.ratioPoints !== a.ratioPoints) return b.ratioPoints - a.ratioPoints;
                if (b.ratioDiff !== a.ratioDiff) return b.ratioDiff - a.ratioDiff;
                return b.pointsClassement - a.pointsClassement;
            });
            
            const wsData = [["Rang", "Nom", "Prénom", "Sexe", "Pts/Match", "Diff/Match", "Joués", "V", "N", "D"]];
            
            joueursPoule.forEach((j, i) => {
                wsData.push([
                    i + 1, 
                    j.nom, 
                    j.prenom, 
                    j.genre || j.sexe, 
                    Number(j.ratioPoints.toFixed(2)), 
                    Number(j.ratioDiff.toFixed(2)),
                    j.matchsJoues,
                    j.victoires,
                    j.nuls,
                    j.defaites
                ]);
            });
            
            let ws = XLSX.utils.aoa_to_sheet(wsData);
            
            let safeName = (poule.nom || "Poule").replace(/[\\/?*\[\]]/g, '_').substring(0, 31);
            XLSX.utils.book_append_sheet(wbClassement, ws, safeName);
        });

        const nomFichierClassement = `Classement_Tournoi-V3_${dateStr}.xlsx`;
        XLSX.writeFile(wbClassement, nomFichierClassement);


        // ==========================================
        // 2ème Fichier : Export Poules Répartition
        // ==========================================
        const wbPoules = XLSX.utils.book_new();

        this.repartitionPoules.forEach((pool, pIdx) => {
            let pName = this.nomsPoules[pIdx] || `Poule ${pIdx+1}`;
            
            const wsDataRepart = [["Sexe", "Nom", "Prénom", "Classement Simple", "Classement Double", "Classement Mixte"]];
            
            pool.forEach(j => {
                wsDataRepart.push([
                    j.genre || j.sexe || '',
                    j.nom || '',
                    j.prenom || '',
                    j.niveauSimple || j.classementSimple || j.niveau || j.classement || '',
                    j.niveauDouble || j.classementDouble || '',
                    j.niveauMixte || j.classementMixte || ''
                ]);
            });
            
            let wsRepart = XLSX.utils.aoa_to_sheet(wsDataRepart);
            
            let safeName = pName.replace(/[\\/?*\[\]]/g, '_').substring(0, 31);
            XLSX.utils.book_append_sheet(wbPoules, wsRepart, safeName);
        });

        const nomFichierPoules = `Export_Poules_Tournoi-V3_${dateStr}.xlsx`;
        XLSX.writeFile(wbPoules, nomFichierPoules);
    }
}
window.ClassementPage = ClassementPage;
