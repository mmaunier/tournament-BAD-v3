# 🏸 Générateur de Tournoi Badminton V3 - Guide Bêta-Testeur

## Présentation
Cette application (Version 3.0.0+) permet de gérer des tournois de badminton en double avec rotation automatique des équipes et gestion avancée de **Multi-Poules**. 
Elle fonctionne **100% hors-ligne** (pas besoin d'internet). Les données sont enregistrées dynamiquement dans votre navigateur (via IndexedDB et LocalStorage).

## Ce qui est possible dorénavant (Nouveautés V3)
1. **Multi-Poules natif** : On peut gérer plusieurs poules en parallèle dès le lancement.
2. **Import Excel multi-onglets** : Chaque onglet Excel génère automatiquement une nouvelle poule.
3. **Fantômes et Byes (Joueurs au repos)** : Le nouvel algorithme de mixage gère extrêmement bien les déséquilibres (rotations équitables, aucun repos consécutif si mathématiquement possible, ajout de joueurs "Fantômes" pour compléter les terrains quand nécessaire).
4. **Interface d'Affichage Vidéoprojecteur 100% indépendante** : Une page `affichage.html` optimisée (médailles 🥇🥈🥉, layouts dynamiques flexibles, timer synchronisé très réactif et sans décalage).
5. **Redécoupage dynamique (Classement)** : À l'issue des matchs, vous pouvez ouvrir le gestionnaire de Classement, consulter les statistiques complètes (Points/Match, Diff/Match) et re-répartir les joueurs dans de "Nouvelles Poules" par un simple **cliquer-glisser (Drag & Drop)**.
6. **Exports XLSX Complets** : Exporter instantanément le classement final et la structure des nouvelles poules découpées.

## Ce qui n'est plus pertinent / Ce qui n'est pas possible
- ❌ **La notion figée de "Phase 1 / Phase 2"** : Cette ancienne logique rigide est remplacée par le module dynamique de Classement. Vous gérez vos poules en cours, puis libre à vous de les diviser/recomposer comme souhaité à l'issue de ces manches en exportant un nouveau fichier.
- ❌ **Le Cloud / Synchronisation multi-ordinateurs distants** : Il n'y a toujours aucun serveur externe. Le système multi-fenêtres (un écran PC pour le contrôleur, un écran pour le vidéoprojecteur) fonctionne à merveille, mais *impérativement sur le même poste*. Un pc différent ne verra pas l'application en cours.
- ❌ **Effacer le cache du navigateur** : Attention, les données vivants dans `IndexedDB`, si vous purgez complètement vos données de navigation lors d'un tournoi, sans avoir fait d'export de sauvegarde (Fichier -> Télécharger JSON), vous ferez table rase du tournoi en cours !

## Comment démarrer (Workflow standard V3)
1. **Ouvrir** `index.html` dans votre navigateur (Chrome / Edge / Firefox recommandés).
2. **Importer des joueurs** via un fichier XLSX.
3. **Ajuster** la configuration générale et valider vos poules.
4. Lancer le tournoi et valider les différents tours en saisissant les scores lors des différents matchs.
5. Lancer l'affichage externe (Bouton **Vidéoprojecteur**) en l'envoyant sur votre 2ème écran. Testez le chronomètre.
6. En fin de session, cliquez sur le bouton de **Classement Final**. Jugez les ratios ou modifiez le nombre de nouvelles poules (poules de suites) en glissant-déposant les profils. Générez votre export XLSX.

## Cas de test recommandés à éprouver

### Test 1 : L'algorithme de repos (Beaucoup de Byes)
- Configurez 50 joueurs, 7 terrains, 10 tours.
- **À vérifier** : Les Byes (joueurs sortants) sont-ils bien en rotation systématique entre plusieurs matchs ? Personne de coincé consécutivement ?

### Test 2 : Le module de reclassement (Vue Classement & Drag/Drop)
- Avancez manuellement de 2 tours sur un petit tournoi (rentrez des scores farfelus, incluez des ex-aequo).
- Rendez-vous sur la vue Classement.
- Augmentez le spinner du "Nb de poules" à 3. 
- Glissez-déposez des joueurs en surbrillance d'une poule à l'autre.
- **À vérifier** : Les compteurs de joueurs des poules se mettent-ils bien à jour ? L'export XLSX crache-t-il bien vos 3 poules modifiées séparément ?

### Test 3 : Retrait brutal en cours de partie
- Lancer un tournoi classique, valider le 1er tour.
- Cocher la case pour retirer un joueur pour le 2ème tour (Abandon/Départ anticipé).
- **À vérifier** : L'algorithme génère-t-il bien le nouveau tour en intégrant les Fantômes si nécessaire ? Le plantage est-il évité ?

--- 
Merci pour votre temps et vos tests croisés ! N'hésitez pas à ouvrir un ticket sur GitHub pour tout comportement inattendu. 🙏
