const fs = require('fs')
console.log(fs.readFileSync('js/pages/TournoiPage.js', 'utf8').includes('// Inject poule name'))
