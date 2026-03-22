const fs = require('fs');

const jsPath = 'test/page/ClassementPage.js';
let content = fs.readFileSync(jsPath, 'utf8');

const regex = /    _exporterXLSX\(\) \{[\s\S]*?    \}\n\}\nwindow\.ClassementPage/m;

const newExporter = `    _exporterXLSX() {
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
        const dateStr = \`\${yyyy}\${mm}\${dd}_\${hh}\${min}\`;

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
            
            let safeName = (poule.nom || "Poule").replace(/[\\\\/?*\\[\\]]/g, '_').substring(0, 31);
            XLSX.utils.book_append_sheet(wbClassement, ws, safeName);
        });

        const nomFichierClassement = \`Classement_Tournoi-V3_\${dateStr}.xlsx\`;
        XLSX.writeFile(wbClassement, nomFichierClassement);


        // ==========================================
        // 2ème Fichier : Export Poules Répartition
        // ==========================================
        const wbPoules = XLSX.utils.book_new();

        this.repartitionPoules.forEach((pool, pIdx) => {
            let pName = this.nomsPoules[pIdx] || \`Poule \${pIdx+1}\`;
            
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
            
            let safeName = pName.replace(/[\\\\/?*\\[\\]]/g, '_').substring(0, 31);
            XLSX.utils.book_append_sheet(wbPoules, wsRepart, safeName);
        });

        const nomFichierPoules = \`Export_Poules_Tournoi-V3_\${dateStr}.xlsx\`;
        XLSX.writeFile(wbPoules, nomFichierPoules);
    }
}
window.ClassementPage`;

content = content.replace(regex, newExporter);
fs.writeFileSync(jsPath, content);
