# 🏸 Générateur de Tournoi Badminton V3.1 - Guide Bêta-Testeur

## Présentation
Cette application (Version 3.1.0) permet de gérer des tournois de badminton en double avec rotation automatique et gestion avancée de **Multi-Poules**. 
Elle passe désormais d'une logique 100% navigateur à une **architecture Serveur Local** (Node.js) couplé à une base de données **SQLite** et des échanges **Temps Réel** (WebSockets / Socket.io).

## Ce qui est possible dorénavant (Nouveautés V3.1 & Architecture Serveur)
1. **Saisie des scores via Smartphone** : Les joueurs peuvent scanner le QR de votre réseau local (ex: `http://192.168.1.50:3000/api/public`) et saisir eux-mêmes leurs scores en temps réel.
2. **Temps réel et verrous de sécurité** : Dès qu'un joueur saisit sur son smartphone, la console de l'administrateur et le tableau d'affichage géant (vidéoprojecteur) s'actualisent instantanément sans rafraichir. Des icônes de cadenas 🔒 sécurisent les matchs déjà validés.
3. **Persistance en Base de données (SQLite)** : `tournoi.sqlite` est créé localement à la racine. Plus aucune donnée importante ne risque de disparaitre si un bénévole vide le cache web du navigateur Firefox ou Chrome.
4. **Authentification Admin** : Un mot de passe protège le tableau de bord maître contre d'éventuels petits malins sondant l'IP réseau.
5. **Multi-Poules & Fantômes conservés** : Toutes les avancées de la V3.0 concernant le calcul parfait des Byes (joueurs au repos), les poules complexes et le reclassement en Drag & Drop à la fin du tournoi, sont préservés !

## Ce qui n'est plus pertinent / Ce qui change radicalement
- ❌ **La notion figée de "Double-clic sur l'index.html"** : L'application n'est plus statique. Vous devez démarrer un serveur local \`node server.js\` via un terminal.
- ❌ **Le stockage IndexedDB (Navigateur)** : Remplacé intégralement par les appels serveurs (`GET /api/tournaments` etc.) vers SQLite.

## ⚠️ Notes concernant l'installation (Spécial Windows 11)
L'installation sous **Windows 11** nécessite une attention particulière. L'application repose sur `sqlite3`. Contrairement à d'autres modules, ce module nécessite parfois d'être *compilé ou wrappé* spécifiquement pour la plateforme si un binaire précompilé n'est pas disponible pour votre version exacte de Node:
1. Vous devez installer **[Node.js LTS](https://nodejs.org)** (version 18, 20 ou supérieure).
2. Si vous rencontrez des erreurs de types `node-gyp rebuild` lors du traditionnel `npm install`, il vous manquera possiblement les *Windows Build Tools* ou *Python*.
   > 💡 Astuce Windows : En cas d'erreur de compilation lors de l'install, ouvrez un terminal en **Administrateur** et exécutez `npm install --global windows-build-tools` puis relancez un terminal standard pour faire votre `npm install`.

## Comment démarrer (Workflow standard V3.1)
1. **Démarrer le serveur** : Dans votre terminal, exécutez `npm install` (la première fois), puis `node server.js`.
2. Ouvrez le navigateur de l'ordinateur principal à l'adresse **http://localhost:3000**.
3. **Importer des joueurs** via un fichier XLSX et configurez l'événement.
4. **Distribuez l'accès réseau** : Partagez l'adresse IP affichée dans la console (ex: `http://192.168.1.50:3000/api/public`) aux joueurs par le biais d'un QR code, etc.
5. Lancer l'affichage externe (Bouton **Vidéoprojecteur**) en l'envoyant sur votre 2ème écran (via `url/api/affichage`). Testez le chronomètre synchronisé.
6. En fin de session, cliquez sur le bouton de **Classement Final**. Consutlez le calcul corrigé des stats (NaN fixés en V3.1), puis exportez le tout.

## Cas de test recommandés à éprouver
- **Testez la saisie publique (Mobile)** : Connectez votre propre téléphone sur le Wi-Fi, accédez à la vue publique, saisissez le score d'un match (les 2 sets) et observez si l'ordinateur maître détecte et bloque correctement la ligne.
- **Forcer un correctif Administrateur** : L'administrateur peut-il écraser les points validés par erreur par le public avec le bouton d'édition forcée ?
- **Reprenez d'anciennes sauvegardes excel / xlsx** pour voir si les fantômes s'importent toujours sans heurt dans ce nouvel écosystème DB.

--- 
Merci pour vos retours précieux et vos expérimentations réseau. N'hésitez pas à remonter sur le GitHub tout conflit avec `sqlite3` selon votre version OS ! 🙏
