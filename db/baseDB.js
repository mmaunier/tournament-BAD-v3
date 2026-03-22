/**
 * baseDB.js — Modèles de données et énumérations pour le tournoi V3
 *
 * Contient :
 *   - Énumérations : Genre, Niveau, ModeComptage, TournoiStatus
 *   - Classe Joueur  : données d'un joueur + stats tournoi
 *   - Classe Match   : une rencontre entre deux équipes sur un terrain
 *   - Classe Tour    : un round complet (matchs + byes + joueurs retirés)
 *   - Classe Tournoi : configuration complète du tournoi
 *
 * Ces classes sont de purs modèles de données (pas de persistance).
 * La persistance est gérée dans TournoiDB.js.
 *
 * Convention des niveaux : niveauSimple / niveauDouble / niveauMixte
 * (correspond aux colonnes XLSX : Sexe | Nom | Prénom | Simple | Double | Mixte)
 */

'use strict';

// ─── Énumérations ──────────────────────────────────────────────────────────────

const Genre = Object.freeze({
    HOMME: 'H',
    FEMME: 'F'
});

const Niveau = Object.freeze({
    NC:  'NC',
    P12: 'P12',
    P11: 'P11',
    P10: 'P10',
    D9:  'D9',
    D8:  'D8',
    D7:  'D7',
    R6:  'R6',
    R5:  'R5',
    R4:  'R4',
    N3:  'N3',
    N2:  'N2',
    N1:  'N1'
});

/** Liste ordonnée du plus faible au plus fort (utile pour le calcul de handicap). */
const NIVEAUX_ORDONNES = Object.values(Niveau);

const ModeComptage = Object.freeze({
    POINTS: 'points',   // Score libre jusqu'à pointsMax
    TEMPS:  'temps',    // Matchs à durée fixe
    AUCUN:  'aucun'     // Sans score (comptage manuel)
});

const TournoiStatus = Object.freeze({
    PREPARATION: 'preparation',
    EN_COURS:    'en_cours',
    TERMINE:     'termine'
});


// ─── Classe Joueur ──────────────────────────────────────────────────────────────

class Joueur {
    /**
     * @param {object} data
     * @param {number|null}  data.id
     * @param {string}       data.nom
     * @param {string}       data.prenom
     * @param {string}       data.genre        - Genre.HOMME | Genre.FEMME
     * @param {string}       data.niveauSimple - valeur de Niveau
     * @param {string}       data.niveauDouble - valeur de Niveau
     * @param {string}       data.niveauMixte  - valeur de Niveau
     * @param {boolean}      data.selected     - participe au tournoi
     * --- Stats (remplies pendant le tournoi) ---
     * @param {number}       data.matchsJoues
     * @param {number}       data.matchsGagnes
     * @param {number}       data.pointsMarques
     * @param {number}       data.pointsEncaisses
     * @param {number}       data.nbByes
     * @param {number[]}     data.partenaires  - IDs des partenaires déjà croisés
     * @param {number[]}     data.adversaires  - IDs des adversaires déjà croisés
     */
    constructor(data = {}) {
        // ── Identité ──
        this.id     = data.id     ?? null;
        this.nom    = data.nom    ?? '';
        this.prenom = data.prenom ?? '';
        this.genre  = data.genre  ?? Genre.HOMME;

        // ── Niveaux (alias : niveauSimple = classementSimple dans l'ancien prototype) ──
        this.niveauSimple = Joueur._normaliserNiveau(data.niveauSimple ?? data.classementSimple);
        this.niveauDouble = Joueur._normaliserNiveau(data.niveauDouble ?? data.classementDouble);
        this.niveauMixte  = Joueur._normaliserNiveau(data.niveauMixte  ?? data.classementMixte);

        // ── Participation ──
        this.selected = data.selected ?? true;
        this.retired  = data.retired  ?? false;

        // ── Stats tournoi ──
        this.matchsJoues     = data.matchsJoues     ?? 0;
        this.matchsGagnes    = data.matchsGagnes    ?? 0;
        this.pointsMarques   = data.pointsMarques   ?? 0;
        this.pointsEncaisses = data.pointsEncaisses ?? 0;
        this.nbByes          = data.nbByes          ?? 0;

        // ── Historique partenaires / adversaires (pour le générateur) ──
        this.partenaires = Array.isArray(data.partenaires) ? [...data.partenaires] : [];
        this.adversaires = Array.isArray(data.adversaires) ? [...data.adversaires] : [];
    }

