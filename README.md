# Générateur de Tournois de Badminton en double V3

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Application web moderne pour la gestion complète de tournois de badminton en double (ronde suisse). Conçue pour organiser des tournois de manière efficace et équitable, avec un système de handicap intégré, la prise en charge des multi-poules, la notion de joueurs fantômes et de multi-salles. 

> 📋 **Bêta-testeurs** : consultez le [Guide de Bêta-Test](BETA_TESTING.md) pour les instructions de test.

## ✨ Nouveautés de la Version 3.0

La version 3 a été **entièrement refaite** pour supporter des configurations beaucoup plus pointues :
- **Multi-poules** : Gestion d'un tournoi à travers plusieurs poules jouées en parallèle avec redistribution automatique en cours de tournoi.
- **Support des "Fantômes"** : Niveaux dynamiques permettant de simuler l'équilibre parfait lors de la génération.
- **Répartition améliorée** : Outil de "byes" (joueurs au repos) revu avec une pondération et un tracking précis.
- **Refonte de l'interface et du Timer** : L'interface vidéoprojecteur est désormais ultra-fluide avec une mise à jour instantanée du minuteur et de la rotation des matchs.
- **Navigation Multi-pages moderne** : Fin du système Single-Page (SPA). On divise logiquement : `Accueil`, `Tournoi` (gestion live), `Classement`, et `Affichage` pour une flexibilité de projection accrue.

## ✨ Fonctionnalités

### Gestion des Tournois
- **Génération automatique de matchs** en double (Ronde Suisse, système multi-poules optimisé)
- **Système de poules dynamiques** : reconfiguration en cours de tournoi
- **Importation de joueurs** depuis fichiers Excel (.xlsx) complets (niveaux, multi-poules)
- **Sauvegarde automatique** dans IndexedDB (persistance locale transparente)
- **Export Excel** des résultats et classements

### Système de Scoring
- **Modes de comptage** : Points, Temps, ou Aucun
- **Système de handicap** : attribution de points initiaux selon le niveau

### Affichage Vidéoprojecteur
- **Page dédiée** (`affichage.html`) pour une projection grand format
- **Mode réactif** : ne recharge que les blocs ayant changé, rafraichissement parfait du timer
- **Mises en page dynamiques** : tableaux et cadres s'adaptant à l'espace disponible
- **Thèmes clair / sombre** 

### Timer de Match partagé
- Le chronomètre suit fidèlement l'état réel et s'envoie sans perte à la vue Projetée.
- Boutons et changement de statuts (en cours, pause, arrêté) avec couleurs adaptées.
- Signal sonore et alerte visuelle au bout du temps.

## 🏗️ Architecture

```
tournament-BAD-v3/
├── index.html           # Point d'entrée (Accueil et paramétrage)
├── tournoi.html         # Page de gestion et suivi du tournoi
├── affichage.html       # Page Projecteur / Live
├── classement.html      # Vue finale et impression
├── assets/
│   ├── fonts/           # Polices locales 
│   ├── images/
│   │   └── favicon.ico  # Icône
│   └── sons/
│       └── buzzer.wav   # Son de fin de timer
├── css/                 # Feuilles de style par page et globales
├── ext/                 # Dépendances externes (xlsx)
├── utils/               # Générateurs V3 (Rondes, rotation, Timer)
├── page/                # Logique de Vues (Classes DOM)
└── db/                  # Gestionnaire IndexedDB
```

## 🚀 Installation

```bash
git clone https://github.com/mmaunier/tournament-BAD-v3
cd tournament-BAD-v3
```

Aucune dépendance npm requise. L'application fonctionne directement dans le navigateur, même sans connexion internet.

## 📖 Utilisation

1. Ouvrez `index.html` dans votre navigateur (ou servez via un serveur local).
2. Configurez le tournoi ou importez vos joueurs .xlsx. 
3. Validez l'accueil pour permuter automatiquement sur `tournoi.html`.
4. Ouvrez `affichage.html` dans un nouvel onglet, et déplacez-le sur votre vidéoprojecteur.

## 🙏 Crédits
Ce projet est développé par mmaunier, et est originellement basé sur [orykami/badminton-tournament](https://github.com/orykami/badminton-tournament) avec une refonte complète.

## 📄 Licence
Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
