/**
 * GenerateurTournoiV3.js — Moteur complet de génération de rotations pour le tournoi V3
 *
 * Ce fichier est AUTONOME : il contient le moteur de génération (GenerateurDynamique)
 * + la couche de conversion indices → objets joueurs (GenerateurTournoiV3).
 *
 * Le moteur GenerateurDynamique est copié TEL QUEL depuis js/utils/GenerateurDynamique.js.
 * Il n'est PAS modifié : toute la logique éprouvée (byes, paires, matchs) est conservée.
 *
 * Architecture :
 *   GenerateurDynamique        — moteur pur (indices 0..N-1)
 *     └─ GenerateurTournoiV3   — accepte des objets joueurs, convertit en indices,
 *                                 génère via GenerateurDynamique, puis reconvertit
 *                                 les résultats en objets joueurs lisibles.
 *
 * Usage :
 *   const gen = GenerateurTournoiV3.fromPoule(poule);
 *   gen.afficherResume();       // noms des joueurs
 *   gen.afficherResumeIndices(); // indices bruts (debug)
 *
 * @author Mikaël MAUNIER && Assistant IA
 * @version 3.0
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// MOTEUR DE GÉNÉRATION — GenerateurDynamique (inchangé)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Générateur Dynamique de Tournoi de Badminton en Double
 * 
 * Approche en 3 phases par tour :
 * 1. Sélection des BYES (joueurs qui ne jouent pas)
 * 2. Formation des PAIRES (coéquipiers - jamais 2 fois ensemble)
 * 3. Formation des MATCHS (adversaires - max 2-3 fois contre)
 *
 * @version 2.0
 */
class GenerateurDynamique {
   /**
    * @param {number} nbJoueurs - Nombre total de joueurs
    * @param {number} nbTerrains - Nombre de terrains disponibles
    * @param {number} nbTours - Nombre de tours à générer (null = max possible)
    */
   constructor(nbJoueurs, nbTerrains, nbTours = null) {
      this.nbJoueurs = nbJoueurs;
      this.nbTerrains = nbTerrains;
      
      // Calcul du nombre max de joueurs par tour (4 par terrain)
      this.joueursParTour = Math.min(4 * nbTerrains, Math.floor(nbJoueurs / 4) * 4);
      this.byesParTour = nbJoueurs - this.joueursParTour;
      
      // Nombre max de tours = N-1 (chaque joueur peut avoir N-1 partenaires différents)
      this.nbToursMax = nbJoueurs - 1;
      this.nbTours = nbTours === null ? this.nbToursMax : Math.min(nbTours, this.nbToursMax);
      
      // Matrices de suivi des contraintes
      this.partenaireCount = this.creerMatrice(nbJoueurs); // Combien de fois i a joué avec j
      this.adversaireCount = this.creerMatrice(nbJoueurs); // Combien de fois i a joué contre j
      
      // Suivi des byes
      this.byeCount = new Array(nbJoueurs).fill(0);        // Nombre de byes par joueur
      this.dernierBye = new Array(nbJoueurs).fill(-999);   // Dernier tour où le joueur était en bye
      
      // Suivi des joueurs retirés (persistant entre les appels)
      this.joueursRetiresDefinitivement = new Set();       // Joueurs qui ont quitté le tournoi
      
      // Résultats
      this.tours = [];      // Liste des tours générés
      this.byes = [];       // Liste des byes par tour
      this.stats = null;    // Statistiques finales
      
      // Générer le tournoi
      this.generer();
   }

   /**
    * Crée une matrice NxN initialisée à 0
    */
   creerMatrice(n) {
      return Array.from({ length: n }, () => new Array(n).fill(0));
   }

   /**
    * Génère tous les tours du tournoi
    */
   generer() {
      console.log(`Génération: ${this.nbJoueurs} joueurs, ${this.nbTerrains} terrains, ${this.nbTours} tours`);
      console.log(`Joueurs par tour: ${this.joueursParTour}, Byes par tour: ${this.byesParTour}`);
      
      for (let t = 0; t < this.nbTours; t++) {
         const tour = this.genererTour(t);
         if (tour === null) {
            console.warn(`Impossible de générer le tour ${t + 1}, arrêt.`);
            break;
         }
         this.tours.push(tour.matchs);
         this.byes.push(tour.byes);
      }
      
      this.calculerStats();
      console.log('Génération terminée:', this.stats);
   }

