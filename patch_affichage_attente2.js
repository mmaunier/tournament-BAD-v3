const fs = require('fs');

const pathSync = 'js/pages/TournoiPage.js';
let contentSync = fs.readFileSync(pathSync, 'utf8');

const oldAttente = `        const joueursAttente = (this.joueursActifs || []).filter(j => !joueursEnMatch.has(j.id));`;

const newAttente = `        const joueursAttente = (this.joueursActifs || []).filter(j => !joueursEnMatch.has(j.id));
        // Inject poule name into joueurs attente
        joueursAttente.forEach(j => {
            if (!j.poule && this.poulesConfig) {
                // Find which poule the player belongs to
                let p = Object.values(this.poulesConfig).find(pc => pc.joueurs && pc.joueurs.includes(j.id));
                j.poule = p ? p.nom : this.nom || 'Poule Principale';
            } else if (!j.poule) {
                j.poule = this.nom || 'Poule Principale';
            }
        });`;

if (contentSync.includes(oldAttente)) {
    contentSync = contentSync.replace(oldAttente, newAttente);
    fs.writeFileSync(pathSync, contentSync);
}
