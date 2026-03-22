const fs = require('fs');

// PATCH 1: test/page/AffichagePage.js
// Fix string literal escaping mistake \`${b}\` => `${b}` that was caused by bash EOF quoting
const pathAffichage = 'test/page/AffichagePage.js';
let contentAff = fs.readFileSync(pathAffichage, 'utf8');
contentAff = contentAff.replace(/\\\$\\{b\\}/g, '${b}'); // Revert escaped var
contentAff = contentAff.replace(/\\\`/g, '`');
fs.writeFileSync(pathAffichage, contentAff);

// PATCH 2: test/page/TournoiPage.js
// findIndex passes (element, index). We should be passing index as the second argument to _isRoundFinished!
// let liveR = p.tours.findIndex((t, idx) => !this._isRoundFinished(p, idx));

const pathTournoi = 'test/page/TournoiPage.js';
let contentTournoi = fs.readFileSync(pathTournoi, 'utf8');

contentTournoi = contentTournoi.replace(
    /let liveR = p\.tours\.findIndex\(t => !this\._isRoundFinished\(p, t\)\);/,
    'let liveR = p.tours.findIndex((t, idx) => !this._isRoundFinished(p, idx));'
);

fs.writeFileSync(pathTournoi, contentTournoi);