    // ── Accesseurs ────────────────────────────────────────────────────────────────

    get nomComplet() {
        return this.prenom ? `${this.nom.toUpperCase()} ${this.prenom}` : this.nom.toUpperCase();
    }

    get nomAffichage() {
        return this.prenom ? `${this.nom} ${this.prenom}` : this.nom;
    }

    get pointsDiff() {
        return this.pointsMarques - this.pointsEncaisses;
    }

    /** Indice numérique du niveau double (utilisé pour le calcul de handicap). */
    get indiceNiveauDouble() {
        return NIVEAUX_ORDONNES.indexOf(this.niveauDouble);
    }

    get indiceNiveauSimple() {
        return NIVEAUX_ORDONNES.indexOf(this.niveauSimple);
    }

    // ── Méthodes utilitaires ──────────────────────────────────────────────────────

    /**
     * Indique si ce joueur a déjà joué avec `autreJoueur` comme partenaire.
     * @param {Joueur} autreJoueur
     */
    aDejaJoueAvec(autreJoueur) {
        return this.partenaires.includes(autreJoueur.id);
    }

    /**
     * Indique si ce joueur a déjà affronté `autreJoueur`.
     * @param {Joueur} autreJoueur
     */
    aDejaAffronte(autreJoueur) {
        return this.adversaires.includes(autreJoueur.id);
    }

    /**
     * Enregistre un match joué et met à jour les statistiques.
     * @param {boolean} gagne
     * @param {number}  scoreMarque
     * @param {number}  scoreEncaisse
     * @param {Joueur}  partenaire
     * @param {Joueur[]} adversaires
     */
    enregistrerMatch(gagne, scoreMarque, scoreEncaisse, partenaire, adversaires) {
        this.matchsJoues++;
        if (gagne) this.matchsGagnes++;
        this.pointsMarques   += scoreMarque;
        this.pointsEncaisses += scoreEncaisse;
        if (partenaire && !this.partenaires.includes(partenaire.id)) {
            this.partenaires.push(partenaire.id);
        }
        adversaires.forEach(adv => {
            if (adv && !this.adversaires.includes(adv.id)) {
                this.adversaires.push(adv.id);
            }
        });
    }

    /** Retourne une copie sérialisable (pour localStorage / IndexedDB). */
    toJSON() {
        return {
            id:              this.id,
            nom:             this.nom,
            prenom:          this.prenom,
            genre:           this.genre,
            niveauSimple:    this.niveauSimple,
            niveauDouble:    this.niveauDouble,
            niveauMixte:     this.niveauMixte,
            selected:        this.selected,
            retired:         this.retired,
            matchsJoues:     this.matchsJoues,
            matchsGagnes:    this.matchsGagnes,
            pointsMarques:   this.pointsMarques,
            pointsEncaisses: this.pointsEncaisses,
            nbByes:          this.nbByes,
            partenaires:     [...this.partenaires],
            adversaires:     [...this.adversaires]
        };
    }

    /** Clone profond. */
    clone() { return new Joueur(this.toJSON()); }

    // ── Factories ─────────────────────────────────────────────────────────────────

