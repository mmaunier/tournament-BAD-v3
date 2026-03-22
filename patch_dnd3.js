const fs = require('fs');
const path = 'test/page/ClassementPage.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Drag and drop events[\s\S]*?(?= _getDragAfterElement)/m;

const newDND = `// Drag and drop events
        const draggables = this.container.querySelectorAll('.joueur-badge');
        const zones = this.container.querySelectorAll('.dnd-zone');
        
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                if(e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", draggable.getAttribute('data-id'));
                }
                // setTimeout is essential here to prevent the drag event from resolving instantly in some browsers
                setTimeout(() => {
                    draggable.classList.add('dragging');
                }, 0);
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                this._updateRepartitionArray();
                this._updateCountsAndRender();
            });
        });
        
        zones.forEach(zone => {
            zone.addEventListener('dragenter', e => {
                e.preventDefault();
                zone.style.backgroundColor = '#ecf0f1';
                zone.style.borderColor = '#3498db';
            });
            
            zone.addEventListener('dragover', e => {
                e.preventDefault(); // Autorise le drop
                e.dataTransfer.dropEffect = 'move';
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
                zone.style.borderColor = '';
                
                // Récupération de l'élément en cours de drag
                const draggingId = e.dataTransfer.getData("text/plain");
                let draggable = this.container.querySelector(\`.joueur-badge[data-id="\${draggingId}"]\`);
                if (!draggable) draggable = this.container.querySelector('.dragging');
                
                if (draggable) {
                    const afterElement = this._getDragAfterElement(zone, e.clientX, e.clientY);
                    if (afterElement == null) {
                        zone.appendChild(draggable);
                    } else {
                        zone.insertBefore(draggable, afterElement);
                    }
                    
                    this._updateRepartitionArray();
                    this._updateCountsAndRender();
                }
            });
        });
    }

`;

content = content.replace(regex, newDND);

// Also fix string/number ID bug
content = content.replace(
    /return this\.joueurs\.find\(j => j\.id === id\);/g,
    "return this.joueurs.find(j => String(j.id) === String(id));"
);

fs.writeFileSync(path, content);
