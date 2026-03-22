const fs = require('fs');

const jsContent = `
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
        this.nbTerrainsPoule1 = 4; // Par défaut
        
        // Structure de redistribution: un tableau de tableaux de joueurs
        this.repartitionPoules = []; 
    }

    async render(container) {
        this.container = container;
        container.innerHTML = '<div class="loading">Chargement...</div>';
        
        await this.loadData();
        
        this._buildHTML();
        this._attachEvents();
    }

    async loadData() {
        this.etat = await this.db.getEtatTournoi();
        this.tournoi = await this.db.getTournoi();
        this.poulesInit = this.etat.poules || [];
        
        // Aplatir tous les joueurs en calculant leur ratio etc (comme dans openClassementModal)
        this.joueurs = [];
        
        this.poulesInit.forEach(p => {
            p.joueurs.forEach(j => {
                let jc = { ...j, pouleIdsInit: p.id, pouleNomInit: p.nom };
                let ptsMatches = j.matchsJoues > 0 ? j.pointsClassement / j.matchsJoues : 0;
                let diffMatches = j.matchsJoues > 0 ? j.pointsDiff / j.matchsJoues : 0;
                jc.ratioPoints = ptsMatches;
                jc.ratioDiff = diffMatches;
                this.joueurs.push(jc);
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

    _calculerRepartition() {
        this.repartitionPoules = Array.from({ length: this.nbPoulesSplit }, () => []);
        
        // Simple logique :
        // Si 2 poules, 1ère poule prend un ratio basé sur les terrains.
        if (this.nbPoulesSplit === 2) {
            const ratio = this.nbTerrainsPoule1 / (this.tournoi.nbTerrains || 7);
            const sepIndex = Math.floor(ratio * this.joueurs.length);
            this.repartitionPoules[0] = this.joueurs.slice(0, sepIndex);
            this.repartitionPoules[1] = this.joueurs.slice(sepIndex);
        } else {
            // Division égale
            const chunk = Math.ceil(this.joueurs.length / this.nbPoulesSplit);
            for(let i=0; i<this.nbPoulesSplit; i++) {
                this.repartitionPoules[i] = this.joueurs.slice(i*chunk, (i+1)*chunk);
            }
        }
    }

    _buildHTML() {
        let html = \`
            <div class="classement-page">
                <header class="header">
                    <div class="header-left">
                        <h1>🏆 Classement Final - \${this.tournoi.nom}</h1>
                    </div>
                </header>
                
                <main class="main-content">
                    <section class="section-top">
                        <h2>🏅 Classements par Poule</h2>
                        <div class="classements-container">
                            \${this._buildClassementsPoulesHTML()}
                        </div>
                    </section>
                    
                    <section class="section-bottom">
                        <h2>🔄 Répartition pour la suite</h2>
                        <div class="repartition-controls">
                            <label>
                                Nombre de poules cibles:
                                <input type="number" id="spin-nb-poules" value="\${this.nbPoulesSplit}" min="1" max="10">
                            </label>
                            \${this.nbPoulesSplit === 2 ? \`
                            <label>
                                Terrains 1ère poule:
                                <input type="number" id="spin-nb-terrains" value="\${this.nbTerrainsPoule1}" min="1">
                            </label>
                            \` : ''}
                            <button id="btn-recalcul" class="btn-action">Recalculer Répartition</button>
                        </div>
                        <div class="poules-dnd-container">
                            \${this._buildDNDPoulesHTML()}
                        </div>
                    </section>
                </main>
            </div>
        \`;
        
        this.container.innerHTML = html;
    }

    _buildClassementsPoulesHTML() {
        let html = '';
        this.poulesInit.forEach(poule => {
            let joueursPoule = this.joueurs.filter(j => j.pouleIdsInit === poule.id);
            joueursPoule.sort((a, b) => {
                if (b.ratioPoints !== a.ratioPoints) return b.ratioPoints - a.ratioPoints;
                if (b.ratioDiff !== a.ratioDiff) return b.ratioDiff - a.ratioDiff;
                return b.pointsClassement - a.pointsClassement;
            });
            
            html += \`
                <div class="poule-classement">
                    <h3>\${poule.nom}</h3>
                    <table class="table-stats">
                        <thead>
                            <tr>
                                <th>Rang</th>
                                <th>Joueur</th>
                                <th>Ratio Pts</th>
                                <th>Ratio Diff</th>
                                <th>Matchs</th>
                                <th>V/N/D</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${joueursPoule.map((j, idx) => \`
                                <tr>
                                    <td>\${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                                    <td>\${j.prenom} \${j.nom}</td>
                                    <td>\${j.ratioPoints.toFixed(2)}</td>
                                    <td>\${j.ratioDiff.toFixed(2)}</td>
                                    <td>\${j.matchsJoues}</td>
                                    <td>\${j.victoires}/\${j.nuls}/\${j.defaites}</td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                </div>
            \`;
        });
        return html;
    }

    _buildDNDPoulesHTML() {
        let html = '';
        this.repartitionPoules.forEach((pool, i) => {
            html += \`
                <div class="dnd-poule" data-poule-idx="\${i}">
                    <h4>Nouvelle Poule \${i + 1} (\${pool.length} joueurs)</h4>
                    <div class="dnd-zone" data-poule-idx="\${i}">
                        \${pool.map(j => \`
                            <div class="joueur-badge \${j.genre === 'F' ? 'badge-f' : 'badge-h'}" draggable="true" data-id="\${j.id}">
                                ☰ \${j.prenom} \${j.nom} (\${j.ratioPoints.toFixed(2)})
                            </div>
                        \`).join('')}
                    </div>
                </div>
            \`;
        });
        return html;
    }

    _attachEvents() {
        const spinPoules = this.container.querySelector('#spin-nb-poules');
        if (spinPoules) {
            spinPoules.addEventListener('change', (e) => {
                this.nbPoulesSplit = parseInt(e.target.value, 10) || 1;
                this._buildHTML(); // re-render to show/hide nb-terrains if needed
                this._attachEvents();
            });
        }
        
        const spinTerrains = this.container.querySelector('#spin-nb-terrains');
        if (spinTerrains) {
            spinTerrains.addEventListener('change', (e) => {
                this.nbTerrainsPoule1 = parseInt(e.target.value, 10) || 1;
            });
        }
        
        const btnRecalcul = this.container.querySelector('#btn-recalcul');
        if (btnRecalcul) {
            btnRecalcul.addEventListener('click', () => {
                this._calculerRepartition();
                this._buildHTML();
                this._attachEvents();
            });
        }
        
        // Drag and drop events
        const draggables = this.container.querySelectorAll('.joueur-badge');
        const zones = this.container.querySelectorAll('.dnd-zone');
        
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => {
                draggable.classList.add('dragging');
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                this._updateRepartitionArray();
                // update counts
                this._buildHTML();
                this._attachEvents();
            });
        });
        
        zones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                const afterElement = this._getDragAfterElement(zone, e.clientY);
                const draggable = this.container.querySelector('.dragging');
                if (afterElement == null) {
                    zone.appendChild(draggable);
                } else {
                    zone.insertBefore(draggable, afterElement);
                }
            });
        });
    }

    _getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.joueur-badge:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    _updateRepartitionArray() {
        const zones = this.container.querySelectorAll('.dnd-zone');
        this.repartitionPoules = Array.from(zones).map(zone => {
            const badges = zone.querySelectorAll('.joueur-badge');
            return Array.from(badges).map(badge => {
                const id = badge.getAttribute('data-id');
                return this.joueurs.find(j => j.id === id);
            });
        });
    }
}
window.ClassementPage = ClassementPage;
\`;

fs.writeFileSync('test/page/ClassementPage.js', jsContent);

const cssContent = \`
.classement-page {
    padding: 20px;
    background-color: #fcefe3;
    min-height: 100vh;
}
.header {
    background: #e67e22;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}
.classements-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}
.poule-classement {
    flex: 1;
    min-width: 300px;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.table-stats {
    width: 100%;
    border-collapse: collapse;
}
.table-stats th, .table-stats td {
    border-bottom: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}
.table-stats th {
    background-color: #f8f9fa;
}
.repartition-controls {
    background: white;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    gap: 20px;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.poules-dnd-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}
.dnd-poule {
    flex: 1;
    min-width: 300px;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.dnd-zone {
    min-height: 200px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 10px;
    background: #fafafa;
}
.joueur-badge {
    padding: 8px;
    margin-bottom: 8px;
    border-radius: 4px;
    background: #fff;
    border: 1px solid #ddd;
    cursor: grab;
    user-select: none;
}
.joueur-badge.dragging {
    opacity: 0.5;
}
.badge-f {
    border-left: 4px solid #e84393;
    background-color: #fdabcf;
}
.badge-h {
    border-left: 4px solid #0984e3;
    background-color: #a0cff1;
}
.btn-action {
    background: #27ae60;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}
\`;

fs.writeFileSync('test/css/ClassementPage.css', cssContent);