    /**
     * Construit un Joueur depuis une ligne XLSX.
     * Format attendu : [Sexe, Nom, Prénom, Simple, Double, Mixte]
     * @param {any[]} row
     * @returns {Joueur}
     */
    static fromXLSXRow(row) {
        const genreRaw = String(row[0] || 'H').toUpperCase().trim();
        return new Joueur({
            nom:          String(row[1] || '').trim(),
            prenom:       String(row[2] || '').trim(),
            genre:        genreRaw.charAt(0) === 'F' ? Genre.FEMME : Genre.HOMME,
            niveauSimple: String(row[3] || 'NC').toUpperCase().trim() || Niveau.NC,
            niveauDouble: String(row[4] || 'NC').toUpperCase().trim() || Niveau.NC,
            niveauMixte:  String(row[5] || 'NC').toUpperCase().trim() || Niveau.NC
        });
    }

    /**
     * Reconstruit un Joueur depuis un objet JSON brut (localStorage / IndexedDB).
     * @param {object} json
     * @returns {Joueur}
     */
    static fromJSON(json) { return new Joueur(json); }

    // ── Privé ─────────────────────────────────────────────────────────────────────

    static _normaliserNiveau(valeur) {
        if (!valeur) return Niveau.NC;
        const v = String(valeur).toUpperCase().trim();
        return Object.values(Niveau).includes(v) ? v : Niveau.NC;
    }
}


// ─── Classe Match ───────────────────────────────────────────────────────────────

class Match {
    /**
     * @param {object}   data
     * @param {Joueur[]} data.equipe1   - Les deux joueurs de l'équipe 1
     * @param {Joueur[]} data.equipe2   - Les deux joueurs de l'équipe 2
     * @param {number}   data.score1
     * @param {number}   data.score2
     * @param {number}   data.terrain  - Numéro du terrain
     */
    constructor(data = {}) {
        this.equipe1  = data.equipe1  ?? [];
        this.equipe2  = data.equipe2  ?? [];
        this.score1   = data.score1   ?? 0;
        this.score2   = data.score2   ?? 0;
        this.terrain  = data.terrain  ?? null;
    }

    // ── Accesseurs ────────────────────────────────────────────────────────────────

    /**
     * Un match est une égalité si la différence de score est ≤ 2.
     * (Cohérent avec la logique de classement V2.)
     */
    get isEgalite() { return Math.abs(this.score1 - this.score2) <= 2; }

    get equipe1Gagne() { return !this.isEgalite && this.score1 > this.score2; }
    get equipe2Gagne() { return !this.isEgalite && this.score2 > this.score1; }

    get gagnants()  { return this.equipe1Gagne ? this.equipe1 : (this.equipe2Gagne ? this.equipe2 : []); }
    get perdants()  { return this.equipe1Gagne ? this.equipe2 : (this.equipe2Gagne ? this.equipe1 : []); }
    get tousJoueurs() { return [...this.equipe1, ...this.equipe2]; }

    /**
     * Points de classement attribués selon la règle V2 : Victoire=3, Égalité=2, Défaite=1
     */
    get pointsEquipe1() {
        if (this.isEgalite)     return 2;
        if (this.equipe1Gagne)  return 3;
        return 1;
    }
    get pointsEquipe2() {
        if (this.isEgalite)     return 2;
        if (this.equipe2Gagne)  return 3;
        return 1;
    }

    toJSON() {
        return {
            equipe1: this.equipe1.map(j => (j instanceof Joueur ? j.toJSON() : j)),
            equipe2: this.equipe2.map(j => (j instanceof Joueur ? j.toJSON() : j)),
            score1:  this.score1,
            score2:  this.score2,
            terrain: this.terrain
        };
    }

    static fromJSON(json) { return new Match(json); }
}


// ─── Classe Tour ────────────────────────────────────────────────────────────────