   /**
    * Génère un tour complet
    * @param {number} numTour - Numéro du tour (0-indexed)
    * @returns {Object} - { matchs: [[paire1, paire2], ...], byes: [joueurs] }
    */
   genererTour(numTour) {
      // Phase 1: Sélectionner les byes
      const byes = this.selectionnerByes(numTour);
      const joueursActifs = this.getJoueursActifs(byes);
      
      // Phase 2: Former les paires (coéquipiers)
      const paires = this.formerPaires(joueursActifs);
      if (paires === null) {
         return null; // Impossible de former des paires valides
      }
      
      // Phase 3: Former les matchs (2 paires par terrain)
      const matchs = this.formerMatchs(paires);
      
      // Mettre à jour les matrices de contraintes
      this.mettreAJourContraintes(matchs, byes, numTour);
      
      return { matchs, byes };
   }

   /**
    * Phase 1: Sélectionner les joueurs qui ne jouent pas ce tour
    * Critères: équité du nombre de byes + espacement maximal + éviter byes consécutifs
    */
   selectionnerByes(numTour) {
      if (this.byesParTour === 0) {
         return [];
      }
      
      // Calculer un score pour chaque joueur (plus le score est bas, plus il doit sortir)
      const scores = [];
      for (let j = 0; j < this.nbJoueurs; j++) {
         const distanceDepuisDernierBye = numTour - this.dernierBye[j];
         
         // Score de base : équité du nombre de byes
         let score = this.byeCount[j] * 1000;
         
         // Pénalité très forte pour éviter les byes consécutifs ou trop rapprochés
         if (distanceDepuisDernierBye === 1) {
            score += 100000; // Bye au tour précédent = éviter fortement
         } else if (distanceDepuisDernierBye === 2) {
            score += 10000;  // Bye il y a 2 tours = éviter si possible
         }
         
         // Bonus pour la distance (favorise ceux qui n'ont pas eu de bye récemment)
         score -= distanceDepuisDernierBye;
         
         scores.push({ joueur: j, score, byeCount: this.byeCount[j], distance: distanceDepuisDernierBye });
      }
      
      // Trier par score croissant (les plus bas scores sortent en premier)
      scores.sort((a, b) => a.score - b.score);
      
      // Sélectionner les byesParTour joueurs avec les scores les plus bas
      const byes = scores.slice(0, this.byesParTour).map(s => s.joueur);
      
      return byes;
   }

   /**
    * Retourne les joueurs qui jouent (pas en bye)
    */
   getJoueursActifs(byes) {
      const byeSet = new Set(byes);
      return Array.from({ length: this.nbJoueurs }, (_, i) => i).filter(j => !byeSet.has(j));
   }

   /**
    * Phase 2: Former des paires de coéquipiers
    * Contrainte: jamais 2 fois avec le même partenaire
    * Utilise un matching glouton sur le graphe des partenaires disponibles
    */
   formerPaires(joueursActifs) {
      const n = joueursActifs.length;
      if (n % 2 !== 0) {
         console.error('Nombre impair de joueurs actifs:', n);
         return null;
      }
      
      const disponibles = new Set(joueursActifs);
      const paires = [];
      
      // Algorithme glouton avec heuristique MRV (Minimum Remaining Values)
      while (disponibles.size > 0) {
         let meilleurJoueur = null;
         let minPartenaires = Infinity;
         
         for (const j of disponibles) {
            let count = 0;
            for (const k of disponibles) {
               if (k !== j && this.partenaireCount[j][k] === 0) {
                  count++;
               }
            }
            if (count < minPartenaires) {
               minPartenaires = count;
               meilleurJoueur = j;
            }
         }
         
         if (meilleurJoueur === null || minPartenaires === 0) {
            return this.formerPairesAvecRelaxation(joueursActifs);
         }
         
         let meilleurPartenaire = null;
         let minChoixPartenaire = Infinity;
         
         for (const k of disponibles) {
            if (k !== meilleurJoueur && this.partenaireCount[meilleurJoueur][k] === 0) {
               let choix = 0;
               for (const m of disponibles) {
                  if (m !== k && m !== meilleurJoueur && this.partenaireCount[k][m] === 0) {
                     choix++;
                  }
               }
               if (choix < minChoixPartenaire) {
                  minChoixPartenaire = choix;
                  meilleurPartenaire = k;
               }
            }
         }
         
         if (meilleurPartenaire === null) {
            return this.formerPairesAvecRelaxation(joueursActifs);
         }
         
         paires.push([meilleurJoueur, meilleurPartenaire]);
         disponibles.delete(meilleurJoueur);
         disponibles.delete(meilleurPartenaire);
      }
      
      return paires;
   }

