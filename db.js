const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); // Import de bcrypt

// Création ou ouverture du fichier de base de données à la racine du projet
const dbPath = path.resolve(__dirname, 'tournoi.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur lors de la connexion à la base de données:', err.message);
    } else {
        console.log('✅ Connecté à la base de données SQLite.');
        initDb();
    }
});

// Fonction pour initialiser les tables si elles n'existent pas
function initDb() {
    db.serialize(() => {
        // Table pour stocker l'état global du tournoi (Options, nom, etc.)
        db.run(`CREATE TABLE IF NOT EXISTS global_state (
            id INTEGER PRIMARY KEY DEFAULT 1,
            json_data TEXT
        )`);

        // Table spécifique pour les matchs : permet un accès direct sans tout charger
        // Indispensable pour la saisie des scores sur tablette (verrous, etc.)
        db.run(`CREATE TABLE IF NOT EXISTS matchs (
            id TEXT PRIMARY KEY,
            poule_id TEXT,
            tour_numero INTEGER,
            terrain TEXT,
            score_equipe1 INTEGER DEFAULT 0,
            score_equipe2 INTEGER DEFAULT 0,
            verrouille BOOLEAN DEFAULT 0,  -- 0 = False, 1 = True (Saisi par le public)
            json_detail TEXT               -- Le reste des informations du match
        )`);

        // Table pour les paramètres (mot de passe admin, etc.)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Insertion sécurisée du mot de passe par défaut ("admin")
        db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, (err, row) => {
            if (!row) {
                // S'il n'y a pas de mot de passe, on crée le hash pour le mot de passe 'admin'
                bcrypt.hash('admin', 10, (err, hash) => {
                    if (!err) {
                        db.run(`INSERT INTO settings (key, value) VALUES ('admin_password', ?)`, [hash]);
                    }
                });
            }
        });

        console.log('📦 Tables SQLite vérifiées/créées.');
    });
}

module.exports = db;