class Tour {
    /**
     * @param {object}   data
     * @param {number}   data.id
     * @param {number}   data.numero
     * @param {Match[]}  data.matchs
     * @param {Joueur[]} data.byes            - Joueurs exemptés ce tour
     * @param {Joueur[]} data.joueursRetires  - Joueurs retirés du tournoi depuis ce tour
     * @param {boolean}  data.valide
     * @param {string}   data.status          - 'en_attente' | 'actif' | 'termine'
     */
    constructor(data = {}) {
        this.id              = data.id              ?? null;
        this.numero          = data.numero          ?? 1;
        this.matchs          = (data.matchs ?? []).map(m => m instanceof Match ? m : new Match(m));
        this.byes            = data.byes            ?? [];
        this.joueursRetires  = data.joueursRetires  ?? [];
        this.valide          = data.valide          ?? false;
        this.status          = data.status          ?? 'en_attente';
    }

    // ── Accesseurs ────────────────────────────────────────────────────────────────

    get nbMatchs()       { return this.matchs.length; }
    get nbByes()         { return this.byes.length; }
    get estTermine()     { return this.valide || this.status === 'termine'; }
    get tousJoueurs() {
        const joueurs = [];
        this.matchs.forEach(m => joueurs.push(...m.tousJoueurs));
        joueurs.push(...this.byes);
        return joueurs;
    }

    toJSON() {
        return {
            id:             this.id,
            numero:         this.numero,
            matchs:         this.matchs.map(m => m.toJSON()),
            byes:           this.byes.map(j => (j instanceof Joueur ? j.toJSON() : j)),
            joueursRetires: this.joueursRetires.map(j => (j instanceof Joueur ? j.toJSON() : j)),
            valide:         this.valide,
            status:         this.status
        };
    }

    static fromJSON(json) { return new Tour(json); }
}


// ─── Classe Tournoi ─────────────────────────────────────────────────────────────

class Tournoi {
    /**
     * @param {object}  data
     * @param {string}  data.id
     * @param {string}  data.nom
     * @param {number}  data.phase
     * @param {string}  data.status             - TournoiStatus
     * @param {number}  data.nbTours
     * @param {number}  data.nbTerrains
     * @param {number}  data.premierTerrain     - Numéro du 1er terrain (ex: 1 ou 3)
     * @param {string}  data.modeComptage       - ModeComptage
     * @param {number}  data.pointsMax          - Nombre de points pour gagner (mode POINTS)
     * @param {number}  data.tempsMatch         - Durée en minutes (mode TEMPS)
     * @param {boolean} data.prendreEnCompteHandicaps
     * @param {object}  data.handicapParams     - Paramètres détaillés du handicap
     * @param {number}  data.tourActuel         - Index du tour en cours (-1 = avant le début)
     * @param {string}  data.dateCreation       - ISO string
     * @param {string}  data.dateFin            - ISO string
     * @param {Joueur[]} data.joueurs           - Joueurs actifs du tournoi
     * @param {Joueur[]} data.joueursRetires    - Joueurs retirés en cours de tournoi
     */
    constructor(data = {}) {
        this.id            = data.id            ?? 'current';
        this.nom           = data.nom           ?? 'Mon Tournoi';
        this.phase         = data.phase         ?? 1;
        this.status        = data.status        ?? TournoiStatus.PREPARATION;

        // ── Configuration ──
        this.nbTours           = data.nbTours           ?? 10;
        this.nbTerrains        = data.nbTerrains        ?? 7;
        this.premierTerrain    = data.premierTerrain    ?? 1;
        this.modeComptage      = data.modeComptage      ?? ModeComptage.POINTS;
        this.pointsMax         = data.pointsMax         ?? 21;
        this.tempsMatch        = data.tempsMatch        ?? 15;

        // ── Handicap ──
        this.prendreEnCompteHandicaps = data.prendreEnCompteHandicaps ?? false;
        this.handicaps                = data.handicaps                ?? false; // alias
        this.handicapParams           = data.handicapParams           ?? null;

        // ── État ──
        this.tourActuel      = data.tourActuel      ?? -1;
        this.dateCreation    = data.dateCreation    ?? new Date().toISOString();
        this.dateFin         = data.dateFin         ?? null;

        // ── Joueurs ──
        this.joueurs         = (data.joueurs ?? []).map(j => j instanceof Joueur ? j : new Joueur(j));
        this.joueursRetires  = (data.joueursRetires ?? []).map(j => j instanceof Joueur ? j : new Joueur(j));
    }

