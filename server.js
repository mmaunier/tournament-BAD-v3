const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const db = require('./db'); // Intégration de la base de données

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Socket.io config
io.on('connection', (socket) => {
    console.log('Un client est connecté en direct via WebSockets.');
});

// Configuration pour permettre au serveur de comprendre de très gros JSON (Essentiel pour générer les gros tournois)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Distribution (hosting) des fichiers statiques depuis le dossier "public"
app.use(express.static(path.join(__dirname, 'public')));

// -- DÉBUT DES ROUTES API (Communication Serveur <-> Navigateur/Tablette) --

// === AUTHENTIFICATION & PARAMÈTRES ===

// Une variable toute simple pour générer et garder en mémoire un jeton d'authentification
// (Pour un usage de tournoi local, c'est largement suffisant !)
const SESSIONS_ADMIN = new Set();
const crypto = require('crypto');
const bcrypt = require('bcrypt'); // Import de bcrypt pour lire le hash

// Route de connexion : vérifier le mot de passe
app.post('/api/login', (req, res) => {
    const pwdTyped = req.body.password;
    
    db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ success: false, message: "Mot de passe non configuré" });
        
        // On compare le mot de passe tapé avec la version hachée stockée dans la base
        bcrypt.compare(pwdTyped, row.value, (err, result) => {
            if (result) {
                // Créer un petit jeton (token) généré au hasard
                const token = crypto.randomBytes(16).toString('hex');
                SESSIONS_ADMIN.add(token);
                res.json({ success: true, token: token });
            } else {
                res.status(401).json({ success: false, message: "Mot de passe incorrect" });
            }
        });
    });
});

// Route pour changer le mot de passe (nécessite le token valide)
app.post('/api/settings/password', (req, res) => {
    const token = req.headers.authorization;
    if (!SESSIONS_ADMIN.has(token)) {
        return res.status(401).json({ error: "Non autorisé (pas connecté en Admin)." });
    }

    const newPwd = req.body.newPassword;
    if (!newPwd || newPwd.trim() === '') {
         return res.status(400).json({ error: "Le mot de passe ne peut pas être vide." });
    }

    // On hache le nouveau mot de passe avant de l'enregistrer (10 est le nombre de tours de salage de sécurité)
    bcrypt.hash(newPwd, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: "Erreur de chiffrement" });

        db.run(`UPDATE settings SET value = ? WHERE key = 'admin_password'`, [hash], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Mot de passe mis à jour." });
        });
    });
});

// === TOURNOI (DONNÉES GLOBALES) ===

