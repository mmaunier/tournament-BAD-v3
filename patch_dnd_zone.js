const fs = require('fs');

const jsPath = 'test/page/ClassementPage.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

jsContent = jsContent.replace(/closest\('\.dnd-zone'\)/g, "closest('.dnd-poule')");

fs.writeFileSync(jsPath, jsContent);

const cssPath = 'test/css/ClassementPage.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

cssContent = cssContent.replace(/padding: 10px 5px;/g, 'padding: 4px 5px; font-size: 0.9em;');

fs.writeFileSync(cssPath, cssContent);
