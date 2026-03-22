/**
 * TournoiDB.js — Base de données locale pour le tournoi V3
 *
 * Gère la persistance via localStorage (simple, synchrone).
 * Conçu pour le multi-poule : la structure centrale est un tableau `poules`,
 * chacune portant ses propres joueurs.
 *
 * Structure de données persistée :
 * {
 *   version:  1,
 *   tournoi:  { nom, date, terrain, ... },
 *   poules:   [{ id, nom, joueurs: [{ id, nom, prenom, genre, classementSimple, classementDouble, classementMixte }] }],
 *   tours:    [],
 *   nextId:   number
 * }
 */
class TournoiDB {

    static VERSION       = 1;
    static STORAGE_KEY   = 'tournoi-bad-v3';

    // ─── Constructeur ─────────────────────────────────────────────────────────────
    constructor() {
        /** @type {number} */
        this._nextId = 1;

        /** Cache en mémoire — source de vérité pendant la session */
        this._cache = {
            tournoi: null,
            poules:  [],
            tours:   []
        };
    }

    // ─── Initialisation ───────────────────────────────────────────────────────────

    /**
     * Charge le cache depuis localStorage (ou initialise un état vide).
     * À appeler au démarrage avant toute autre méthode.
     * @returns {Promise<void>}
     */
    async init() {
        const stored = this._load();
        if (stored) {
            this._cache.tournoi = stored.tournoi  ?? this._defaultTournoi();
            this._cache.poules  = stored.poules   ?? [];
            this._cache.tours   = stored.tours    ?? [];
            this._nextId        = stored.nextId   ?? this._computeNextId();
        } else {
            this._cache.tournoi = this._defaultTournoi();
            this._cache.poules  = [];
            this._cache.tours   = [];
            this._nextId        = 1;
            this._persist();
        }
    }

    // ─── Accesseurs de bas niveau ─────────────────────────────────────────────────