   /**
    * Formation de paires avec relaxation de contrainte si nécessaire
    */
   formerPairesAvecRelaxation(joueursActifs) {
      console.log('Relaxation des contraintes de partenaires nécessaire');
      
      const n = joueursActifs.length;
      const disponibles = new Set(joueursActifs);
      const paires = [];
      
      while (disponibles.size > 0) {
         const joueur = disponibles.values().next().value;
         disponibles.delete(joueur);
         
         let meilleurPartenaire = null;
         let minFois = Infinity;
         
         for (const k of disponibles) {
            if (this.partenaireCount[joueur][k] < minFois) {
               minFois = this.partenaireCount[joueur][k];
               meilleurPartenaire = k;
            }
         }
         
         if (meilleurPartenaire === null) {
            console.error('Impossible de trouver un partenaire pour', joueur);
            return null;
         }
         
         paires.push([joueur, meilleurPartenaire]);
         disponibles.delete(meilleurPartenaire);
      }
      
      return paires;
   }

   /**
    * Phase 3: Former des matchs (grouper 2 paires par terrain)
    */
   formerMatchs(paires) {
      const n = paires.length;
      if (n % 2 !== 0) {
         console.error('Nombre impair de paires:', n);
         return null;
      }
      
      const disponibles = new Set(paires.map((_, i) => i));
      const matchs = [];
      
      while (disponibles.size > 0) {
         const idx1 = disponibles.values().next().value;
         disponibles.delete(idx1);
         const paire1 = paires[idx1];
         
         let meilleurIdx = null;
         let minScore = Infinity;
         
         for (const idx2 of disponibles) {
            const paire2 = paires[idx2];
            const score = this.calculerScoreAdversaires(paire1, paire2);
            if (score < minScore) {
               minScore = score;
               meilleurIdx = idx2;
            }
         }
         
         if (meilleurIdx === null) {
            console.error('Impossible de trouver un adversaire pour la paire', paire1);
            return null;
         }
         
         const paire2 = paires[meilleurIdx];
         disponibles.delete(meilleurIdx);
         
         matchs.push([paire1, paire2]);
      }
      
      return matchs;
   }

   /**
    * Calcule un score pour un match entre deux paires
    */
   calculerScoreAdversaires(paire1, paire2) {
      let score = 0;
      for (const j1 of paire1) {
         for (const j2 of paire2) {
            const count = this.adversaireCount[j1][j2];
            if (count >= 3) {
               score += 10000;
            } else if (count >= 2) {
               score += 100;
            } else if (count >= 1) {
               score += 10;
            }
         }
      }
      return score;
   }

   /**
    * Met à jour les matrices de contraintes après un tour
    */
   mettreAJourContraintes(matchs, byes, numTour) {
      for (const match of matchs) {
         const [paire1, paire2] = match;
         
         this.partenaireCount[paire1[0]][paire1[1]]++;
         this.partenaireCount[paire1[1]][paire1[0]]++;
         this.partenaireCount[paire2[0]][paire2[1]]++;
         this.partenaireCount[paire2[1]][paire2[0]]++;
         
         for (const j1 of paire1) {
            for (const j2 of paire2) {
               this.adversaireCount[j1][j2]++;
               this.adversaireCount[j2][j1]++;
            }
         }
      }
      
      for (const j of byes) {
         this.byeCount[j]++;
         this.dernierBye[j] = numTour;
      }
   }

