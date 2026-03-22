const fs = require('fs');

// PATCH 1: TournoiPage.js -> sync logic. The teams arrays in match already contain object references to players in memory, not just IDs.
const pathTournoi = 'test/page/TournoiPage.js';
let contentTournoi = fs.readFileSync(pathTournoi, 'utf8');

const oldSync = `            if (info) {
                const jMap = new Map(info.poule.joueurs.map(j => [j.id, j]));
                let e1 = info.match.equipe1.map(id => jMap.get(id)).filter(Boolean);
                let e2 = info.match.equipe2.map(id => jMap.get(id)).filter(Boolean);
                
                terrains.push({
                    numero: i,
                    occupe: true,
                    poule: info.poule.nom,
                    pouleColor: info.poule.colorIndex || 1,
                    score1: info.match.score1 || 0,
                    score2: info.match.score2 || 0,
                    equipe1: e1.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / '),
                    equipe2: e2.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / ')
                });
            } else {`;

const newSync = `            if (info) {
                // info.match.equipe1 is an array of objects
                let e1 = info.match.equipe1.filter(Boolean);
                let e2 = info.match.equipe2.filter(Boolean);
                
                terrains.push({
                    numero: i,
                    occupe: true,
                    poule: info.poule.nom,
                    pouleColor: info.poule.colorIndex || 1,
                    score1: typeof info.match.score1 === 'number' ? info.match.score1 : null,
                    score2: typeof info.match.score2 === 'number' ? info.match.score2 : null,
                    equipe1: e1.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / '),
                    equipe2: e2.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / ')
                });
            } else {`;
            
// Also extract byes differently, map directly by passing group
const oldByes = `        let byes = [];
        this.poules.forEach(p => {
            let liveR = p.tours.findIndex((t, idx) => !this._isRoundFinished(p, idx));
            if (liveR !== -1) {
                 let tour = p.tours[liveR];
                 (tour.exempts || []).forEach(id => {
                     let j = p.joueurs.find(x=>x.id===id);
                     if(j) byes.push(j.prenom + " " + (j.nom ? j.nom.charAt(0)+'.' : ''));
                 });
            }
        });`;

const newByes = `        let byes = [];
        this.poules.forEach(p => {
            let liveR = p.tours.findIndex((t, idx) => !this._isRoundFinished(p, idx));
            if (liveR !== -1) {
                 let tour = p.tours[liveR];
                 let pouleByes = [];
                 (tour.exempts || []).forEach(id => {
                     let j = p.joueurs.find(x=>String(x.id)===String(id));
                     if(j) pouleByes.push(j.prenom + " " + (j.nom ? j.nom.charAt(0)+'.' : ''));
                 });
                 if (pouleByes.length > 0) {
                     byes.push({ poule: p.nom, color: p.colorIndex || 1, joueurs: pouleByes });
                 }
            }
        });`;

contentTournoi = contentTournoi.replace(oldSync, newSync);
// Try to also match exact previous version in case
contentTournoi = contentTournoi.replace(/const jMap = new Map\(info\.poule\.joueurs\.map\(j => \[j\.id, j\]\)\);\s+let e1 = info\.match\.equipe1\.map\(id => jMap\.get\(id\)\)\.filter\(Boolean\);\s+let e2 = info\.match\.equipe2\.map\(id => jMap\.get\(id\)\)\.filter\(Boolean\);\s+terrains\.push\({\s+numero: i,\s+occupe: true,\s+poule: info\.poule\.nom,\s+score1: info\.match\.score1 \|\| 0,\s+score2: info\.match\.score2 \|\| 0,\s+equipe1: e1\.map\(j => j\.prenom \+ ' ' \+ \(j\.nom \? j\.nom\.charAt\(0\)\+'\.' : ''\)\)\.join\(' \/ '\),\s+equipe2: e2\.map\(j => j\.prenom \+ ' ' \+ \(j\.nom \? j\.nom\.charAt\(0\)\+'\.' : ''\)\)\.join\(' \/ '\)\s+}\);/, `let e1 = info.match.equipe1.filter(Boolean);\n                let e2 = info.match.equipe2.filter(Boolean);\n                \n                terrains.push({\n                    numero: i,\n                    occupe: true,\n                    poule: info.poule.nom,\n                    pouleColor: info.poule.colorIndex || 1,\n                    score1: typeof info.match.score1 === 'number' ? info.match.score1 : '',\n                    score2: typeof info.match.score2 === 'number' ? info.match.score2 : '',\n                    equipe1: e1.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / '),\n                    equipe2: e2.map(j => j.prenom + ' ' + (j.nom ? j.nom.charAt(0)+'.' : '')).join(' / ')\n                });`);
contentTournoi = contentTournoi.replace(oldByes, newByes);

// Add window open check
contentTournoi = contentTournoi.replace(/window\.open\('affichage\.html', '_blank', 'menubar=no,toolbar=no,location=no,status=no'\);/, `window.open('affichage.html', 'AffichageTournoiV3', 'menubar=no,toolbar=no,location=no,status=no');`);

fs.writeFileSync(pathTournoi, contentTournoi);
