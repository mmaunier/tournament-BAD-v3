/**
 * AccueilPage.js — Page de préparation du tournoi V3
 * Gère l'affichage des poules en colonnes, l'import XLSX, la gestion des joueurs.
 */

class AccueilPage {

    // ─── Constructeur ─────────────────────────────────────────────────────────────
    constructor() {
        // État interne des poules
        this.state = {
            poules:  [{ id: 1, nom: 'Poule 1', joueurs: [], config: AccueilPage._defaultConfig() }],
            nextId:  2
        };

        // Références DOM (initialisées lors du render)
        this.dom = {
            poulesColumns: null,
            btnAddPoule:   null,
            btnLancer:     null,
            menuTrigger:   null,
            dropdownMenu:  null,
            mainMenu:      null,
            ctxMenu:       null,
            bodyCtxMenu:   null,
            joueurTooltip: null,
            fileInputXLSX: null
        };

        // État interne UI
        this._ctxTargetId    = null;
        this._bodyCtxPouleId = null;
        this._selection      = new Map(); // joueurId → pouleId
        this._dragJoueurs    = [];
        this._tooltipTimer   = null;
    }

    // ─── Point d'entrée : render ──────────────────────────────────────────────────
    render(container) {
        container.innerHTML = '';
        container.appendChild(this._buildHTML());

        // Câbler les références DOM
        this.dom.poulesColumns = container.querySelector('#poulesColumns');
        this.dom.btnAddPoule   = container.querySelector('#btnAddPoule');
        this.dom.menuTrigger   = container.querySelector('#menuTrigger');
        this.dom.dropdownMenu  = container.querySelector('#dropdownMenu');
        this.dom.mainMenu      = container.querySelector('#mainMenu');
        this.dom.ctxMenu       = container.querySelector('#ctxMenu');
        this.dom.bodyCtxMenu   = container.querySelector('#bodyCtxMenu');
        this.dom.joueurTooltip = container.querySelector('#joueurTooltip');
        this.dom.fileInputXLSX = container.querySelector('#fileInputXLSX');
        this.dom.btnLancer     = container.querySelector('#btnLancer');

        this._bindEvents();
        this._renderColumns();
    }

    // ─── Construction du HTML statique ───────────────────────────────────────────
    _buildHTML() {
        const fragment = document.createDocumentFragment();

        // ── Header ──
        const header = document.createElement('header');
        header.className = 'header';
        header.innerHTML = `
            <div class="header-left"></div>
            <div class="header-center">
                <h1 class="header-main-title">Générateur de tournoi interne en DOUBLE</h1>
            </div>
            <div class="header-right">
                <div class="dropdown" id="mainMenu">
                    <button class="btn-menu dropdown-trigger" id="menuTrigger">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="3" y1="12" x2="21" y2="12"/>
                            <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                        <span class="btn-menu-text">Menu</span>
                    </button>
                    <div class="dropdown-menu" id="dropdownMenu">
                        <div class="dropdown-item" data-action="import-joueurs">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            Importer joueurs (XLSX)
                        </div>
                        <div class="dropdown-divider"></div>
                        <div class="dropdown-item dropdown-item-danger" data-action="reset">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"/>
                                <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                            </svg>
                            Réinitialiser
                        </div>
                    </div>
                </div>
            </div>`;
        fragment.appendChild(header);

        // ── Main ──
        const main = document.createElement('main');
        main.className = 'main';
        main.innerHTML = `
            <div class="poules-frame">
                <div class="poules-topbar">
                    <button class="btn-add-poule" id="btnAddPoule" title="Ajouter une poule">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Ajouter une poule
                    </button>
                </div>
                <div class="poules-columns" id="poulesColumns"></div>
            </div>`;
        fragment.appendChild(main);

        // ── Footer ──
        const footer = document.createElement('footer');
        footer.className = 'footer';
        footer.innerHTML = `
            <div class="footer-left">
                <span class="footer-info">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Tournament BAD v3
                </span>
            </div>
            <div class="footer-right">
                <button class="btn btn-success btn-lg" id="btnLancer" disabled>
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Lancer le tournoi
                </button>
            </div>`;
        fragment.appendChild(footer);

        // ── Menu contextuel poule (en-tête) ──
        const ctxMenu = document.createElement('div');
        ctxMenu.id        = 'ctxMenu';
        ctxMenu.className = 'ctx-menu';
        ctxMenu.style.display = 'none';
        ctxMenu.innerHTML = `
            <div class="ctx-menu-item" data-ctx="rename">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
                Renommer
            </div>
            <div class="ctx-menu-divider"></div>
            <div class="ctx-menu-item ctx-menu-item-danger" data-ctx="delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6L18.1 20a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                </svg>
                Supprimer
            </div>`;
        fragment.appendChild(ctxMenu);

        // ── Menu contextuel corps de poule ──
        const bodyCtxMenu = document.createElement('div');
        bodyCtxMenu.id        = 'bodyCtxMenu';
        bodyCtxMenu.className = 'ctx-menu';
        bodyCtxMenu.style.display = 'none';
        bodyCtxMenu.innerHTML = `
            <div class="ctx-menu-item" data-bctx="add-joueur">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                    <line x1="19" y1="3" x2="19" y2="9"/>
                    <line x1="16" y1="6" x2="22" y2="6"/>
                </svg>
                Ajouter un joueur
            </div>`;
        fragment.appendChild(bodyCtxMenu);

        // ── Tooltip joueur ──
        const tooltip = document.createElement('div');
        tooltip.id        = 'joueurTooltip';
        tooltip.className = 'joueur-tooltip';
        tooltip.style.display = 'none';
        fragment.appendChild(tooltip);

        // ── Input fichier XLSX caché ──
        const fileInput = document.createElement('input');
        fileInput.type    = 'file';
        fileInput.id      = 'fileInputXLSX';
        fileInput.accept  = '.xlsx,.xls';
        fileInput.style.display = 'none';
        fragment.appendChild(fileInput);

        return fragment;
    }