   /**
    * Calcule les statistiques finales
    */
   calculerStats() {
      const byeMin = Math.min(...this.byeCount);
      const byeMax = Math.max(...this.byeCount);
      
      let maxPartenaire = 0;
      let partenaireViolations = 0;
      for (let i = 0; i < this.nbJoueurs; i++) {
         for (let j = i + 1; j < this.nbJoueurs; j++) {
            if (this.partenaireCount[i][j] > maxPartenaire) {
               maxPartenaire = this.partenaireCount[i][j];
            }
            if (this.partenaireCount[i][j] > 1) {
               partenaireViolations++;
            }
         }
      }
      
      let maxAdversaire = 0;
      let adversaireViolations = 0;
      for (let i = 0; i < this.nbJoueurs; i++) {
         for (let j = i + 1; j < this.nbJoueurs; j++) {
            if (this.adversaireCount[i][j] > maxAdversaire) {
               maxAdversaire = this.adversaireCount[i][j];
            }
            if (this.adversaireCount[i][j] > 2) {
               adversaireViolations++;
            }
         }
      }
      
      let espacementMin = Infinity;
      let byesConsecutifs = 0;
      for (let t = 1; t < this.byes.length; t++) {
         const byesPrecedents = new Set(this.byes[t - 1]);
         for (const j of this.byes[t]) {
            if (byesPrecedents.has(j)) {
               byesConsecutifs++;
            }
         }
      }
      
      this.stats = {
         toursGeneres: this.tours.length,
         byeMin,
         byeMax,
         ecartBye: byeMax - byeMin,
         byesConsecutifs,
         maxPartenaire,
         partenaireViolations,
         maxAdversaire,
         adversaireViolations
      };
   }

   getStatistiques() {
      return this.stats;
   }

   estValide() {
      if (!this.stats) return false;
      return this.stats.ecartBye <= 1 && 
             this.stats.maxPartenaire <= 1 && 
             this.stats.maxAdversaire <= 3;
   }

   // ============================================================
   // RÉGÉNÉRATION DYNAMIQUE (retrait de joueurs en cours de tournoi)
   // ============================================================

   regenererDepuis(depuisTour, joueursRetires, nouveauNbTours = null) {
      console.log(`=== RÉGÉNÉRATION depuis tour ${depuisTour + 1} ===`);
      console.log(`Joueurs retirés: [${joueursRetires.join(', ')}]`);
      
      if (depuisTour < 0 || depuisTour >= this.tours.length) {
         return { succes: false, message: `Tour ${depuisTour + 1} invalide (1-${this.tours.length})` };
      }
      
      const toursPasses = this.tours.slice(0, depuisTour);
      const byesPasses = this.byes.slice(0, depuisTour);
      
      for (const j of joueursRetires) {
         this.joueursRetiresDefinitivement.add(j);
      }
      console.log(`Joueurs retirés (total): [${[...this.joueursRetiresDefinitivement].join(', ')}]`);
      
      const joueursRestants = [];
      for (let i = 0; i < this.nbJoueurs; i++) {
         if (!this.joueursRetiresDefinitivement.has(i)) {
            joueursRestants.push(i);
         }
      }
      
      const nbJoueursRestants = joueursRestants.length;
      console.log(`Joueurs restants: ${nbJoueursRestants} sur ${this.nbJoueurs}`);
      
      if (nbJoueursRestants < 4) {
         return { succes: false, message: `Pas assez de joueurs restants (${nbJoueursRestants} < 4)` };
      }
      
      this.joueursParTour = Math.min(4 * this.nbTerrains, Math.floor(nbJoueursRestants / 4) * 4);
      this.byesParTour = nbJoueursRestants - this.joueursParTour;
      
      if (nouveauNbTours !== null) {
         this.nbTours = nouveauNbTours;
      }
      
      this.tours = toursPasses;
      this.byes = byesPasses;
      
      this.reconstruireMatricesDepuisHistorique();
      
      console.log(`Historique conservé: ${toursPasses.length} tours`);
      
      const toursAGenerer = this.nbTours - depuisTour;
      console.log(`Tours à générer: ${toursAGenerer}`);
      
      for (let t = depuisTour; t < this.nbTours; t++) {
         const tour = this.genererTourSansRetires(t, joueursRestants);
         if (tour === null) {
            console.warn(`Impossible de régénérer le tour ${t + 1}, arrêt.`);
            break;
         }
         this.tours.push(tour.matchs);
         this.byes.push(tour.byes);
      }
      
      this.calculerStats();
      
      return {
         succes: true,
         message: `${this.tours.length - depuisTour} tours régénérés avec ${nbJoueursRestants} joueurs`,
         stats: this.stats,
         joueursRestants: joueursRestants,
         joueursRetires: [...this.joueursRetiresDefinitivement]
      };
   }

   getJoueursActifsTournoi() {
      const actifs = [];
      for (let i = 0; i < this.nbJoueurs; i++) {
         if (!this.joueursRetiresDefinitivement.has(i)) {
            actifs.push(i);
         }
      }
      return actifs;
   }

   getJoueursRetires() {
      return [...this.joueursRetiresDefinitivement];
   }

