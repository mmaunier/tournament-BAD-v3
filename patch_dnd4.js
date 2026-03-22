const fs = require('fs');
const path = 'test/page/ClassementPage.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Drag and drop events[\s\S]*?(?= _getDragAfterElement)/m;

const newDND = `// Drag and drop events using Delegation
        const dndContainer = this.container.querySelector('.poules-dnd-container');
        if (dndContainer) {
            dndContainer.addEventListener('dragstart', (e) => {
                const draggable = e.target.closest('.joueur-badge');
                if (draggable) {
                    const id = draggable.getAttribute('data-id');
                    const zone = draggable.closest('.dnd-zone');
                    const pouleIdx = zone ? zone.getAttribute('data-poule-idx') : null;
                    
                    if(e.dataTransfer && pouleIdx !== null) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", JSON.stringify({id, pouleIdx}));
                    }
                    setTimeout(() => draggable.classList.add('dragging'), 0);
                }
            });
            
            dndContainer.addEventListener('dragend', (e) => {
                const draggable = e.target.closest('.joueur-badge');
                if (draggable) draggable.classList.remove('dragging');
            });

            dndContainer.addEventListener('dragenter', (e) => {
                const zone = e.target.closest('.dnd-zone');
                if (zone) {
                    e.preventDefault();
                    zone.style.backgroundColor = '#ecf0f1';
                    zone.style.borderColor = '#3498db';
                }
            });

            dndContainer.addEventListener('dragover', (e) => {
                const zone = e.target.closest('.dnd-zone');
                if (zone) {
                    e.preventDefault(); 
                    if(e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                }
            });

            dndContainer.addEventListener('dragleave', (e) => {
                const zone = e.target.closest('.dnd-zone');
                if (zone && !zone.contains(e.relatedTarget)) {
                    zone.style.backgroundColor = '';
                    zone.style.borderColor = '';
                }
            });

            dndContainer.addEventListener('drop', (e) => {
                const zone = e.target.closest('.dnd-zone');
                if (zone) {
                    e.preventDefault();
                    zone.style.backgroundColor = '';
                    zone.style.borderColor = '';
                    
                    try {
                        const dataStr = e.dataTransfer.getData("text/plain");
                        if (!dataStr) return;
                        
                        const data = JSON.parse(dataStr);
                        const targetIdx = parseInt(zone.getAttribute('data-poule-idx'), 10);
                        const sourceIdx = parseInt(data.pouleIdx, 10);
                        
                        if (!isNaN(targetIdx) && !isNaN(sourceIdx) && targetIdx !== sourceIdx) {
                            const sourcePoule = this.repartitionPoules[sourceIdx];
                            const targetPoule = this.repartitionPoules[targetIdx];
                            
                            const joueurIdx = sourcePoule.findIndex(j => String(j.id) === String(data.id));
                            if(joueurIdx !== -1) {
                                const [joueur] = sourcePoule.splice(joueurIdx, 1);
                                targetPoule.push(joueur);
                                
                                // Re-render only the DND area
                                dndContainer.innerHTML = this._buildDNDPoulesHTML();
                                this._updateCountsAndRender();
                            }
                        }
                    } catch(err) {
                        console.error("Drop error:", err);
                    }
                }
            });
        }
    }
`;

content = content.replace(regex, newDND);
fs.writeFileSync(path, content);