    // ─── Binding des événements ───────────────────────────────────────────────────
    _bindEvents() {
        const d = this.dom;

        // Bouton + ajouter poule
        d.btnAddPoule.addEventListener('click', () => this._ajouterPoule());

        // Menu hamburger
        d.menuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            d.mainMenu.classList.toggle('open');
        });

        // Items du dropdown
        d.dropdownMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            d.mainMenu.classList.remove('open');
            const action = item.dataset.action;
            if (action === 'import-joueurs') this._importerJoueurs();
            else if (action === 'reset')      this._reset();
        });

        // Menu contextuel poule (en-tête)
        d.ctxMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.ctx-menu-item');
            if (!item) return;
            const action = item.dataset.ctx;
            const id     = this._ctxTargetId;
            this._fermerCtxMenus();
            if (action === 'rename') {
                const colEl = d.poulesColumns.querySelector(`.poule-col[data-id="${id}"]`);
                const poule = this.state.poules.find(p => p.id === id);
                if (colEl && poule) this._demarrerRenommage(colEl.querySelector('.poule-col-header'), poule);
            } else if (action === 'delete') {
                this._supprimerPoule(id);
            }
        });

        // Menu contextuel corps de poule
        d.bodyCtxMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.ctx-menu-item');
            if (!item) return;
            const pid = this._bodyCtxPouleId;
            this._fermerCtxMenus();
            if (item.dataset.bctx === 'add-joueur' && pid !== null) {
                this._ouvrirModalAjoutJoueur(pid);
            }
        });

        // Import XLSX
        d.fileInputXLSX.addEventListener('change', (e) => this._onXLSXChange(e));

        // Bouton lancer
        if (d.btnLancer) d.btnLancer.addEventListener('click', () => this._lancerTournois());

        // Fermeture menus + sélection au clic global
        document.addEventListener('click', (e) => {
            d.mainMenu.classList.remove('open');
            this._fermerCtxMenus();
            if (!e.ctrlKey && !e.metaKey && !e.target.closest('.joueur-badge')) {
                this._clearSelection();
            }
        });
    }

    // ─── Rendu des colonnes ────────────────────────────────────────────────────────
    _renderColumns() {
        const container = this.dom.poulesColumns;
        container.innerHTML = '';

        this.state.poules.forEach(poule => {
            const col = document.createElement('div');
            col.className  = 'poule-col';
            col.dataset.id = poule.id;

            col.appendChild(this._buildColHeader(poule));
            col.appendChild(this._buildParticipantsSection(poule));
            col.appendChild(this._buildConfigPanel(poule));

            // Drag & drop
            col.addEventListener('dragenter', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
            col.addEventListener('dragover',  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
            col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); });
            col.addEventListener('drop',      (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                if (this._dragJoueurs.length > 0) this._deplacerJoueurs(this._dragJoueurs, poule.id);
            });

            container.appendChild(col);
        });
        this._majBtnLancer();
    }

    // ─── Rendu des joueurs dans un corps de colonne ───────────────────────────────
    _renderJoueurs(poule, bodyEl) {
        bodyEl.innerHTML = '';

        if (!poule.joueurs.length) {
            bodyEl.innerHTML = `
                <div class="poule-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <p>Aucun joueur dans cette poule</p>
                    <small>Importez un fichier XLSX ou ajoutez un joueur (clic droit).</small>
                </div>`;
            return;
        }

        const list = document.createElement('div');
        list.className = 'joueurs-list';
        const triés = [...poule.joueurs].sort((a, b) => {
            const nc = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
            return nc !== 0 ? nc : (a.prenom || '').localeCompare(b.prenom || '', 'fr', { sensitivity: 'base' });
        });
        triés.forEach(j => list.appendChild(this._creerBadgeJoueur(j, poule.id)));
        bodyEl.appendChild(list);
    }

    // ─── Badge joueur ─────────────────────────────────────────────────────────────
    _creerBadgeJoueur(joueur, pouleId) {
        const badge = document.createElement('div');
        badge.className      = `joueur-badge joueur-badge-${joueur.genre === 'F' ? 'f' : 'h'}`;
        badge.dataset.joueurId = String(joueur.id);
        badge.draggable      = true;

        const genreEl  = document.createElement('span');
        genreEl.className   = 'joueur-badge-genre';
        genreEl.textContent = joueur.genre;

        const infoEl   = document.createElement('span');
        infoEl.className   = 'joueur-badge-info';
        infoEl.textContent = `${joueur.nom.toUpperCase()}${joueur.prenom ? ' ' + joueur.prenom : ''}`;

        const delBtn   = document.createElement('button');
        delBtn.className   = 'joueur-badge-delete';
        delBtn.title       = 'Supprimer ce joueur';
        delBtn.innerHTML   = '&times;';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nom = joueur.prenom ? `${joueur.nom} ${joueur.prenom}` : joueur.nom;
            if (confirm(`Supprimer le joueur « ${nom} » ?`)) {
                this._supprimerJoueur(pouleId, joueur.id);
            }
        });

        // Bloquer menu navigateur
        badge.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });

        // Ctrl+clic → sélection
        badge.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.stopPropagation();
                this._toggleSelection(joueur.id, pouleId, badge);
            } else {
                this._clearSelection();
            }
        });

        // Tooltip
        badge.addEventListener('mouseenter', (e) => {
            this._tooltipTimer = setTimeout(() => this._showTooltip(joueur, e.clientX, e.clientY), 1000);
        });
        badge.addEventListener('mousemove', (e) => {
            if (this.dom.joueurTooltip.style.display === 'block') this._positionTooltip(e.clientX, e.clientY);
        });
        badge.addEventListener('mouseleave', () => this._hideTooltip());

        // Drag
        badge.addEventListener('dragstart', (e) => {
            this._hideTooltip();
            if (this._selection.has(joueur.id)) {
                this._dragJoueurs = [...this._selection.entries()].map(([jid, pid]) => ({ joueurId: jid, pouleId: pid }));
            } else {
                this._clearSelection();
                this._dragJoueurs = [{ joueurId: joueur.id, pouleId }];
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            setTimeout(() => {
                this._dragJoueurs.forEach(({ joueurId: jid, pouleId: pid }) => {
                    const el = this.dom.poulesColumns.querySelector(`.poule-col[data-id="${pid}"] [data-joueur-id="${jid}"]`);
                    if (el) el.classList.add('dragging');
                });
            }, 0);
        });
        badge.addEventListener('dragend', () => {
            this._dragJoueurs = [];
            document.querySelectorAll('.joueur-badge.dragging').forEach(el => el.classList.remove('dragging'));
            document.querySelectorAll('.poule-col.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        badge.appendChild(genreEl);
        badge.appendChild(infoEl);
        badge.appendChild(delBtn);
        return badge;
    }

    // ─── Gestion des poules ───────────────────────────────────────────────────────
    _ajouterPoule() {
        const id = this.state.nextId++;
        const used = new Set(
            this.state.poules
                .map(p => p.nom.match(/^Poule (\d+)$/))
                .filter(Boolean)
                .map(m => parseInt(m[1], 10))
        );
        let n = 1;
        while (used.has(n)) n++;
        this.state.poules.push({ id, nom: `Poule ${n}`, joueurs: [], config: AccueilPage._defaultConfig() });
        this._renderColumns();
    }

    _supprimerPoule(id) {
        if (this.state.poules.length <= 1) return;
        this.state.poules = this.state.poules.filter(p => p.id !== id);
        this._renderColumns();
    }

    _reset() {
        if (!confirm('Réinitialiser toutes les poules et tous les joueurs ?')) return;
        this.state.poules  = [{ id: 1, nom: 'Poule 1', joueurs: [], config: AccueilPage._defaultConfig() }];
        this.state.nextId  = 2;
        this._renderColumns();
    }

    // ─── Gestion des joueurs ──────────────────────────────────────────────────────
    _supprimerJoueur(pouleId, joueurId) {
        const poule = this.state.poules.find(p => p.id === pouleId);
        if (!poule) return;
        poule.joueurs = poule.joueurs.filter(j => j.id !== joueurId);
        this._refreshColonne(pouleId);
    }

    _deplacerJoueurs(joueursList, targetPouleId) {
        const targetPoule = this.state.poules.find(p => p.id === targetPouleId);
        if (!targetPoule) return;
        const affectedIds = new Set([targetPouleId]);

        joueursList.forEach(({ joueurId, pouleId: srcId }) => {
            if (srcId === targetPouleId) return;
            const srcPoule = this.state.poules.find(p => p.id === srcId);
            if (!srcPoule) return;
            const joueur = srcPoule.joueurs.find(j => j.id === joueurId);
            if (!joueur) return;
            srcPoule.joueurs = srcPoule.joueurs.filter(j => j.id !== joueurId);
            targetPoule.joueurs.push(joueur);
            affectedIds.add(srcId);
        });

        this._clearSelection();
        this._dragJoueurs = [];
        affectedIds.forEach(pid => this._refreshColonne(pid));
    }

    /** Rafraîchit corps + compteur d'une colonne sans re-render global */
    _refreshColonne(pouleId) {
        const poule = this.state.poules.find(p => p.id === pouleId);
        if (!poule) return;
        const colEl = this.dom.poulesColumns.querySelector(`.poule-col[data-id="${pouleId}"]`);
        if (!colEl) return;
        this._renderJoueurs(poule, colEl.querySelector('.poule-col-body'));
        const titleEl = colEl.querySelector('.poule-col-title');
        if (titleEl) titleEl.textContent = poule.nom;
        const countEl = colEl.querySelector('.poule-part-count');
        if (countEl) countEl.textContent = poule.joueurs.length;
        this._majBtnLancer();
    }

    // ─── Renommage inline ─────────────────────────────────────────────────────────
    _demarrerRenommage(headerEl, poule) {
        if (headerEl.querySelector('.poule-col-rename-input')) return;
        const titleEl = headerEl.querySelector('.poule-col-title');
        if (!titleEl) return;

        const input = document.createElement('input');
        input.type      = 'text';
        input.className = 'poule-col-rename-input';
        input.value     = poule.nom;

        const valider = () => {
            poule.nom = input.value.trim() || poule.nom;
            titleEl.textContent = poule.nom;
            if (input.parentNode === headerEl) headerEl.replaceChild(titleEl, input);
        };

        input.addEventListener('blur', valider);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  input.blur();
            if (e.key === 'Escape') { input.value = poule.nom; input.blur(); }
            e.stopPropagation();
        });
        input.addEventListener('click', (e) => e.stopPropagation());
        headerEl.replaceChild(input, titleEl);
        input.focus();
        input.select();
    }

    // ─── Menus contextuels ────────────────────────────────────────────────────────
    _ouvrirCtxMenu(x, y, pouleId) {
        this._ctxTargetId = pouleId;
        const m = this.dom.ctxMenu;
        m.style.display = 'block';
        const deleteItem = m.querySelector('[data-ctx="delete"]');
        const divider    = m.querySelector('.ctx-menu-divider');
        const seul = this.state.poules.length <= 1;
        deleteItem.style.display = seul ? 'none' : '';
        divider.style.display    = seul ? 'none' : '';
        this._positionMenu(m, x, y);
    }

    _ouvrirBodyCtxMenu(x, y, pouleId) {
        this._bodyCtxPouleId = pouleId;
        const m = this.dom.bodyCtxMenu;
        m.style.display = 'block';
        this._positionMenu(m, x, y);
    }

    _fermerCtxMenus() {
        this.dom.ctxMenu.style.display     = 'none';
        this.dom.bodyCtxMenu.style.display = 'none';
        this._ctxTargetId    = null;
        this._bodyCtxPouleId = null;
    }

    _positionMenu(el, x, y) {
        const mw = el.offsetWidth  || 170;
        const mh = el.offsetHeight || 80;
        el.style.left = (x + mw > window.innerWidth  ? x - mw : x) + 'px';
        el.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
    }

    // ─── Tooltip ─────────────────────────────────────────────────────────────────
    _showTooltip(joueur, x, y) {
        this.dom.joueurTooltip.innerHTML = `
            <div class="tt-row"><span class="tt-label">Sexe</span><span class="tt-val">${joueur.genre === Genre.FEMME ? 'Femme (F)' : 'Homme (H)'}</span></div>
            <div class="tt-row"><span class="tt-label">Nom</span><span class="tt-val">${joueur.nom.toUpperCase()}</span></div>
            <div class="tt-row"><span class="tt-label">Prénom</span><span class="tt-val">${joueur.prenom || '—'}</span></div>
            <div class="tt-divider"></div>
            <div class="tt-classements">
                <div class="tt-class-item"><span class="tt-class-label">Simple</span><span class="tt-class-val">${joueur.niveauSimple || Niveau.NC}</span></div>
                <div class="tt-class-item"><span class="tt-class-label">Double</span><span class="tt-class-val">${joueur.niveauDouble || Niveau.NC}</span></div>
                <div class="tt-class-item"><span class="tt-class-label">Mixte</span><span class="tt-class-val">${joueur.niveauMixte  || Niveau.NC}</span></div>
            </div>`;
        this.dom.joueurTooltip.style.display = 'block';
        this._positionTooltip(x, y);
    }

    _hideTooltip() {
        clearTimeout(this._tooltipTimer);
        this._tooltipTimer = null;
        this.dom.joueurTooltip.style.display = 'none';
    }

    _positionTooltip(x, y) {
        const tt = this.dom.joueurTooltip;
        const tw = tt.offsetWidth  || 190;
        const th = tt.offsetHeight || 120;
        tt.style.left = (x + 14 + tw > window.innerWidth  ? x - tw - 4 : x + 14) + 'px';
        tt.style.top  = (y + 14 + th > window.innerHeight ? y - th - 4 : y + 14) + 'px';
    }

    // ─── Sélection multiple ───────────────────────────────────────────────────────
    _toggleSelection(joueurId, pouleId, badgeEl) {
        if (this._selection.has(joueurId)) {
            this._selection.delete(joueurId);
            badgeEl.classList.remove('selected');
        } else {
            this._selection.set(joueurId, pouleId);
            badgeEl.classList.add('selected');
        }
    }

    _clearSelection() {
        this._selection.clear();
        document.querySelectorAll('.joueur-badge.selected').forEach(el => el.classList.remove('selected'));
    }

    // ─── Import XLSX ──────────────────────────────────────────────────────────────
    _importerJoueurs() {
        this.dom.fileInputXLSX.value = '';
        this.dom.fileInputXLSX.click();
    }

    async _onXLSXChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('⚠️ L\'import va réinitialiser toutes les poules et les joueurs existants.\n\nContinuer ?')) return;

        try {
            const data     = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheets   = workbook.SheetNames;
            if (!sheets.length) { alert('Le fichier ne contient aucune feuille.'); return; }

            this.state.poules  = [];
            this.state.nextId  = 1;

            for (const sheetName of sheets) {
                const sheet   = workbook.Sheets[sheetName];
                if (!sheet) continue;
                const rows    = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                const joueurs = [];

                rows.slice(1).filter(r => r && r.length).forEach(row => {
                    const joueur = Joueur.fromXLSXRow(row);
                    if (!joueur.nom) return;
                    joueur.id = this.state.nextId++;
                    joueurs.push(joueur);
                });

                const id = this.state.nextId++;
                this.state.poules.push({ id, nom: sheetName, joueurs, config: AccueilPage._defaultConfig() });
            }

            this._renderColumns();
            const total = this.state.poules.reduce((s, p) => s + p.joueurs.length, 0);
            alert(`✅ Import terminé : ${sheets.length} poule(s), ${total} joueur(s).`);
        } catch (err) {
            console.error('Erreur import XLSX:', err);
            alert('❌ Impossible de lire le fichier. Vérifiez le format XLSX.');
        }
    }

    // ─── Modal ajout joueur ───────────────────────────────────────────────────────
    _ouvrirModalAjoutJoueur(pouleId) {
        document.getElementById('addJoueurModal')?.remove();

        const poule   = this.state.poules.find(p => p.id === pouleId);
        const overlay = document.createElement('div');
        overlay.id        = 'addJoueurModal';
        overlay.className = 'modal-overlay';

        const box = document.createElement('div');
        box.className = 'modal-box';
        box.addEventListener('click', (e) => e.stopPropagation());

        // Titre
        const title = document.createElement('h2');
        title.className   = 'modal-title';
        title.textContent = `Ajouter un joueur${poule ? ' – ' + poule.nom : ''}`;
        box.appendChild(title);

        // Sexe
        box.appendChild(this._formGroup('Sexe'));
        const radiosDiv = document.createElement('div');
        radiosDiv.className = 'form-radios';
        radiosDiv.appendChild(this._radio('genre', 'H', 'Homme (H)', true));
        radiosDiv.appendChild(this._radio('genre', 'F', 'Femme (F)', false));
        box.lastChild.appendChild(radiosDiv);

        // Nom
        const nomGroup = this._formGroup('Nom *', 'ajNom');
        const nomInput = document.createElement('input');
        nomInput.type = 'text'; nomInput.id = 'ajNom';
        nomInput.className = 'form-input'; nomInput.placeholder = 'Nom de famille';
        nomGroup.appendChild(nomInput);
        box.appendChild(nomGroup);

        // Prénom
        const prenomGroup = this._formGroup('Prénom', 'ajPrenom');
        const prenomInput = document.createElement('input');
        prenomInput.type = 'text'; prenomInput.id = 'ajPrenom';
        prenomInput.className = 'form-input'; prenomInput.placeholder = 'Prénom';
        prenomGroup.appendChild(prenomInput);
        box.appendChild(prenomGroup);

        // Classements
        const classGroup = this._formGroup('Classements');
        const classRow   = document.createElement('div');
        classRow.className = 'form-classements-row';
        classRow.appendChild(this._selectGroup('Simple', 'ajSimple'));
        classRow.appendChild(this._selectGroup('Double', 'ajDouble'));
        classRow.appendChild(this._selectGroup('Mixte',  'ajMixte'));
        classGroup.appendChild(classRow);
        box.appendChild(classGroup);

        // Boutons
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button'; cancelBtn.className = 'btn-modal btn-modal-cancel';
        cancelBtn.textContent = 'Annuler'; cancelBtn.onclick = () => overlay.remove();
        const validateBtn = document.createElement('button');
        validateBtn.type = 'button'; validateBtn.className = 'btn-modal btn-modal-validate';
        validateBtn.textContent = 'Valider';
        validateBtn.onclick = () => this._validerAjoutJoueur(overlay, pouleId);
        actions.appendChild(cancelBtn);
        actions.appendChild(validateBtn);
        box.appendChild(actions);

        overlay.appendChild(box);
        overlay.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') overlay.remove();
            if (e.key === 'Enter' && e.target !== cancelBtn && e.target.tagName !== 'SELECT') {
                this._validerAjoutJoueur(overlay, pouleId);
            }
        });
        document.body.appendChild(overlay);
        setTimeout(() => nomInput.focus(), 50);
    }

    _validerAjoutJoueur(overlay, pouleId) {
        const nomInput = document.getElementById('ajNom');
        const nom = nomInput.value.trim();
        if (!nom) { nomInput.classList.add('input-error'); nomInput.focus(); return; }
        nomInput.classList.remove('input-error');

        const poule = this.state.poules.find(p => p.id === pouleId);
        if (!poule) return;

        const genreRadio = document.querySelector('#addJoueurModal input[name="genre"]:checked');
        poule.joueurs.push(new Joueur({
            id:           this.state.nextId++,
            nom,
            prenom:       document.getElementById('ajPrenom').value.trim(),
            genre:        genreRadio ? genreRadio.value : Genre.HOMME,
            niveauSimple: document.getElementById('ajSimple').value,
            niveauDouble: document.getElementById('ajDouble').value,
            niveauMixte:  document.getElementById('ajMixte').value
        }));

        this._refreshColonne(pouleId);
        overlay.remove();
    }

    // ─── Helpers formulaire ───────────────────────────────────────────────────────
    _formGroup(labelText, forId = null) {
        const group = document.createElement('div');
        group.className = 'form-group';
        const lbl = document.createElement(forId ? 'label' : 'span');
        lbl.className   = 'form-label';
        lbl.textContent = labelText;
        if (forId) lbl.setAttribute('for', forId);
        group.appendChild(lbl);
        return group;
    }

    _radio(name, value, labelText, checked) {
        const wrapper = document.createElement('label');
        wrapper.className = 'radio-label';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = name; input.value = value; input.checked = checked;
        wrapper.appendChild(input);
        wrapper.appendChild(document.createTextNode('\u00a0' + labelText));
        return wrapper;
    }

    _selectGroup(labelText, id) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-select-group';
        const lbl = document.createElement('span');
        lbl.className = 'form-select-label'; lbl.textContent = labelText;
        const select = document.createElement('select');
        select.id = id; select.className = 'form-select';
        NIVEAUX_ORDONNES.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n; opt.textContent = n;
            select.appendChild(opt);
        });
        wrapper.appendChild(lbl);
        wrapper.appendChild(select);
        return wrapper;
    }

    // ─── Config par poule ─────────────────────────────────────────────────────────

    static _defaultConfig() {
        return {
            nbTours:        10,
            nbTerrains:      7,
            premierTerrain:  1,
            modeComptage:   'POINTS',
            pointsMax:      21,
            tempsMatch:      8,
            handicaps:      false,
            handicapParams: {
                homme: 0, femme: 2,
                NC: 0, P12: -1, P11: -2, P10: -3,
                D9: -4, D8: -5, D7: -6,
                R6: -7, R5: -8, R4: -9,
                N3: -10, N2: -11, N1: -12
            }
        };
    }

    // ─── Builders de colonnes ─────────────────────────────────────────────────────

    _buildColHeader(poule) {
        const header = document.createElement('div');
        header.className = 'poule-col-header';

        const title = document.createElement('span');
        title.className   = 'poule-col-title';
        title.textContent = poule.nom;
        header.appendChild(title);

        if (this.state.poules.length > 1) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'poule-col-close';
            closeBtn.title     = 'Supprimer cette poule';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Supprimer la poule « ${poule.nom} » et tous ses joueurs ?`)) {
                    this._supprimerPoule(poule.id);
                }
            });
            header.appendChild(closeBtn);
        }

        header.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._demarrerRenommage(header, poule);
        });
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this._ouvrirCtxMenu(e.clientX, e.clientY, poule.id);
        });

        return header;
    }

    _buildParticipantsSection(poule) {
        const section = document.createElement('div');
        section.className = 'poule-section poule-section-participants';

        const secHead = document.createElement('div');
        secHead.className = 'poule-section-header';
        secHead.innerHTML = `
            <svg class="poule-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span class="poule-section-title">Participants</span>
            <span class="poule-part-count">${poule.joueurs.length}</span>`;
        section.appendChild(secHead);

        const body = document.createElement('div');
        body.className = 'poule-col-body poule-section-body';
        this._renderJoueurs(poule, body);
        body.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.joueur-badge')) return;
            e.preventDefault();
            e.stopPropagation();
            this._fermerCtxMenus();
            this._ouvrirBodyCtxMenu(e.clientX, e.clientY, poule.id);
        });
        section.appendChild(body);

        return section;
    }

    _buildConfigPanel(poule) {
        const cfg = poule.config;
        const section = document.createElement('div');
        section.className = 'poule-section poule-section-config';

        // ── En-tête section ──
        const secHead = document.createElement('div');
        secHead.className = 'poule-section-header';
        secHead.innerHTML = `
            <svg class="poule-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span class="poule-section-title">Configuration</span>`;
        section.appendChild(secHead);

        // ── Corps config ──
        const body = document.createElement('div');
        body.className = 'poule-config-body';

        // Conteneur unique flex-wrap pour tous les champs
        const fieldsRow = document.createElement('div');
        fieldsRow.className = 'cfg-fields-inline';

        fieldsRow.appendChild(this._cfgField('Nbre de tours',    this._spinner(cfg.nbTours,      1, 50, v => cfg.nbTours      = v)));
        fieldsRow.appendChild(this._cfgField('Nbre de terrains', this._spinner(cfg.nbTerrains,   1, 20, v => cfg.nbTerrains   = v)));
        fieldsRow.appendChild(this._cfgField('1er terrain nº',   this._spinner(cfg.premierTerrain, 1, 99, v => cfg.premierTerrain = v)));

        // Mode comptage + conditionnel
        const modeField = this._cfgField('Comptage', null);
        const modeSelect = document.createElement('select');
        modeSelect.className = 'cfg-select';
        [['POINTS','Aux points'],['TEMPS','Au temps'],['AUCUN','Sans comptage']].forEach(([v, l]) => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = l;
            if (cfg.modeComptage === v) opt.selected = true;
            modeSelect.appendChild(opt);
        });
        modeField.appendChild(modeSelect);
        fieldsRow.appendChild(modeField);

        const condPoints = this._cfgField('Points gagnants', this._spinner(cfg.pointsMax,  1, 100, v => cfg.pointsMax  = v));
        condPoints.style.display = cfg.modeComptage === 'POINTS' ? '' : 'none';
        const condTemps  = this._cfgField('Durée (min)',       this._spinner(cfg.tempsMatch, 1, 60,  v => cfg.tempsMatch = v));
        condTemps.style.display  = cfg.modeComptage === 'TEMPS'  ? '' : 'none';

        modeSelect.addEventListener('change', () => {
            cfg.modeComptage = modeSelect.value;
            condPoints.style.display = cfg.modeComptage === 'POINTS' ? '' : 'none';
            condTemps.style.display  = cfg.modeComptage === 'TEMPS'  ? '' : 'none';
        });
        fieldsRow.appendChild(condPoints);
        fieldsRow.appendChild(condTemps);

        // Case handicaps (dans le même flux inline)
        const hLabel = document.createElement('label');
        hLabel.className = 'cfg-checkbox';
        const hCheck = document.createElement('input');
        hCheck.type = 'checkbox'; hCheck.checked = cfg.handicaps;
        hLabel.appendChild(hCheck);
        hLabel.appendChild(document.createTextNode('\u00a0Handicaps'));
        fieldsRow.appendChild(hLabel);

        body.appendChild(fieldsRow);

        // Zone handicaps (masquée par défaut)
        const hZone = document.createElement('div');
        hZone.className = 'handicap-zone';
        hZone.style.display = cfg.handicaps ? '' : 'none';
        hCheck.addEventListener('change', () => {
            cfg.handicaps = hCheck.checked;
            hZone.style.display = hCheck.checked ? '' : 'none';
        });

        // Handicap par genre
        const gSec = document.createElement('div');
        gSec.className = 'handicap-section';
        gSec.innerHTML = '<div class="handicap-section-title">Handicap par genre</div>';
        const gGrid = document.createElement('div');
        gGrid.className = 'handicap-grid';
        gGrid.appendChild(this._handicapItem('Homme', cfg.handicapParams.homme, v => cfg.handicapParams.homme = v));
        gGrid.appendChild(this._handicapItem('Femme', cfg.handicapParams.femme, v => cfg.handicapParams.femme = v));
        gSec.appendChild(gGrid);
        hZone.appendChild(gSec);

        // Handicap par niveau
        const nSec = document.createElement('div');
        nSec.className = 'handicap-section';
        nSec.innerHTML = '<div class="handicap-section-title">Handicap par niveau</div>';
        const nGrid = document.createElement('div');
        nGrid.className = 'handicap-grid handicap-grid-niveau';
        ['NC','P12','P11','P10','D9','D8','D7','R6','R5','R4','N3','N2','N1'].forEach(n => {
            nGrid.appendChild(this._handicapItem(n, cfg.handicapParams[n], v => cfg.handicapParams[n] = v));
        });
        nSec.appendChild(nGrid);
        hZone.appendChild(nSec);

        body.appendChild(hZone);
        section.appendChild(body);
        return section;
    }

    // ─── Helpers config ───────────────────────────────────────────────────────────

    _cfgRow() {
        const row = document.createElement('div');
        row.className = 'cfg-row';
        return row;
    }

    _cfgField(label, control) {
        const field = document.createElement('div');
        field.className = 'cfg-field';
        const lbl = document.createElement('span');
        lbl.className = 'cfg-label'; lbl.textContent = label;
        field.appendChild(lbl);
        if (control) field.appendChild(control);
        return field;
    }

    _spinner(value, min, max, onChange) {
        const wrap  = document.createElement('div');
        wrap.className = 'num-spinner';

        const minus = document.createElement('button');
        minus.type = 'button'; minus.className = 'num-btn'; minus.textContent = '−';

        const input = document.createElement('input');
        input.type = 'number'; input.className = 'num-val';
        input.value = value; input.min = min; input.max = max;

        const plus  = document.createElement('button');
        plus.type = 'button'; plus.className = 'num-btn'; plus.textContent = '+';

        minus.addEventListener('click', () => {
            const v = parseInt(input.value);
            if (v > min) { input.value = v - 1; onChange(v - 1); }
        });
        plus.addEventListener('click', () => {
            const v = parseInt(input.value);
            if (v < max) { input.value = v + 1; onChange(v + 1); }
        });
        input.addEventListener('change', () => {
            const v = Math.min(max, Math.max(min, parseInt(input.value) || min));
            input.value = v; onChange(v);
        });

        wrap.appendChild(minus);
        wrap.appendChild(input);
        wrap.appendChild(plus);
        return wrap;
    }

    _handicapItem(label, value, onChange) {
        const item = document.createElement('div');
        item.className = 'handicap-item';
        const lbl = document.createElement('span');
        lbl.className = 'handicap-item-label'; lbl.textContent = label;
        item.appendChild(lbl);
        item.appendChild(this._spinner(value, -20, 20, onChange));
        return item;
    }

    // ─── Lancer les tournois ──────────────────────────────────────────────────────

    _majBtnLancer() {
        if (!this.dom.btnLancer) return;
        // Toutes les poules doivent avoir au moins 4 joueurs
        const pret = this.state.poules.length > 0 &&
                     this.state.poules.every(p => p.joueurs.length >= 4);
        this.dom.btnLancer.disabled = !pret;
    }

    async _lancerTournois() {
        // Vérifier que TOUTES les poules ont au moins 4 joueurs
        const poulesFautives = this.state.poules.filter(p => p.joueurs.length < 4);
        if (poulesFautives.length > 0) {
            const noms = poulesFautives.map(p =>
                `• ${p.nom} : ${p.joueurs.length} joueur(s)`
            ).join('\n');
            alert(`Impossible de lancer le tournoi.\n\nLes poules suivantes ont moins de 4 joueurs :\n${noms}`);
            return;
        }

        const poulesPrets = this.state.poules;
        if (!poulesPrets.length) return;
        
        // Vérifier les conflits de terrains (chevauchement)
        const terrainsUtilises = new Map();
        const conflitsTerrains = [];

        for (const p of poulesPrets) {
            const start = parseInt(p.config.premierTerrain || 1, 10);
            const nb = parseInt(p.config.nbTerrains || 7, 10);
            const end = start + nb - 1;
            
            for (let t = start; t <= end; t++) {
                if (terrainsUtilises.has(t)) {
                    conflitsTerrains.push(`• T.${t} : ${terrainsUtilises.get(t)} et ${p.nom}`);
                } else {
                    terrainsUtilises.set(t, p.nom);
                }
            }
        }
        
        if (conflitsTerrains.length > 0) {
            const conflitsUniques = [...new Set(conflitsTerrains)];
            alert(`Impossible de lancer le tournoi.\n\nTélescopage de terrains:\n${conflitsUniques.join('\n')}\n\nVérifiez "Premier terrain" et "Nb terrains".`);
            return;
        }

        // 1. Initialiser le tournoi et générer les tours pour chaque poule
        const db = new window.TournoiDB();
        await db.init();
        
        // Exporter manuellement l'état pour écraser complètement
        const dbState = {
            version: window.TournoiDB.VERSION,
            tournoi: { nom: 'Tournoi V3', date: new Date().toISOString() },
            // On prépare les poules avec leurs matchs générés
            poules: poulesPrets.map((p, index) => {
                // Génération des matchs via l'outil
                const gen = window.GenerateurTournoiV3.fromPoule(p);
                
                return {
                    id: p.id || (index + 1),
                    nom: p.nom,
                    config: p.config,
                    joueurs: p.joueurs,
                    tours: gen.tours,
                    colorIndex: (index % 4) + 1, // Pour la couleur UI
                    terrainStart: p.config.premierTerrain,
                    terrainEnd: p.config.premierTerrain + p.config.nbTerrains - 1,
                    
                    // Ajout d'états UI persistés ou par défaut
                    liveRoundIndex: 0,
                    viewedRoundIndex: 0
                };
            }),
            tours: [], // Utilisé potentiellement plus tard ou pour fusion
            nextId: 1000
        };

        // 2. Mettre à jour la base de données
        await db.importState(dbState);

        // 3. Ouvrir la nouvelle page de Tournoi dans un nouvel onglet, SANS lien de parenté (pour éviter l'erreur de sécurité file://)
        window.open('tournoi.html', '_blank', 'noopener,noreferrer');
    }
}

// Export global
window.AccueilPage = AccueilPage;