   reintegrerJoueur(joueur) {
      if (this.joueursRetiresDefinitivement.has(joueur)) {
         this.joueursRetiresDefinitivement.delete(joueur);
         console.log(`Joueur ${joueur} réintégré (nécessite régénération)`);
         return true;
      }
      return false;
   }

   genererTourSansRetires(numTour, joueursDisponibles) {
      const byes = this.selectionnerByesPourJoueurs(numTour, joueursDisponibles);
      
      const byeSet = new Set(byes);
      const joueursActifs = joueursDisponibles.filter(j => !byeSet.has(j));
      
      const paires = this.formerPairesPourJoueurs(joueursActifs);
      if (paires === null) {
         return null;
      }
      
      const matchs = this.formerMatchs(paires);
      
      this.mettreAJourContraintes(matchs, byes, numTour);
      
      return { matchs, byes };
   }

   selectionnerByesPourJoueurs(numTour, joueurs) {
      if (this.byesParTour === 0) {
         return [];
      }
      
      const scores = [];
      for (const j of joueurs) {
         const distanceDepuisDernierBye = numTour - this.dernierBye[j];
         
         let score = this.byeCount[j] * 1000;
         
         if (distanceDepuisDernierBye === 1) {
            score += 100000;
         } else if (distanceDepuisDernierBye === 2) {
            score += 10000;
         }
         
         score -= distanceDepuisDernierBye;
         
         scores.push({ joueur: j, score });
      }
      
      scores.sort((a, b) => a.score - b.score);
      return scores.slice(0, this.byesParTour).map(s => s.joueur);
   }

   formerPairesPourJoueurs(joueursActifs) {
      const n = joueursActifs.length;
      if (n % 2 !== 0 || n === 0) {
         console.error('Nombre invalide de joueurs actifs:', n);
         return null;
      }
      
      const disponibles = new Set(joueursActifs);
      const paires = [];
      
      while (disponibles.size > 0) {
         let meilleurJoueur = null;
         let minPartenaires = Infinity;
         
         for (const j of disponibles) {
            let count = 0;
            for (const k of disponibles) {
               if (k !== j && this.partenaireCount[j][k] === 0) {
                  count++;
               }
            }
            if (count < minPartenaires) {
               minPartenaires = count;
               meilleurJoueur = j;
            }
         }
         
         if (meilleurJoueur === null) {
            return null;
         }
         
         if (minPartenaires === 0) {
            let meilleurPartenaire = null;
            let minJoue = Infinity;
            for (const k of disponibles) {
               if (k !== meilleurJoueur && this.partenaireCount[meilleurJoueur][k] < minJoue) {
                  minJoue = this.partenaireCount[meilleurJoueur][k];
                  meilleurPartenaire = k;
               }
            }
            if (meilleurPartenaire !== null) {
               paires.push([meilleurJoueur, meilleurPartenaire]);
               disponibles.delete(meilleurJoueur);
               disponibles.delete(meilleurPartenaire);
               continue;
            }
            return null;
         }
         
         let meilleurPartenaire = null;
         let minChoix = Infinity;
         
         for (const k of disponibles) {
            if (k !== meilleurJoueur && this.partenaireCount[meilleurJoueur][k] === 0) {
               let choix = 0;
               for (const m of disponibles) {
                  if (m !== k && m !== meilleurJoueur && this.partenaireCount[k][m] === 0) {
                     choix++;
                  }
               }
               if (choix < minChoix) {
                  minChoix = choix;
                  meilleurPartenaire = k;
               }
            }
         }
         
         if (meilleurPartenaire === null) {
            return null;
         }
         
         paires.push([meilleurJoueur, meilleurPartenaire]);
         disponibles.delete(meilleurJoueur);
         disponibles.delete(meilleurPartenaire);
      }
      
      return paires;
   }

   reconstruireMatricesDepuisHistorique() {
      this.partenaireCount = this.creerMatrice(this.nbJoueurs);
      this.adversaireCount = this.creerMatrice(this.nbJoueurs);
      this.byeCount = new Array(this.nbJoueurs).fill(0);
      this.dernierBye = new Array(this.nbJoueurs).fill(-999);
      
      for (let t = 0; t < this.tours.length; t++) {
         const matchs = this.tours[t];
         const byes = this.byes[t];
         
         for (const match of matchs) {
            const [paire1, paire2] = match;
            const [j1, j2] = paire1;
            const [j3, j4] = paire2;
            
            this.partenaireCount[j1][j2]++;
            this.partenaireCount[j2][j1]++;
            this.partenaireCount[j3][j4]++;
            this.partenaireCount[j4][j3]++;
            
            for (const ja of paire1) {
               for (const jb of paire2) {
                  this.adversaireCount[ja][jb]++;
                  this.adversaireCount[jb][ja]++;
               }
            }
         }
         
         for (const j of byes) {
            this.byeCount[j]++;
            this.dernierBye[j] = t;
         }
      }
   }