// Route pour RECUPERER l'état complet du tournoi
app.get('/api/tournoi', (req, res) => {
    db.get(`SELECT json_data FROM global_state WHERE id = 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.json_data) {
            res.send(row.json_data); // On envoie le JSON tel quel
        } else {
            res.json({}); // Vide
        }
    });
});

// Route pour REINITIALISER la base de données completement (Nouvel admin reset)
app.delete('/api/tournoi', (req, res) => {
    const token = req.headers.authorization;
    if (!SESSIONS_ADMIN.has(token)) {
        return res.status(401).json({ error: "Non autorisé (pas connecté en Admin)." });
    }
    
    db.serialize(() => {
        db.run("DELETE FROM global_state");
        db.run("DELETE FROM matchs", [], () => {
            io.emit('data_updated');
        });
    });
    
    res.json({ success: true, message: "Base de données réinitialisée." });
});

// Route pour SAUVEGARDER l'état complet du tournoi
app.post('/api/tournoi', (req, res) => {
    const token = req.headers.authorization;
    if (!SESSIONS_ADMIN.has(token)) {
        return res.status(401).json({ error: "Non autorisé (pas connecté en Admin)." });
    }

    const bodyData = req.body;

    // 1. Fusionner les scores déjà verrouillés pour ne pas les écraser avec le JSON de l'admin !
    db.all("SELECT id, score_equipe1, score_equipe2 FROM matchs WHERE verrouille = 1", [], (err, rows) => {
        if (!err && rows && bodyData.poules) {
            const lockedScores = {};
            rows.forEach(r => { lockedScores[r.id] = [r.score_equipe1, r.score_equipe2]; });

            bodyData.poules.forEach(p => {
                if (p.tours) {
                    p.tours.forEach((tour, indexTour) => {
                        if (tour.matchs) {
                            tour.matchs.forEach(match => {
                                const matchId = match.id || `${p.id}_${indexTour}_${match.equipe1?.map(j=>j.id).join('-')}-${match.equipe2?.map(j=>j.id).join('-')}`;
                                if (lockedScores[matchId]) {
                                    match.score = lockedScores[matchId];
                                    match.lockedByPublic = true;
                                }
                            });
                        }
                    });
                }
            });
        }

        const jsonData = JSON.stringify(bodyData);

        // 2. Enregistrer l'état global du tournoi mis à jour
        db.run(
            `INSERT INTO global_state (id, json_data) VALUES (1, ?) 
             ON CONFLICT(id) DO UPDATE SET json_data = excluded.json_data`,
            [jsonData],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });

                // 3. Mettre à jour la table des matchs pour les tablettes
                if (bodyData.poules) {
                    bodyData.poules.forEach(poule => {
                        if (poule.tours) {
                            poule.tours.forEach((tour, indexTour) => {
                                if (tour.matchs) {
                                    tour.matchs.forEach(match => {
                                        const matchId = match.id || `${poule.id}_${indexTour}_${match.equipe1?.map(j=>j.id).join('-')}-${match.equipe2?.map(j=>j.id).join('-')}`;
                                        const terrain = match.terrain || "Non assigné";
                                        const s1 = match.score1 ?? (match.score ? match.score[0] : 0);
                                        const s2 = match.score2 ?? (match.score ? match.score[1] : 0);
                                        const locked = (match.termine || match.lockedByPublic) ? 1 : 0;

                                        // On insert ou on update le terrain et les scores validés par l'admin
                                        db.run(
                                            `INSERT INTO matchs (id, poule_id, tour_numero, terrain, score_equipe1, score_equipe2, verrouille, json_detail) 
                                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                             ON CONFLICT(id) DO UPDATE SET 
                                                terrain = excluded.terrain, 
                                                score_equipe1 = excluded.score_equipe1, 
                                                score_equipe2 = excluded.score_equipe2, 
                                                verrouille = excluded.verrouille, 
                                                json_detail = excluded.json_detail`,
                                            [matchId, poule.id, indexTour + 1, terrain, s1, s2, locked, JSON.stringify(match)]
                                        );
                                    });
                                }
                            });
                        }
                    });
                }

                io.emit('data_updated');
                res.json({ success: true });
            }
        );
    });
});

// === MATCHS ===

// Route pour récupérer uniquement les scores verrouillés (pour la synchro Admin)
app.get('/api/scores', (req, res) => {
    db.all(`SELECT id, score_equipe1, score_equipe2 FROM matchs WHERE verrouille = 1`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Exemple de route pour récupérer tous les matchs en attente (à développer)
app.get('/api/matchs', (req, res) => {
    db.all(`SELECT * FROM matchs WHERE verrouille = 0`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ matchs: rows });
    });
});

// Exemple de route pour soumettre un score (avec verrouillage du score)
app.post('/api/matchs/:id/score', (req, res) => {
    const matchId = req.params.id;
    const { score1, score2 } = req.body;
    
    // On vérifie si la personne est "Admin" en regardant l'en-tête de la requête
    const token = req.headers.authorization;
    const isAdmin = SESSIONS_ADMIN.has(token);
    
    // Si c'est l'Admin, on force l'enregistrement même si le match a déjà été verrouillé par un joueur.
    // Si c'est le public, on enregistre uniquement si le match n'est pas déjà verrouillé.
    const sql = isAdmin 
        ? `UPDATE matchs SET score_equipe1 = ?, score_equipe2 = ?, verrouille = 1 WHERE id = ?`
        : `UPDATE matchs SET score_equipe1 = ?, score_equipe2 = ?, verrouille = 1 WHERE id = ? AND verrouille = 0`;

    db.run(sql, [score1, score2, matchId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes === 0) {
           return res.status(403).json({ success: false, message: "Match introuvable ou déjà verrouillé (Accès refusé)." });
        }

        // MAJ DU JSON GLOBAL_STATE POUR QUE L'ADMIN LE VOIE DIRECTEMENT AU RAFRAICHISSEMENT
        db.get(`SELECT json_data FROM global_state WHERE id = 1`, [], (err, row) => {
            if (!err && row && row.json_data) {
                try {
                    let globalData = JSON.parse(row.json_data);
                    let found = false;

                    if (globalData.poules) {
                        for (let p of globalData.poules) {
                            if (p.tours) {
                                for (let tIndex = 0; tIndex < p.tours.length; tIndex++) {
                                    if (p.tours[tIndex].matchs) {
                                        for (let m of p.tours[tIndex].matchs) {
                                            const mId = m.id || `${p.id}_${tIndex}_${m.equipe1?.map(j=>j.id).join('-')}-${m.equipe2?.map(j=>j.id).join('-')}`;
                                            if (mId === matchId) {
                                                m.score = [score1, score2];
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (found) break;
                                }
                            }
                            if (found) break;
                        }
                    }

                    if (found) {
                        db.run(`UPDATE global_state SET json_data = ? WHERE id = 1`, [JSON.stringify(globalData)]);
                    }
                } catch (e) {
                    console.error("Erreur lors de la MAJ du json_data pour le match verrouillé", e);
                }
            }
        });
        
        io.emit('data_updated');
        res.json({ success: true, message: isAdmin ? "Score forcé par l'admin !" : "Score enregistré !" });
    });
});

// -- FIN DES ROUTES API --

// Route par défaut : on envoie le fichier index.html quand on arrive sur la racine "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🏆 Serveur de tournoi démarré avec WebSockets !`);
    console.log(`👉 Accès local : http://localhost:${PORT}`);
    console.log(`=================================================`);
});

// === AFFICHAGE ECRAN GEANT ===
app.post('/api/affichage', (req, res) => {
    // Stocker temporairement en mémoire vive:
    app.locals.affichageData = req.body;
    io.emit('affichage_updated', req.body);
    res.json({ success: true });
});

app.get('/api/affichage', (req, res) => {
    res.json(app.locals.affichageData || {});
});
