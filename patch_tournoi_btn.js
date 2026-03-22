const fs = require('fs');
const path = 'test/page/TournoiPage.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /<button class="btn-action btn-projection" id="btn-open-proj">Ouvrir Fenêtre à projeter<\/button>/,
    '<button class="btn-action btn-projection" style="background:#8e44ad; font-weight:bold;" id="btn-open-proj">📺 Vidéoprojecteur</button>'
);

fs.writeFileSync(path, content);
