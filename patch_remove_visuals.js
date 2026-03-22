const fs = require('fs');

// Patch CSS
const cssPath = 'test/css/ClassementPage.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

cssContent = cssContent.replace(/ border: 2px dashed #bdc3c7;\n/g, '');
cssContent = cssContent.replace(/ background: #fdfdfd;\n/g, '');
cssContent = cssContent.replace(/ transition: background-color 0\.2s;\n/g, '');
cssContent = cssContent.replace(/\.dnd-zone:hover \{ background-color: #ecf0f1; \}\n/g, '');

fs.writeFileSync(cssPath, cssContent);

// Patch JS
const jsPath = 'test/page/ClassementPage.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

jsContent = jsContent.replace(/                    zone.style.backgroundColor = '#ecf0f1';\n                    zone.style.borderColor = '#3498db';/g, '');
jsContent = jsContent.replace(/                    zone.style.backgroundColor = '';\n                    zone.style.borderColor = '';/g, '');


fs.writeFileSync(jsPath, jsContent);
