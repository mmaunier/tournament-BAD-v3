const fs = require('fs');

const path = 'test/page/ClassementPage.js';
let content = fs.readFileSync(path, 'utf8');

const oldDND = `        // Drag and drop events
        const draggables = this.container.querySelectorAll('.joueur-badge');
        const zones = this.container.querySelectorAll('.dnd-zone');
        
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                draggable.classList.add('dragging');
                // Nécessaire pour Firefox
                if(e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", draggable.getAttribute('data-id'));
                }
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                this._updateRepartitionArray();
                this._updateCountsAndRender();
            });
        });
        
        zones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                const afterElement = this._getDragAfterElement(zone, e.clientX, e.clientY);
                const draggable = this.container.querySelector('.dragging');
                if (draggable) {
                    if (afterElement == null) {
                        zone.appendChild(draggable);
                    } else {
                        zone.insertBefore(draggable, afterElement);
                    }
                }
            });
        });`;

const newDND = `        // Drag and drop events
        const draggables = this.container.querySelectorAll('.joueur-badge');
        const zones = this.container.querySelectorAll('.dnd-zone');
        
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                draggable.classList.add('dragging');
                if(e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", draggable.getAttribute('data-id'));
                }
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                this._updateRepartitionArray();
                this._updateCountsAndRender();
            });
        });
        
        zones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault(); // Autorise le drop
                e.dataTransfer.dropEffect = 'move';
            });
            
            zone.addEventListener('drop', e => {
                e.preventDefault();
                
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
        });`;

content = content.replace(oldDND, newDND);
fs.writeFileSync(path, content);
