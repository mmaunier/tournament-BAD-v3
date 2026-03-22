/**
 * app.js — Logique de base V3 (prototype test)
 * Layout colonnes : une colonne par poule, découpe verticale équitable.
 */

// ─── État global ───────────────────────────────────────────────────────────────
const state = {
    poules: [
        { id: 1, nom: 'Poule 1', joueurs: [] }
    ],
    nextId: 2
};

// ─── Références DOM ────────────────────────────────────────────────────────────
const poulesColumns = document.getElementById('poulesColumns');
const btnAddPoule   = document.getElementById('btnAddPoule');
const menuTrigger   = document.getElementById('menuTrigger');
const dropdownMenu  = document.getElementById('dropdownMenu');
const mainMenu      = document.getElementById('mainMenu');
const ctxMenu       = document.getElementById('ctxMenu');

let ctxTargetId    = null;
let bodyCtxPouleId = null;

const NIVEAUX = ['NC', 'P12', 'P11', 'P10', 'D9', 'D8', 'D7', 'R6', 'R5', 'R4', 'N3', 'N2', 'N1'];

const joueurTooltip = document.getElementById('joueurTooltip');
const bodyCtxMenu   = document.getElementById('bodyCtxMenu');
let   tooltipTimer  = null;

function positionTooltip(x, y) {
    const tw = joueurTooltip.offsetWidth  || 190;
    const th = joueurTooltip.offsetHeight || 120;
    let left = x + 14;
    let top  = y + 14;
    if (left + tw > window.innerWidth)  left = x - tw - 4;
    if (top  + th > window.innerHeight) top  = y - th - 4;
    joueurTooltip.style.left = left + 'px';
    joueurTooltip.style.top  = top  + 'px';
}

function showTooltip(joueur, x, y) {
    joueurTooltip.innerHTML = `
        <div class="tt-row"><span class="tt-label">Sexe</span><span class="tt-val">${joueur.genre === 'F' ? 'Femme (F)' : 'Homme (H)'}</span></div>
        <div class="tt-row"><span class="tt-label">Nom</span><span class="tt-val">${joueur.nom.toUpperCase()}</span></div>
        <div class="tt-row"><span class="tt-label">Prénom</span><span class="tt-val">${joueur.prenom || '—'}</span></div>
        <div class="tt-divider"></div>
        <div class="tt-classements">
            <div class="tt-class-item"><span class="tt-class-label">Simple</span><span class="tt-class-val">${joueur.classementSimple || 'NC'}</span></div>
            <div class="tt-class-item"><span class="tt-class-label">Double</span><span class="tt-class-val">${joueur.classementDouble || 'NC'}</span></div>
            <div class="tt-class-item"><span class="tt-class-label">Mixte</span><span class="tt-class-val">${joueur.classementMixte || 'NC'}</span></div>
        </div>`;
    joueurTooltip.style.display = 'block';
    positionTooltip(x, y);
}

function hideTooltip() {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
    joueurTooltip.style.display = 'none';
}

// ─── Sélection multiple & drag ────────────────────────────────────────────────
const selection = new Map(); // joueurId → pouleId
let dragJoueurs  = [];       // [{ joueurId, pouleId }] en cours de déplacement

function toggleSelection(joueurId, pouleId, badgeEl) {
    if (selection.has(joueurId)) {
        selection.delete(joueurId);
        badgeEl.classList.remove('selected');
    } else {
        selection.set(joueurId, pouleId);
        badgeEl.classList.add('selected');
    }
}

function clearSelection() {
    selection.clear();
    document.querySelectorAll('.joueur-badge.selected').forEach(el => el.classList.remove('selected'));
}