   exporterEtat() {
      return {
         nbJoueurs: this.nbJoueurs,
         nbTerrains: this.nbTerrains,
         nbTours: this.nbTours,
         tours: JSON.parse(JSON.stringify(this.tours)),
         byes: JSON.parse(JSON.stringify(this.byes)),
         partenaireCount: JSON.parse(JSON.stringify(this.partenaireCount)),
         adversaireCount: JSON.parse(JSON.stringify(this.adversaireCount)),
         byeCount: [...this.byeCount],
         dernierBye: [...this.dernierBye]
      };
   }

   importerEtat(etat) {
      this.nbJoueurs = etat.nbJoueurs;
      this.nbTerrains = etat.nbTerrains;
      this.nbTours = etat.nbTours;
      this.tours = etat.tours;
      this.byes = etat.byes;
      this.partenaireCount = etat.partenaireCount;
      this.adversaireCount = etat.adversaireCount;
      this.byeCount = etat.byeCount;
      this.dernierBye = etat.dernierBye;
      
      this.joueursParTour = Math.min(4 * this.nbTerrains, Math.floor(this.nbJoueurs / 4) * 4);
      this.byesParTour = this.nbJoueurs - this.joueursParTour;
      
      this.calculerStats();
   }

   versFormatLegacy() {
      const liste = this.tours.map(tour => {
         const paires = [];
         for (const match of tour) {
            paires.push(match[0]);
            paires.push(match[1]);
         }
         return paires;
      });
      
      return {
         liste,
         byes: this.byes,
         stats: this.stats
      };
   }

   afficherResume() {
      console.log('='.repeat(60));
      console.log('RÉSUMÉ DU TOURNOI');
      console.log('='.repeat(60));
      console.log(`Joueurs: ${this.nbJoueurs}, Terrains: ${this.nbTerrains}, Tours: ${this.tours.length}`);
      console.log('-'.repeat(60));
      
      for (let t = 0; t < this.tours.length; t++) {
         console.log(`Tour ${t + 1}:`);
         console.log(`  Matchs: ${this.tours[t].map(m => `[${m[0].join('-')} vs ${m[1].join('-')}]`).join(', ')}`);
         if (this.byes[t].length > 0) {
            console.log(`  Byes: [${this.byes[t].join(', ')}]`);
         }
      }
      
      console.log('-'.repeat(60));
      console.log('STATISTIQUES:');
      console.log(`  Byes: min=${this.stats.byeMin}, max=${this.stats.byeMax}, écart=${this.stats.ecartBye}`);
      console.log(`  Byes consécutifs: ${this.stats.byesConsecutifs}`);
      console.log(`  Max partenaire répété: ${this.stats.maxPartenaire} (violations: ${this.stats.partenaireViolations})`);
      console.log(`  Max adversaire répété: ${this.stats.maxAdversaire} (violations: ${this.stats.adversaireViolations})`);
      console.log(`  Solution valide: ${this.estValide() ? 'OUI ✓' : 'NON ✗'}`);
      console.log('='.repeat(60));
   }
}


// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR TOURNOI V3 — Couche objets joueurs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GenerateurTournoiV3 — Génère les rotations d'une poule
 *
 * Accepte des objets joueurs (format DB V3 : { nom, prenom, genre, ... })
 * et délègue au moteur GenerateurDynamique (indices 0…N-1) puis reconvertit
 * les résultats en objets joueurs.
 */
