/**
 * app.js — Point d'entrée V3
 * Instancie GatePage par défaut.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser en affichant la Gate
    const page = new GatePage();
    page.render(document.getElementById('app'));
});