// ─── Rendu des colonnes ────────────────────────────────────────────────────────
function renderColumns() {
    poulesColumns.innerHTML = '';

    state.poules.forEach(poule => {
        const col = document.createElement('div');
        col.className = 'poule-col';
        col.dataset.id = poule.id;

        // En-tête de colonne
        const header = document.createElement('div');
        header.className = 'poule-col-header';

        const title = document.createElement('span');
        title.className = 'poule-col-title';
        const count = poule.joueurs ? poule.joueurs.length : 0;
        title.textContent = `${poule.nom} (${count})`;
        header.appendChild(title);

        // Bouton × (seulement si plusieurs poules)
        if (state.poules.length > 1) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'poule-col-close';
            closeBtn.title = 'Supprimer cette poule';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Supprimer la poule « ${poule.nom} » et tous ses joueurs ?`)) {
                    supprimerPoule(poule.id);
                }
            });
            header.appendChild(closeBtn);
        }

        // Double-clic → renommer inline
        header.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            demarrerRenommage(header, poule);
        });

        // Clic droit → menu contextuel
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            ouvrirCtxMenu(e.clientX, e.clientY, poule.id);
        });

        col.appendChild(header);

        // Corps de la colonne
        const body = document.createElement('div');
        body.className = 'poule-col-body';
        renderJoueurs(poule, body);
        // Clic droit dans le corps → ajouter un joueur (pas sur un badge)
        body.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.joueur-badge')) return;
            e.preventDefault();
            e.stopPropagation();
            fermerCtxMenu();
            ouvrirBodyCtxMenu(e.clientX, e.clientY, poule.id);
        });
        col.appendChild(body);

        // ── Zone de dépôt ──
        col.addEventListener('dragenter', (e) => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        col.addEventListener('dragleave', (e) => {
            if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
        });
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            if (dragJoueurs.length > 0) deplacerJoueurs(dragJoueurs, poule.id);
        });

        poulesColumns.appendChild(col);
    });
}

// ─── Ajout d'une poule ─────────────────────────────────────────────────────────
function ajouterPoule() {
    const id = state.nextId++;
    state.poules.push({ id, nom: `Poule ${id}`, joueurs: [] });
    renderColumns();
}

// ─── Rendu des joueurs dans une colonne ────────────────────────────────────────
function renderJoueurs(poule, bodyEl) {
    bodyEl.innerHTML = '';

    if (!poule.joueurs || poule.joueurs.length === 0) {
        bodyEl.innerHTML = `
            <div class="poule-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p>Aucun joueur dans cette poule</p>
                <small>Importez un fichier XLSX pour ajouter des joueurs.</small>
            </div>`;
        return;
    }

    const list = document.createElement('div');
    list.className = 'joueurs-list';
    const joueursTries = [...poule.joueurs].sort((a, b) => {
        const nc = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
        return nc !== 0 ? nc : (a.prenom || '').localeCompare(b.prenom || '', 'fr', { sensitivity: 'base' });
    });
    joueursTries.forEach(joueur => list.appendChild(creerBadgeJoueur(joueur, poule.id)));
    bodyEl.appendChild(list);
}

// ─── Création d'un badge joueur ────────────────────────────────────────────────
function creerBadgeJoueur(joueur, pouleId) {
    const badge = document.createElement('div');
    badge.className = `joueur-badge joueur-badge-${joueur.genre === 'F' ? 'f' : 'h'}`;
    badge.dataset.joueurId = String(joueur.id);
    badge.draggable = true;

    const genreEl = document.createElement('span');
    genreEl.className = 'joueur-badge-genre';
    genreEl.textContent = joueur.genre;

    const infoEl = document.createElement('span');
    infoEl.className = 'joueur-badge-info';
    infoEl.textContent = `${joueur.nom.toUpperCase()}${joueur.prenom ? ' ' + joueur.prenom : ''}`;

    const delBtn = document.createElement('button');
    delBtn.className = 'joueur-badge-delete';
    delBtn.title = 'Supprimer ce joueur';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nom = joueur.prenom ? `${joueur.nom} ${joueur.prenom}` : joueur.nom;
        if (confirm(`Supprimer le joueur « ${nom} » ?`)) {
            supprimerJoueur(pouleId, joueur.id);
        }
    });

    // ── Bloquer le menu contextuel du navigateur sur les badges ──
    badge.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    // ── Ctrl+clic → sélection multiple ──
    badge.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            toggleSelection(joueur.id, pouleId, badge);
        } else {
            clearSelection();
        }
    });

    // ── Tooltip au survol (délai 1 s) ──
    badge.addEventListener('mouseenter', (e) => {
        tooltipTimer = setTimeout(() => showTooltip(joueur, e.clientX, e.clientY), 1000);
    });
    badge.addEventListener('mousemove', (e) => {
        if (joueurTooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
    });
    badge.addEventListener('mouseleave', hideTooltip);

    // ── Drag & drop ──
    badge.addEventListener('dragstart', (e) => {
        hideTooltip();
        if (selection.has(joueur.id)) {
            // Glisser tout le groupe sélectionné
            dragJoueurs = [...selection.entries()].map(([jid, pid]) => ({ joueurId: jid, pouleId: pid }));
        } else {
            clearSelection();
            dragJoueurs = [{ joueurId: joueur.id, pouleId }];
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // requis pour Firefox
        // Marquer APRÈS la capture du ghost (setTimeout 0)
        setTimeout(() => {
            dragJoueurs.forEach(({ joueurId: jid, pouleId: pid }) => {
                const el = poulesColumns.querySelector(`.poule-col[data-id="${pid}"] [data-joueur-id="${jid}"]`);
                if (el) el.classList.add('dragging');
            });
        }, 0);
    });

    badge.addEventListener('dragend', () => {
        dragJoueurs = [];
        document.querySelectorAll('.joueur-badge.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.poule-col.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    badge.appendChild(genreEl);
    badge.appendChild(infoEl);
    badge.appendChild(delBtn);
    return badge;
}

// ─── Déplacement de joueurs entre poules ─────────────────────────────────────
function deplacerJoueurs(joueursList, targetPouleId) {
    const targetPoule = state.poules.find(p => p.id === targetPouleId);
    if (!targetPoule) return;

    const affectedIds = new Set([targetPouleId]);

    joueursList.forEach(({ joueurId, pouleId: srcPouleId }) => {
        if (srcPouleId === targetPouleId) return; // déjà dans la cible
        const srcPoule = state.poules.find(p => p.id === srcPouleId);
        if (!srcPoule) return;
        const joueur = srcPoule.joueurs.find(j => j.id === joueurId);
        if (!joueur) return;
        srcPoule.joueurs = srcPoule.joueurs.filter(j => j.id !== joueurId);
        targetPoule.joueurs.push(joueur);
        affectedIds.add(srcPouleId);
    });

    clearSelection();
    dragJoueurs = [];

    affectedIds.forEach(pid => {
        const poule = state.poules.find(p => p.id === pid);
        if (!poule) return;
        const colEl = poulesColumns.querySelector(`.poule-col[data-id="${pid}"]`);
        if (!colEl) return;
        renderJoueurs(poule, colEl.querySelector('.poule-col-body'));
        const titleEl = colEl.querySelector('.poule-col-title');
        if (titleEl) titleEl.textContent = `${poule.nom} (${poule.joueurs.length})`;
    });
}

// ─── Suppression d'un joueur ───────────────────────────────────────────────────
function supprimerJoueur(pouleId, joueurId) {
    const poule = state.poules.find(p => p.id === pouleId);
    if (!poule) return;
    poule.joueurs = poule.joueurs.filter(j => j.id !== joueurId);
    // Mise à jour ciblée du corps et du compteur dans l'en-tête
    const colEl = poulesColumns.querySelector(`.poule-col[data-id="${pouleId}"]`);
    if (colEl) {
        renderJoueurs(poule, colEl.querySelector('.poule-col-body'));
        const titleEl = colEl.querySelector('.poule-col-title');
        if (titleEl) titleEl.textContent = `${poule.nom} (${poule.joueurs.length})`;
    }
}

// ─── Import XLSX ───────────────────────────────────────────────────────────────
function importerJoueurs() {
    const fileInput = document.getElementById('fileInputXLSX');
    fileInput.value = '';
    fileInput.click();
}

document.getElementById('fileInputXLSX').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ok = confirm(
        '⚠️ L\'import va réinitialiser toutes les poules et les joueurs existants.\n\nContinuer ?'
    );
    if (!ok) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
            alert('Le fichier ne contient aucune feuille.');
            return;
        }

        // Reset complet
        state.poules = [];
        state.nextId = 1;

        for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;

            // Structure : [0] Sexe, [1] Nom, [2] Prénom, [3] Simple, [4] Double, [5] Mixte
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const joueurs = [];

            rows.slice(1).filter(row => row && row.length > 0).forEach(row => {
                const genreRaw = String(row[0] || 'H').toUpperCase().trim();
                const genre    = genreRaw.charAt(0) === 'F' ? 'F' : 'H';
                const nom      = String(row[1] || '').trim();
                const prenom   = String(row[2] || '').trim();
                if (!nom) return;
                joueurs.push({
                    id:                 Date.now() + Math.random(),
                    nom,
                    prenom,
                    genre,
                    classementSimple:   String(row[3] || 'NC').toUpperCase().trim() || 'NC',
                    classementDouble:   String(row[4] || 'NC').toUpperCase().trim() || 'NC',
                    classementMixte:    String(row[5] || 'NC').toUpperCase().trim() || 'NC'
                });
            });

            const id = state.nextId++;
            state.poules.push({ id, nom: sheetName, joueurs });
        }

        renderColumns();

        const totalJoueurs = state.poules.reduce((s, p) => s + p.joueurs.length, 0);
        alert(`✅ Import terminé : ${sheetNames.length} poule(s), ${totalJoueurs} joueur(s).`);
    } catch (err) {
        console.error('Erreur import XLSX:', err);
        alert('❌ Impossible de lire le fichier. Vérifiez le format XLSX.');
    }
});

// ─── Renommage inline (double-clic ou menu contextuel) ────────────────────────
function demarrerRenommage(headerEl, poule) {
    if (headerEl.querySelector('.poule-col-rename-input')) return;

    const titleEl = headerEl.querySelector('.poule-col-title');
    if (!titleEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'poule-col-rename-input';
    input.value = poule.nom;

    const valider = () => {
        const v = input.value.trim();
        poule.nom = v || poule.nom;
        const count = poule.joueurs ? poule.joueurs.length : 0;
        titleEl.textContent = `${poule.nom} (${count})`;
        if (input.parentNode === headerEl) headerEl.replaceChild(titleEl, input);
    };

    input.addEventListener('blur', valider);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { input.blur(); }
        if (e.key === 'Escape') { input.value = poule.nom; input.blur(); }
        e.stopPropagation();
    });
    input.addEventListener('click', (e) => e.stopPropagation());

    headerEl.replaceChild(input, titleEl);
    input.focus();
    input.select();
}

// ─── Menu contextuel (clic droit) ────────────────────────────────────────────
function ouvrirCtxMenu(x, y, pouleId) {
    ctxTargetId = pouleId;

    // Afficher / positionner
    ctxMenu.style.display = 'block';

    // Masquer l'option Supprimer si une seule poule
    const deleteItem = ctxMenu.querySelector('[data-ctx="delete"]');
    const divider    = ctxMenu.querySelector('.ctx-menu-divider');
    if (state.poules.length <= 1) {
        deleteItem.style.display = 'none';
        divider.style.display    = 'none';
    } else {
        deleteItem.style.display = '';
        divider.style.display    = '';
    }

    // Ajustement pour ne pas dépasser les bords de la fenêtre
    const mw = ctxMenu.offsetWidth  || 170;
    const mh = ctxMenu.offsetHeight || 80;
    ctxMenu.style.left = (x + mw > window.innerWidth  ? x - mw : x) + 'px';
    ctxMenu.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
}

function fermerCtxMenu() {
    ctxMenu.style.display     = 'none';
    bodyCtxMenu.style.display = 'none';
    ctxTargetId    = null;
    bodyCtxPouleId = null;
}

// Clics dans le menu contextuel
ctxMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.ctx-menu-item');
    if (!item) return;
    const action = item.dataset.ctx;
    fermerCtxMenu();

    if (action === 'rename') {
        const colEl = poulesColumns.querySelector(`.poule-col[data-id="${ctxTargetId}"]`);
        const poule = state.poules.find(p => p.id === ctxTargetId);
        if (colEl && poule) demarrerRenommage(colEl.querySelector('.poule-col-header'), poule);
    } else if (action === 'delete') {
        supprimerPoule(ctxTargetId);
    }
});

// ─── Suppression d'une poule ───────────────────────────────────────────────────
function supprimerPoule(id) {
    if (state.poules.length <= 1) return;
    state.poules = state.poules.filter(p => p.id !== id);
    renderColumns();
}

// ─── Menu hamburger ────────────────────────────────────────────────────────────
menuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    mainMenu.classList.toggle('open');
});

dropdownMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    mainMenu.classList.remove('open');

    const action = item.dataset.action;
    if (action === 'import-joueurs') {
        importerJoueurs();
    } else if (action === 'reset') {
        if (confirm('Réinitialiser toutes les poules et tous les joueurs ?')) {
            state.poules = [{ id: 1, nom: 'Poule 1', joueurs: [] }];
            state.nextId = 2;
            renderColumns();
        }
    }
});

// ─── Fermeture des menus au clic global ────────────────────────────────────────
document.addEventListener('click', (e) => {
    mainMenu.classList.remove('open');
    fermerCtxMenu();
    // Effacer la sélection si clic hors badge sans Ctrl
    if (!e.ctrlKey && !e.metaKey && !e.target.closest('.joueur-badge')) {
        clearSelection();
    }
});

// ─── Bouton + ──────────────────────────────────────────────────────────────────
btnAddPoule.addEventListener('click', ajouterPoule);

// ─── Menu contextuel corps de poule ───────────────────────────────────────────
bodyCtxMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.ctx-menu-item');
    if (!item) return;
    const pid = bodyCtxPouleId; // capturer avant fermerCtxMenu
    fermerCtxMenu();
    if (item.dataset.bctx === 'add-joueur' && pid !== null) {
        ouvrirModalAjoutJoueur(pid);
    }
});

function ouvrirBodyCtxMenu(x, y, pouleId) {
    bodyCtxPouleId = pouleId;
    bodyCtxMenu.style.display = 'block';
    const mw = bodyCtxMenu.offsetWidth  || 190;
    const mh = bodyCtxMenu.offsetHeight || 42;
    bodyCtxMenu.style.left = (x + mw > window.innerWidth  ? x - mw : x) + 'px';
    bodyCtxMenu.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
}

// ─── Modal d'ajout de joueur ──────────────────────────────────────────────────
function ouvrirModalAjoutJoueur(pouleId) {
    const old = document.getElementById('addJoueurModal');
    if (old) old.remove();

    const poule   = state.poules.find(p => p.id === pouleId);
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
    const sexeGroup = creerFormGroup('Sexe');
    const radiosDiv = document.createElement('div');
    radiosDiv.className = 'form-radios';
    radiosDiv.appendChild(creerRadio('genre', 'H', 'Homme (H)', true));
    radiosDiv.appendChild(creerRadio('genre', 'F', 'Femme (F)', false));
    sexeGroup.appendChild(radiosDiv);
    box.appendChild(sexeGroup);

    // Nom
    const nomGroup = creerFormGroup('Nom *', 'ajNom');
    const nomInput = document.createElement('input');
    nomInput.type        = 'text';
    nomInput.id          = 'ajNom';
    nomInput.className   = 'form-input';
    nomInput.placeholder = 'Nom de famille';
    nomGroup.appendChild(nomInput);
    box.appendChild(nomGroup);

    // Prénom
    const prenomGroup = creerFormGroup('Prénom', 'ajPrenom');
    const prenomInput = document.createElement('input');
    prenomInput.type        = 'text';
    prenomInput.id          = 'ajPrenom';
    prenomInput.className   = 'form-input';
    prenomInput.placeholder = 'Prénom';
    prenomGroup.appendChild(prenomInput);
    box.appendChild(prenomGroup);

    // Classements
    const classGroup = creerFormGroup('Classements');
    const classRow   = document.createElement('div');
    classRow.className = 'form-classements-row';
    classRow.appendChild(creerSelectGroup('Simple', 'ajSimple'));
    classRow.appendChild(creerSelectGroup('Double', 'ajDouble'));
    classRow.appendChild(creerSelectGroup('Mixte',  'ajMixte'));
    classGroup.appendChild(classRow);
    box.appendChild(classGroup);

    // Boutons
    const actions     = document.createElement('div');
    actions.className = 'modal-actions';
    const cancelBtn   = document.createElement('button');
    cancelBtn.type        = 'button';
    cancelBtn.className   = 'btn-modal btn-modal-cancel';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.onclick     = () => overlay.remove();
    const validateBtn = document.createElement('button');
    validateBtn.type        = 'button';
    validateBtn.className   = 'btn-modal btn-modal-validate';
    validateBtn.textContent = 'Valider';
    validateBtn.onclick     = () => validerAjoutJoueur(overlay, pouleId);
    actions.appendChild(cancelBtn);
    actions.appendChild(validateBtn);
    box.appendChild(actions);

    overlay.appendChild(box);
    overlay.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') overlay.remove();
        if (e.key === 'Enter' && e.target !== cancelBtn && e.target.tagName !== 'SELECT') {
            validerAjoutJoueur(overlay, pouleId);
        }
    });
    document.body.appendChild(overlay);
    setTimeout(() => nomInput.focus(), 50);
}

function creerFormGroup(labelText, forId = null) {
    const group = document.createElement('div');
    group.className = 'form-group';
    // Utiliser <label for=...> seulement si un champ cible est fourni
    const lbl = document.createElement(forId ? 'label' : 'span');
    lbl.className   = 'form-label';
    lbl.textContent = labelText;
    if (forId) lbl.setAttribute('for', forId);
    group.appendChild(lbl);
    return group;
}

function creerRadio(name, value, labelText, checked) {
    const wrapper = document.createElement('label');
    wrapper.className = 'radio-label';
    const input   = document.createElement('input');
    input.type    = 'radio';
    input.name    = name;
    input.value   = value;
    input.checked = checked;
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode('\u00a0' + labelText));
    return wrapper;
}

function creerSelectGroup(labelText, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-select-group';
    const lbl = document.createElement('span');
    lbl.className   = 'form-select-label';
    lbl.textContent = labelText;
    const select  = document.createElement('select');
    select.id        = id;
    select.className = 'form-select';
    NIVEAUX.forEach(n => {
        const opt   = document.createElement('option');
        opt.value   = n;
        opt.textContent = n;
        select.appendChild(opt);
    });
    wrapper.appendChild(lbl);
    wrapper.appendChild(select);
    return wrapper;
}

function validerAjoutJoueur(overlay, pouleId) {
    const nomInput = document.getElementById('ajNom');
    const nom      = nomInput.value.trim();
    if (!nom) {
        nomInput.classList.add('input-error');
        nomInput.focus();
        return;
    }
    nomInput.classList.remove('input-error');

    const poule = state.poules.find(p => p.id === pouleId);
    if (!poule) return;

    const genreRadio = document.querySelector('#addJoueurModal input[name="genre"]:checked');
    poule.joueurs.push({
        id:               Date.now() + Math.random(),
        nom,
        prenom:           document.getElementById('ajPrenom').value.trim(),
        genre:            genreRadio ? genreRadio.value : 'H',
        classementSimple: document.getElementById('ajSimple').value,
        classementDouble: document.getElementById('ajDouble').value,
        classementMixte:  document.getElementById('ajMixte').value
    });

    const colEl = poulesColumns.querySelector(`.poule-col[data-id="${pouleId}"]`);
    if (colEl) {
        renderJoueurs(poule, colEl.querySelector('.poule-col-body'));
        const titleEl = colEl.querySelector('.poule-col-title');
        if (titleEl) titleEl.textContent = `${poule.nom} (${poule.joueurs.length})`;
    }
    overlay.remove();
}

// ─── Init ──────────────────────────────────────────────────────────────────────
renderColumns();
