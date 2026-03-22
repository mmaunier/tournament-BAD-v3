const fs = require('fs');
let code = fs.readFileSync('js/pages/TournoiPage.js', 'utf8');
const oldAttente = `        // Inject poule name into joueurs attente
        joueursAttente.forEach(j => {
            if (!j.poule && this.poulesConfig) {
                // Find which poule the player belongs to
                let p = Object.values(this.poulesConfig).find(pc => pc.joueurs && pc.joueurs.includes(j.id));
                j.poule = p ? p.nom : this.nom || 'Poule Principale';
            } else if (!j.poule) {
                j.poule = this.nom || 'Poule Principale';
            }
        });`;

const newAttente = `        // Inject poule name into joueurs attente (v3 structure)
        joueursAttente.forEach(j => {
            if (!j.poule) {
                j.poule = this.tournoi && this.tournoi.nom ? this.tournoi.nom : 'Tournoi';
            }
        });`;

code = code.replace(oldAttente, newAttente);
fs.writeFileSync('js/pages/TournoiPage.js', code);
