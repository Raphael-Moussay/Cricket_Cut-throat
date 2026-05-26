# Cricket Cut-throat

Petite interface mobile pour jouer au mode "Cut-throat" de Cricket (darts).

**But du projet:** fournir une table de score simple et mobile-friendly pour suivre les touches, appliquer la règle Cut-throat (pénalités) et afficher un classement final.

**Technologies:** HTML, CSS, et JavaScript (pas de build requis).

**Fonctionnalités principales**
- **Suivi des hits:** système de 0 à 3 touches par cible (20,19,18,17,16,15,Bull).
- **Cut-throat:** les joueurs fermant une cible pénalisent ceux qui ne l'ont pas fermée.
- **Historique et annulation:** journal des actions et bouton "Annuler" pour revenir en arrière.
- **Boutons Shanghai:** actions spéciales (+50 / +25) pouvant être appliquées aux autres joueurs.
- **Affichage mobile optimisé:** design pensé pour usage sur téléphone.

**Démarrer (utilisation)**
- Ouvrez le site https://raphael-moussay.github.io/Cricket_Cut-throat/ dans votre navigateur.
- Ou servez le dossier localement si vous préférez un serveur HTTP (recommandé pour certains navigateurs) :

```bash
python -m http.server 8000
# puis ouvrez http://localhost:8000
```

**Contrôles rapides**
- `Nouvelle partie` : définir le nombre de joueurs et leurs initiales.
- Appuyer sur une case cible pour incrémenter les touches (réduit les pénalités selon les règles Cut-throat).
- `SHA` boutons : appliquent des points aux autres joueurs (règle maison).
- `Historique` : voir les derniers coups; `Annuler` : revenir à l'état précédent.

**Structure des fichiers**
- [index.html](index.html) : page principale.
- [app.css](app.css) : styles et thèmes.
- [app.js](app.js) : logique du jeu et rendu.

**Contribuer / améliorations possibles**
- Ajouter tests unitaires pour la logique de score.
- Export/imp. des parties (JSON).
- Support multilingue et options de règles configurables.

Licence et auteur
- Projet personnel — modifiez librement pour usage privé.

