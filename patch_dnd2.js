const fs = require('fs');

const path = 'test/page/ClassementPage.js';
let content = fs.readFileSync(path, 'utf8');

const oldDND = `            zone.addEventListener('dragover', e => {
                e.preventDefault(); // Autorise le drop
                e.dataTransfer.dropEffect = 'move';
            });
            
            zone.addEventListener('drop', e => {
                e.preventDefault();`;

const newDND = `            zone.addEventListener('dragover', e => {
                e.preventDefault(); // Autorise le drop
                e.dataTransfer.dropEffect = 'move';
                zone.style.backgroundColor = '#ecf0f1';
                zone.style.borderColor = '#3498db';
            });

            zone.addEventListener('dragleave', e => {
                if (!zone.contains(e.relatedTarget)) {
                    zone.style.backgroundColor = '';
                    zone.style.borderColor = '';
                }
            });
            
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.style.backgroundColor = '';
                zone.style.borderColor = '';`;

content = content.replace(oldDND, newDND);
fs.writeFileSync(path, content);