class GenerateurTournoiV3 {
    /**
     * @param {object}   config
     * @param {Array}    config.joueurs        - Objets joueurs
     * @param {number}   config.nbTours        - Nombre de tours (défaut : 10)
     * @param {number}   config.nbTerrains     - Nombre de terrains (défaut : 7)
     * @param {number}   config.premierTerrain - Numéro du premier terrain (défaut : 1)
     */
    constructor(config) {
        this.joueurs        = config.joueurs        || [];
        this.nbTours        = config.nbTours        || 10;
        this.nbTerrains     = config.nbTerrains     || 7;
        this.premierTerrain = config.premierTerrain || 1;

        /** @type {GenerateurDynamique|null} Moteur interne */
        this._gen = null;

        /**
         * Tours générés avec objets joueurs.
         * @type {Array<{ numero: number, matchs: Array<{ terrain: number, equipe1: object[], equipe2: object[] }>, byes: object[] }>}
         */
        this.tours = [];

        /** Statistiques issues du moteur */
        this.stats = null;

        if (this.joueurs.length >= 4) {
            this._generer();
        } else {
            console.warn(`GenerateurTournoiV3: pas assez de joueurs (${this.joueurs.length} < 4)`);
        }
    }

    // ─── Factory ──────────────────────────────────────────────────────────────────

    /**
     * Construit un générateur depuis un objet poule (format AccueilPage / TournoiDB).
     * @param {object} poule - { joueurs: [...], config: { nbTours, nbTerrains, premierTerrain } }
     * @returns {GenerateurTournoiV3}
     */
    static fromPoule(poule) {
        const cfg = poule.config || {};
        return new GenerateurTournoiV3({
            joueurs:        poule.joueurs,
            nbTours:        cfg.nbTours        || 10,
            nbTerrains:     cfg.nbTerrains     || 7,
            premierTerrain: cfg.premierTerrain || 1
        });
    }

    // ─── Génération ───────────────────────────────────────────────────────────────

    _generer() {
        // Instancie le moteur avec des indices 0..N-1
        this._gen = new GenerateurDynamique(
            this.joueurs.length,
            this.nbTerrains,
            this.nbTours
        );

        this.stats = this._gen.stats;

        // Conversion indices → objets joueurs
        for (let t = 0; t < this._gen.tours.length; t++) {
            const matchsRaw = this._gen.tours[t]; // [[ [idx1,idx2], [idx3,idx4] ], ...]
            const byesRaw   = this._gen.byes[t];  // [idx, ...]

            const matchs = matchsRaw.map((match, mIdx) => {
                const [paire1, paire2] = match;
                return {
                    terrain: this.premierTerrain + mIdx,
                    equipe1: [this.joueurs[paire1[0]], this.joueurs[paire1[1]]],
                    equipe2: [this.joueurs[paire2[0]], this.joueurs[paire2[1]]]
                };
            });

            const byes = (byesRaw || []).map(idx => this.joueurs[idx]);

            this.tours.push({ numero: t + 1, matchs, byes });
        }
    }

    // ─── Régénération (Abandons) ───────────────────────────────────────────────────────────────