    // ── Accesseurs ────────────────────────────────────────────────────────────────

    get isPreparation() { return this.status === TournoiStatus.PREPARATION; }
    get isEnCours()     { return this.status === TournoiStatus.EN_COURS; }
    get isTermine()     { return this.status === TournoiStatus.TERMINE; }

    get nbJoueurs()       { return this.joueurs.length; }
    get nbJoueursActifs() { return this.joueurs.filter(j => !j.retired).length; }

    get joueursActifs()   { return this.joueurs.filter(j => !j.retired); }
    get joueursSelectionnes() { return this.joueurs.filter(j => j.selected && !j.retired); }

    get retiresIds() { return new Set(this.joueursRetires.map(j => j.id)); }

    /** Retourne le joueur actif par son id, ou null. */
    getJoueur(id) { return this.joueurs.find(j => j.id === id) ?? null; }

    // ── Méthodes ──────────────────────────────────────────────────────────────────

    /**
     * Passe le statut à EN_COURS.
     * @param {object} configOverride - Paramètres optionnels à appliquer avant de lancer
     */
    lancer(configOverride = {}) {
        Object.assign(this, configOverride);
        this.status     = TournoiStatus.EN_COURS;
        this.tourActuel = 0;
    }

    /** Marque le tournoi comme terminé. */
    terminer() {
        this.status  = TournoiStatus.TERMINE;
        this.dateFin = new Date().toISOString();
    }

    /**
     * Retire des joueurs depuis un tour donné.
     * Met à jour `joueurs` et `joueursRetires`.
     * @param {number[]} joueursIds
     * @param {number}   depuisTour - Index du tour (0-based)
     */
    retirerJoueurs(joueursIds, depuisTour) {
        const idsSet = new Set(joueursIds);
        const retiresExistantsIds = this.retiresIds;

        // Ne retirer que les joueurs vraiment actifs
        const aRetirer = this.joueurs.filter(j => idsSet.has(j.id) && !retiresExistantsIds.has(j.id));
        if (!aRetirer.length) return [];

        aRetirer.forEach(j => {
            j.retired       = true;
            j.retireDuTour  = depuisTour;
            this.joueursRetires.push(j);
        });

        this.joueurs = this.joueurs.filter(j => !idsSet.has(j.id) || retiresExistantsIds.has(j.id));
        return aRetirer;
    }

    toJSON() {
        return {
            id:                       this.id,
            nom:                      this.nom,
            phase:                    this.phase,
            status:                   this.status,
            nbTours:                  this.nbTours,
            nbTerrains:               this.nbTerrains,
            premierTerrain:           this.premierTerrain,
            modeComptage:             this.modeComptage,
            pointsMax:                this.pointsMax,
            tempsMatch:               this.tempsMatch,
            prendreEnCompteHandicaps: this.prendreEnCompteHandicaps,
            handicaps:                this.handicaps,
            handicapParams:           this.handicapParams,
            tourActuel:               this.tourActuel,
            dateCreation:             this.dateCreation,
            dateFin:                  this.dateFin,
            joueurs:                  this.joueurs.map(j => j.toJSON()),
            joueursRetires:           this.joueursRetires.map(j => j.toJSON())
        };
    }

    clone() { return new Tournoi(this.toJSON()); }

    static fromJSON(json) { return new Tournoi(json); }
}


// ─── Exports globaux ───────────────────────────────────────────────────────────
window.Genre             = Genre;
window.Niveau            = Niveau;
window.NIVEAUX_ORDONNES  = NIVEAUX_ORDONNES;
window.ModeComptage      = ModeComptage;
window.TournoiStatus     = TournoiStatus;
window.Joueur            = Joueur;
window.Match             = Match;
window.Tour              = Tour;
window.Tournoi           = Tournoi;
