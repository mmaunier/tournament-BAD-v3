const fs = require('fs');
const path = 'test/page/ClassementPage.js';
let content = fs.readFileSync(path, 'utf8');

const regexHeader = /<header class="header-classement">\s+<h1>🏆 Classement Final - \$\{this\.tournoi\?\.nom \|\| 'Tournoi V3'\}<\/h1>\s+<div class="header-actions">/;
const newHeader = `<header class="header-classement">
                    <h1>🏆 Classement Final - \${this.tournoi?.nom || 'Tournoi V3'}</h1>
                    <div class="header-actions">
                        <div class="proj-controls" style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px; display: flex; align-items: center; gap: 10px; margin-right: 15px;">
                            <label style="font-size: 0.85em; cursor: pointer;"><input type="radio" name="proj_mode" value="bloc1" checked> Afficher Bloc 1 (Classement)</label>
                            <label style="font-size: 0.85em; cursor: pointer;"><input type="radio" name="proj_mode" value="bloc2"> Afficher Bloc 2 (Nouvelles Poules)</label>
                            <button class="btn-action" style="background:#8e44ad; font-weight:bold; padding: 4px 8px;" id="btn-open-proj-class">📺 Vidéoprojecteur</button>
                        </div>`;

content = content.replace(regexHeader, newHeader);

const regexConstructor = /this\.repartitionPoules = \[\];\s+\}/;
content = content.replace(regexConstructor, "this.repartitionPoules = [];\n        setInterval(() => this._syncAffichage(), 1000);\n    }");

const syncFunc = `
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

    _attachEvents()`;
    
content = content.replace(/    _attachEvents\(\)/, syncFunc);

const eventFunc = `        const btnProj = this.container.querySelector('#btn-open-proj-class');
        if (btnProj) {
            btnProj.addEventListener('click', () => {
                window.open('affichage.html', '_blank', 'menubar=no,toolbar=no,location=no,status=no');
            });
        }

        // Mode édition titre`;

content = content.replace(/        \/\/ Mode édition titre/, eventFunc);

fs.writeFileSync(path, content);
