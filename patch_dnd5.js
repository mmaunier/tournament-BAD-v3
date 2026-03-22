const fs = require('fs');
const path = 'test/page/ClassementPage.js';
let content = fs.readFileSync(path, 'utf8');

const oldEditables = `        const editables = this.container.querySelectorAll('.editable-title');
        editables.forEach(el => {
            el.addEventListener('dblclick', (e) => {
                e.target.contentEditable = true;
                e.target.focus();
            });
            el.addEventListener('blur', (e) => {
                e.target.contentEditable = false;
                const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                let newText = e.target.textContent.trim();
                if (newText) {
                    this.nomsPoules[idx] = newText;
                } else {
                    e.target.textContent = this.nomsPoules[idx];
                }
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });`;

const newEditables = `        this._attachEditableEvents();`;

const newMethod = `
    _attachEditableEvents() {
        const editables = this.container.querySelectorAll('.editable-title');
        editables.forEach(el => {
            el.addEventListener('dblclick', (e) => {
                e.target.contentEditable = true;
                e.target.focus();
            });
            el.addEventListener('blur', (e) => {
                e.target.contentEditable = false;
                const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                let newText = e.target.textContent.trim();
                if (newText) {
                    this.nomsPoules[idx] = newText;
                } else {
                    e.target.textContent = this.nomsPoules[idx];
                }
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });
    }

    _attachEvents()`;

content = content.replace(oldEditables, newEditables);
content = content.replace("    _attachEvents()", newMethod);

const dropCode = `                                dndContainer.innerHTML = this._buildDNDPoulesHTML();
                                this._updateCountsAndRender();`;

const dropNewCode = `                                dndContainer.innerHTML = this._buildDNDPoulesHTML();
                                this._attachEditableEvents();
                                this._updateCountsAndRender();`;

content = content.replace(dropCode, dropNewCode);

fs.writeFileSync(path, content);
