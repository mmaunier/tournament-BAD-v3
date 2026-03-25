# Générateur de Tournois de Badminton en double V3

[![Version](https://img.shields.io/badge/version-3.1.2-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Application web moderne pour la gestion complète de tournois de badminton en double (ronde suisse). Conçue pour organiser des tournois de manière efficace et équitable, avec un système de handicap intégré, la prise en charge des multi-poules, la notion de joueurs fantômes et de multi-salles. 

> 📋 **Bêta-testeurs** : consultez le [Guide de Bêta-Test](BETA_TESTING.md) pour les instructions de test.

## ✨ Nouveautés de la Version 3.1 (Architecture Serveur & Temps Réel)

La version 3.1 franchit un cap majeur avec l'arrivée d'un **véritable backend (Node.js/SQLite)** assurant une robustesse à toute épreuve pour vos compétitions :
- **Ne perdez plus vos données** : Les classements et l'historique sont sauvegardés en une base de données locale.
- **Saisie par les joueurs** : Les smartphones / tablettes du public accèdent à une vue leur permettant de saisir leur score.
- **Temps réel intégral** : WebSockets intégrés. Dès qu'un joueur saisit les points, l'affichage géant s'actualise nativement.

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

```text
tournament-BAD-v3/
├── server.js            # Point d'entrée Serveur (Serveur Web Express)
├── db.js                # Contrôleur SQLite et Temps Réel (Socket.io)
├── package.json         # Configuration et dépendances Node.js
├── tournoi.sqlite       # Base de données locale (générée automatiquement au lancement)
├── public/              # Fichiers Clients servis par le serveur web (Frontend)
│   ├── index.html       # Accueil (Création tournoi)
│   ├── html/            # Pages détaillées
│   │   ├── tournoi.html    # Tableau de bord Administrateur
│   │   ├── affichage.html  # Vue Vidéoprojecteur (Actualisée en Wi-Fi)
│   │   ├── classement.html # Classement final statique
│   │   └── public.html     # Vue Smartphone pour les joueurs
│   ├── css/             # Feuilles de styles adaptées
│   ├── page/            # Contrôleurs DOM et UI (Classes JS)
│   ├── utils/           # Générateurs V3 (Rondes, Rotations, Timer)
│   ├── db/              # Accès API et Socket depuis le navigateur
│   └── assets/          # Icônes, Fonts, Sons
└── README.md
```

## 🚀 Installation & Démarrage

```bash
# 1. Cloner le projet
git clone https://github.com/mmaunier/tournament-BAD-v3
cd tournament-BAD-v3

# 2. Installer les dépendances Serveur
npm install

# 3. Démarrer l'application
node server.js
```

Le serveur démarrera localement (généralement sur le port `3000`).
L'application est **entièrement autonome** et fonctionnera sans connexion internet, créant sa propre base de données `tournoi.sqlite`.

## 📖 Utilisation

1. Ouvrez l'interface d'administration à l'adresse indiquée dans la console (`http://localhost:3000`).
2. Configurez le tournoi ou importez vos joueurs .xlsx.
3. Communiquez l'adresse IP de l'ordinateur central (ex: `http://192.168.1.50:3000`) aux joueurs pour la saisie smartphone via le réseau local.
4. Lancez un onglet `http://localhost:3000/api/affichage` (ou via la page) sur le vidéoprojecteur.

### 🌐 Accessibilité depuis Internet (Smartphones en 4G) avec ngrok
Si votre gymnase ne dispose pas d'un réseau Wi-Fi couvrant tout l'espace, vous pouvez rendre votre serveur local accessible sur internet pour les joueurs en 4G, via **ngrok** :
1. Créez un compte gratuit sur [ngrok.com](https://ngrok.com/) et installez l'outil.
2. Authentifiez-vous (la première fois) : `ngrok config add-authtoken VOTRE_TOKEN`.
3. Lancez votre serveur (`node server.js`), puis dans un autre terminal, lancez le tunnel :
   ```bash
   ngrok http 3000 --domain=votre-domaine-perso.ngrok-free.app
   ```
4. **Générez un QR Code** pour vos joueurs avec cette URL (sous Linux, l'outil `qrencode` est très pratique : `qrencode -s 10 -o qr_joueurs.png "https://votre-domaine-perso.ngrok-free.app"`). Vos joueurs pourront scanner ce code, accéder au site et saisir leurs scores instantanément en 4G !

---

## 🙏 Crédits
Ce projet est développé par mmaunier, et est originellement basé sur [orykami/badminton-tournament](https://github.com/orykami/badminton-tournament) avec une refonte complète.

## 📄 Licence
Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
