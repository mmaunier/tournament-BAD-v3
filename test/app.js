/**
 * app.js — Point d'entrée V3
 * Instancie AccueilPage et la monte dans #app.
 */

document.addEventListener('DOMContentLoaded', () => {
    const page = new AccueilPage();
    page.render(document.getElementById('app'));
});
