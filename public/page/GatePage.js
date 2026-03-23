class GatePage {
    render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="gate-container">
                <h1>Bienvenue sur Tournament-BAD-v3</h1>
                <p>Que souhaitez-vous faire ?</p>
                <div class="gate-buttons">
                    <button id="btn-public" class="btn btn-primary">📱 Saisie des scores</button>
                    <button id="btn-admin" class="btn btn-secondary">⚙️ Gestion du Tournoi (Admin)</button>
                </div>
            </div>
            
            <!-- Modal de connexion Admin -->
            <div id="login-modal" class="modal hidden">
                <div class="modal-content">
                    <h2>Connexion Administrateur</h2>
                    <input type="password" id="admin-password" placeholder="Mot de passe" />
                    <div id="login-error" class="error-text hidden"></div>
                    <div class="modal-actions">
                        <button id="btn-login-cancel" class="btn">Annuler</button>
                        <button id="btn-login-confirm" class="btn btn-primary">Valider</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const btnPublic = this.container.querySelector('#btn-public');
        const btnAdmin = this.container.querySelector('#btn-admin');
        const modal = this.container.querySelector('#login-modal');
        const btnCancel = this.container.querySelector('#btn-login-cancel');
        const btnConfirm = this.container.querySelector('#btn-login-confirm');
        const inputPassword = this.container.querySelector('#admin-password');
        const errorText = this.container.querySelector('#login-error');

        // Accès direct au portail public
        btnPublic.addEventListener('click', () => {
            // TODO : Charger la page publique
            const publicPage = new PublicPage();
            publicPage.render(this.container);
        });

        // Ouvrir la modale Admin
        btnAdmin.addEventListener('click', () => {
            modal.classList.remove('hidden');
            inputPassword.value = '';
            errorText.classList.add('hidden');
            inputPassword.focus();
        });

        // Fermer la modale
        btnCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Valider le mot de passe
        const validateLogin = async () => {
            const pwd = inputPassword.value;
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // On enregistre le token dans le navigateur
                    localStorage.setItem('adminToken', data.token);
                    
                    // On ferme la modale et on charge l'interface d'administration
                    modal.classList.add('hidden');
                    const accueil = new AccueilPage();
                    accueil.render(this.container);
                } else {
                    errorText.textContent = data.message || "Mot de passe incorrect.";
                    errorText.classList.remove('hidden');
                }
            } catch (err) {
                errorText.textContent = "Erreur de connexion au serveur.";
                errorText.classList.remove('hidden');
            }
        };

        btnConfirm.addEventListener('click', validateLogin);
        inputPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') validateLogin();
        });
    }
}