    _load() {
        try {
            const raw = localStorage.getItem(TournoiDB.STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    _persist() {
        try {
            localStorage.setItem(TournoiDB.STORAGE_KEY, JSON.stringify({
                version: TournoiDB.VERSION,
                tournoi: this._cache.tournoi,
                poules:  this._cache.poules,
                tours:   this._cache.tours,
                nextId:  this._nextId
            }));
        } catch (e) { console.warn('[TournoiDB] Persistance impossible :', e); }
    }

    _newId() { return this._nextId++; }

    _computeNextId() {
        let max = 0;
        this._cache.poules.forEach(p => {
            if (p.id > max) max = p.id;
            p.joueurs.forEach(j => { if (j.id > max) max = j.id; });
        });
        return max + 1;
    }

    _defaultTournoi() {
        return { nom: 'Tournoi interne', date: null, terrain: null };
    }

    // ─── Tournoi ──────────────────────────────────────────────────────────────────

    /**
     * Récupère les métadonnées du tournoi.
     * @returns {Promise<object>}
     */
    async getTournoi() { return { ...this._cache.tournoi }; }

    /**
     * Met à jour les métadonnées du tournoi (fusion partielle).
     * @param {object} updates
     * @returns {Promise<void>}
     */
    async updateTournoi(updates) {
        this._cache.tournoi = { ...this._cache.tournoi, ...updates };
        this._persist();
    }

    // ─── Gestion des poules ───────────────────────────────────────────────────────

    /**
     * Retourne toutes les poules (avec leurs joueurs).
     * @returns {Promise<Array>}
     */
    async getPoules() {
        return this._cache.poules.map(p => ({ ...p, joueurs: [...p.joueurs] }));
    }

    /**
     * Ajoute une nouvelle poule.
     * @param {string} nom
     * @returns {Promise<object>} La poule créée
     */
    async addPoule(nom) {
        const poule = { id: this._newId(), nom, joueurs: [] };
        this._cache.poules.push(poule);
        this._persist();
        return { ...poule };
    }

    /**
     * Met à jour les propriétés d'une poule (ex: rename).
     * @param {number} id
     * @param {object} updates
     * @returns {Promise<boolean>}
     */
    async updatePoule(id, updates) {
        const poule = this._cache.poules.find(p => p.id === id);
        if (!poule) return false;
        if (updates.nom !== undefined) poule.nom = updates.nom;
        this._persist();
        return true;
    }

    /**
     * Supprime une poule et tous ses joueurs.
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deletePoule(id) {
        const idx = this._cache.poules.findIndex(p => p.id === id);
        if (idx === -1) return false;
        this._cache.poules.splice(idx, 1);
        this._persist();
        return true;
    }

    // ─── Gestion des joueurs ──────────────────────────────────────────────────────

    /**
     * Retourne tous les joueurs d'une poule.
     * @param {number} pouleId
     * @returns {Promise<Array>}
     */
    async getJoueurs(pouleId) {
        const poule = this._cache.poules.find(p => p.id === pouleId);
        return poule ? [...poule.joueurs] : [];
    }

    /**
     * Ajoute un joueur dans une poule.
     * @param {number} pouleId
     * @param {object} joueurData  { nom, prenom, genre, classementSimple, classementDouble, classementMixte }
     * @returns {Promise<object>} Le joueur créé
     */
    async addJoueur(pouleId, joueurData) {
        const poule = this._cache.poules.find(p => p.id === pouleId);
        if (!poule) throw new Error(`Poule ${pouleId} introuvable`);
        const joueur = {
            id:               this._newId(),
            nom:              joueurData.nom,
            prenom:           joueurData.prenom           ?? '',
            genre:            joueurData.genre            ?? 'H',
            classementSimple: joueurData.classementSimple ?? 'NC',
            classementDouble: joueurData.classementDouble ?? 'NC',
            classementMixte:  joueurData.classementMixte  ?? 'NC'
        };
        poule.joueurs.push(joueur);
        this._persist();
        return { ...joueur };
    }

    /**
     * Met à jour les données d'un joueur (fusion partielle).
     * @param {number} pouleId
     * @param {number} joueurId
     * @param {object} updates
     * @returns {Promise<boolean>}
     */
    async updateJoueur(pouleId, joueurId, updates) {
        const poule = this._cache.poules.find(p => p.id === pouleId);
        if (!poule) return false;
        const joueur = poule.joueurs.find(j => j.id === joueurId);
        if (!joueur) return false;
        Object.assign(joueur, updates);
        this._persist();
        return true;
    }

    /**
     * Supprime un joueur d'une poule.
     * @param {number} pouleId
     * @param {number} joueurId
     * @returns {Promise<boolean>}
     */
    async deleteJoueur(pouleId, joueurId) {
        const poule = this._cache.poules.find(p => p.id === pouleId);
        if (!poule) return false;
        const before = poule.joueurs.length;
        poule.joueurs = poule.joueurs.filter(j => j.id !== joueurId);
        if (poule.joueurs.length === before) return false;
        this._persist();
        return true;
    }

    /**
     * Déplace un joueur d'une poule vers une autre.
     * @param {number} joueurId
     * @param {number} fromPouleId
     * @param {number} toPouleId
     * @returns {Promise<boolean>}
     */
    async moveJoueur(joueurId, fromPouleId, toPouleId) {
        if (fromPouleId === toPouleId) return true;
        const src  = this._cache.poules.find(p => p.id === fromPouleId);
        const dest = this._cache.poules.find(p => p.id === toPouleId);
        if (!src || !dest) return false;
        const idx = src.joueurs.findIndex(j => j.id === joueurId);
        if (idx === -1) return false;
        const [joueur] = src.joueurs.splice(idx, 1);
        dest.joueurs.push(joueur);
        this._persist();
        return true;
    }

    // ─── Import en bloc ───────────────────────────────────────────────────────────

    /**
     * Import complet depuis un fichier XLSX déjà parsé.
     * Remplace intégralement les poules existantes.
     *
     * @param {Array<{nom: string, joueurs: Array}>} poulesData
     *   Tableau de { nom: string, joueurs: [{nom, prenom, genre, classementSimple, classementDouble, classementMixte}] }
     * @returns {Promise<void>}
     */
    async importFromXLSX(poulesData) {
        this._cache.poules = poulesData.map(pd => ({
            id:      this._newId(),
            nom:     pd.nom,
            joueurs: pd.joueurs.map(j => ({
                id:               this._newId(),
                nom:              j.nom,
                prenom:           j.prenom           ?? '',
                genre:            j.genre            ?? 'H',
                classementSimple: j.classementSimple ?? 'NC',
                classementDouble: j.classementDouble ?? 'NC',
                classementMixte:  j.classementMixte  ?? 'NC'
            }))
        }));
        this._persist();
    }

    // ─── Tours ────────────────────────────────────────────────────────────────────

    /**
     * Enregistre la liste des tours.
     * @param {Array} tours
     * @returns {Promise<void>}
     */
    async setTours(tours) {
        this._cache.tours = tours;
        this._persist();
    }

    /**
     * Retourne la liste des tours.
     * @returns {Promise<Array>}
     */
    async getTours() { return [...this._cache.tours]; }

    // ─── Réinitialisation et export ───────────────────────────────────────────────

    /**
     * Remet la base à zéro.
     * @returns {Promise<void>}
     */
    async reset() {
        this._cache.tournoi = this._defaultTournoi();
        this._cache.poules  = [];
        this._cache.tours   = [];
        this._nextId        = 1;
        this._persist();
    }

    /**
     * Exporte l'état complet sous forme d'objet sérialisable.
     * @returns {object}
     */
    exportState() {
        return {
            version: TournoiDB.VERSION,
            tournoi: { ...this._cache.tournoi },
            poules:  JSON.parse(JSON.stringify(this._cache.poules)),
            tours:   JSON.parse(JSON.stringify(this._cache.tours)),
            nextId:  this._nextId,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Importe un état exporté précédemment.
     * @param {object} data
     * @returns {Promise<void>}
     */
    async importState(data) {
        if (!data || data.version !== TournoiDB.VERSION) {
            throw new Error('Format d\'export incompatible (version incorrecte)');
        }
        this._cache.tournoi = data.tournoi ?? this._defaultTournoi();
        this._cache.poules  = data.poules  ?? [];
        this._cache.tours   = data.tours   ?? [];
        this._nextId        = data.nextId  ?? this._computeNextId();
        this._persist();
    }
}

// Export global
window.TournoiDB = TournoiDB;