    /**
     * Re-hydrate complètement l'état depuis l'historique et régénère la fin du tournoi,
     * sans les joueurs qui ont abandonné.
     * @param {Array} toursExistants - Historique des tours (ceux qu'on garde) (depuis poule.tours)
     * @param {Array<string|number>} idsJoueursRetires - Liste des IDs à retirer
     * @param {number} depuisTour - L'indice du tour à régénérer (0 = premier tour, nbTours = fini)
     * @returns {object} { succes: boolean, message?: string }
     */
    regenererApresRetrait(toursExistants, idsJoueursRetires, depuisTour) {
        if (!this._gen) {
            // Instancier un moteur "vide"
            this._gen = new GenerateurDynamique(this.joueurs.length, this.nbTerrains, this.nbTours);
        }

        const idToIndex = {};
        this.joueurs.forEach((j, idx) => idToIndex[j.id] = idx);

        // Indices des joueurs retirés
        const idxRetires = idsJoueursRetires
            .map(id => idToIndex[id])
            .filter(idx => idx !== undefined);

        // Hydrater le _gen.tours et _gen.byes
        const genTours = [];
        const genByes = [];

        for (let t = 0; t < toursExistants.length; t++) {
            const tourPassé = toursExistants[t];
            const matchsIdx = [];
            
            if (tourPassé && tourPassé.matchs) {
                for (const match of tourPassé.matchs) {
                    // Les joueurs absents ou remplacés causeront des undefined, on va sécuriser la relecture
                    const j1 = match.equipe1?.[0]?.id;
                    const j2 = match.equipe1?.[1]?.id;
                    const j3 = match.equipe2?.[0]?.id;
                    const j4 = match.equipe2?.[1]?.id;
                    if (j1 !== undefined && j2 !== undefined && j3 !== undefined && j4 !== undefined) {
                        matchsIdx.push([ 
                            [idToIndex[j1], idToIndex[j2]], 
                            [idToIndex[j3], idToIndex[j4]] 
                        ]);
                    }
                }
            }
            genTours.push(matchsIdx);

            const byesIdx = [];
            if (tourPassé && tourPassé.byes) {
                for (const bye of tourPassé.byes) {
                    if (bye && bye.id !== undefined) byesIdx.push(idToIndex[bye.id]);
                }
            }
            genByes.push(byesIdx);
        }

        // Écraser complètement l'historique du moteur
        this._gen.tours = genTours;
        this._gen.byes = genByes;
        
        // Régénérer à partir de `depuisTour`
        const res = this._gen.regenererDepuis(depuisTour, idxRetires, this.nbTours);

        if (res.succes) {
            this.stats = this._gen.stats;
            // Refaire V3 : reconvertir gen.tours en objets joueurs
            this.tours = [];
            for (let t = 0; t < this._gen.tours.length; t++) {
                const matchsRaw = this._gen.tours[t];
                const byesRaw   = this._gen.byes[t];

                // Si c'est un "vieux" tour, on peut le recopier à l'identique (pour préserver les scores !)
                if (t < depuisTour && toursExistants[t]) {
                    this.tours.push(toursExistants[t]);
                } else {
                    // C'est un "nouveau" tour (ou modifié)
                    const matchs = matchsRaw.map((match, mIdx) => {
                        const [paire1, paire2] = match;
                        return {
                            terrain: this.premierTerrain + mIdx,
                            equipe1: [this.joueurs[paire1[0]], this.joueurs[paire1[1]]],
                            equipe2: [this.joueurs[paire2[0]], this.joueurs[paire2[1]]],
                            score1: null,
                            score2: null
                        };
                    });

                    const byes = (byesRaw || []).map(idx => this.joueurs[idx]);

                    this.tours.push({ numero: t + 1, matchs, byes });
                }
            }
        }
        return res;
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────────

    _nomJoueur(joueur) {
        if (!joueur) return '?';
        const prenom = joueur.prenom || '';
        const nom    = joueur.nom    || `#${joueur.id}`;
        return prenom ? `${nom} ${prenom}` : nom;
    }

    // ─── Affichage console (avec noms) ────────────────────────────────────────────

    afficherResume() {
        const SEP = '='.repeat(60);
        const sep = '-'.repeat(60);

        console.log(SEP);
        console.log('RÉSUMÉ DU TOURNOI — GenerateurTournoiV3');
        console.log(SEP);
        console.log(`Joueurs   : ${this.joueurs.length}`);
        console.log(`Terrains  : ${this.nbTerrains} (à partir du terrain ${this.premierTerrain})`);
        console.log(`Tours gen.: ${this.tours.length} / ${this.nbTours} demandé(s)`);
        console.log(sep);

        for (const tour of this.tours) {
            console.log(`Tour ${tour.numero} :`);
            for (const m of tour.matchs) {
                const e1 = m.equipe1.map(j => this._nomJoueur(j)).join(' / ');
                const e2 = m.equipe2.map(j => this._nomJoueur(j)).join(' / ');
                console.log(`  Terrain ${m.terrain} : [${e1}]  vs  [${e2}]`);
            }
            if (tour.byes.length > 0) {
                const byeNames = tour.byes.map(j => this._nomJoueur(j)).join(', ');
                console.log(`  Byes : ${byeNames}`);
            }
        }

        console.log(sep);
        console.log('STATISTIQUES :');
        const s = this.stats;
        console.log(`  Byes           : min=${s.byeMin}, max=${s.byeMax}, écart=${s.ecartBye}`);
        console.log(`  Byes consécutifs        : ${s.byesConsecutifs}`);
        console.log(`  Max partenaire répété   : ${s.maxPartenaire}  (violations: ${s.partenaireViolations})`);
        console.log(`  Max adversaire répété   : ${s.maxAdversaire}  (violations: ${s.adversaireViolations})`);
        console.log(`  Solution valide         : ${this._gen.estValide() ? 'OUI ✓' : 'NON ✗'}`);
        console.log(SEP);
    }

    /** Affiche le résumé brut du moteur (indices). */
    afficherResumeIndices() {
        this._gen.afficherResume();
    }
}

// Export global navigateur
window.GenerateurDynamique   = GenerateurDynamique;
window.GenerateurTournoiV3   = GenerateurTournoiV3;
