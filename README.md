# Classement VELOGAMES - Saison 2026

Mini site statique prevu pour etre publie sur GitHub Pages.

## Structure

- `index.html` : page d'accueil avec classement global et evolutions
- `palmares.html` : page palmares
- `details.html` : page detaillee
- `assets/css/styles.css` : styles communs
- `assets/js/app.js` : logique front commune
- `assets/data/velogames-data.json` : donnees exportees depuis l'Excel
- `scripts/export_velogames_data.py` : script de regeneration des donnees

## Mettre a jour les donnees

1. Modifier le fichier Excel source :
   `C:\Users\nbebin\Documents\New project\Saison Velogames\Velogames Saison 2026 - Classements.xlsx`
2. Mettre a jour le site avec l'une des deux methodes suivantes :

- Double-cliquer sur `C:\Users\nbebin\Documents\New project\Saison Velogames\mettre_a_jour_site_velogames.bat`
- Ou relancer le script :

```powershell
& "C:\Users\nbebin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" ".\scripts\export_velogames_data.py"
```

3. Publier les fichiers mis a jour sur GitHub.

## Notes

- Les logos de courses sont lus depuis `..\Logos-Courses`.
- Le site est pense d'abord pour desktop, avec un rendu propre sur mobile.
