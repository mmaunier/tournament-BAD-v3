const fs = require('fs');
const file = 'test/page/TournoiPage.js';
let content = fs.readFileSync(file, 'utf8');

const insertStr = `
    finirTournoi() {
        if (confirm("Êtes-vous sûr de vouloir terminer le tournoi et générer les classements finaux ?")) {
            // Sauvegarder l'état actuel
            this._sauvegarderEtat()
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
`;

content = content.replace("    // ─── CLASSEMENTS ──────────────────────────────────────────────────────────", insertStr + "\n    // ─── CLASSEMENTS ──────────────────────────────────────────────────────────");

fs.writeFileSync(file, content);
