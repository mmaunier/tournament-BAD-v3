const fs = require('fs');
const path = 'test/page/TournoiPage.js';
let content = fs.readFileSync(path, 'utf8');

// Change projection link
content = content.replace(/'tournoi_affichage\.html'/, "'affichage.html'");

// Add _syncAffichage into constructor via injection or setInterval
const regexConstructor = /this\.poules = \[\];\n\s+this\.terrainsCount = 0;/;
content = content.replace(regexConstructor, "this.poules = [];\n        this.terrainsCount = 0;\n        setInterval(() => this._syncAffichage(), 1000);");

// Inject _syncAffichage before _saveStateToDB
const syncFunc = `
    _syncAffichage() {
        if (!this.poules) return;
        let terrains = [];
        for (let i = 1; i <= this.terrainsCount; i++) {
            let info = this._getPouleAndMatchForCourt(i);
            if (info) {
                const jMap = new Map(info.poule.joueurs.map(j => [j.id, j]));
                let e1 = info.match.equipe1.map(id => jMap.get(id)).filter(Boolean);
                let e2 = info.match.equipe2.map(id => jMap.get(id)).filter(Boolean);
                
                terrains.push({
                    numero: i,
                    occupe: true,
                    poule: info.poule.nom,
                    score1: info.match.score1 || 0,
                    score2: info.match.score2 || 0,
                    equipe1: e1.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / '),
                    equipe2: e2.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / ')
                });
            } else {
                terrains.push({ numero: i, occupe: false });
            }
        }
        
        let byes = [];
        this.poules.forEach(p => {
            let liveR = p.tours.findIndex(t => !this._isRoundFinished(p, t));
            if (liveR !== -1) {
                 let tour = p.tours[liveR];
                 (tour.exempts || []).forEach(id => {
                     let j = p.joueurs.find(x=>x.id===id);
                     if(j) byes.push(j.prenom + " " + (j.nom ? j.nom.charAt(0)+'.' : ''));
                 });
            }
        });

        let timerData = null;
        const displayEl = document.getElementById('timer-display');
        if (displayEl) {
            timerData = { display: displayEl.textContent };
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

    async _saveStateToDB()`;

content = content.replace(/    async _saveStateToDB\(\)/, syncFunc);

fs.writeFileSync(path, content);
