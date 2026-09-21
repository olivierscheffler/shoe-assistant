# Déploiement

L'application est **entièrement statique** : le questionnaire, le classement et l'export
Markdown s'exécutent dans le navigateur. Il n'y a ni serveur, ni base de données, ni compte
utilisateur — donc aucun secret à configurer pour publier.

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit le site
avec le bon chemin de base, ajoute le fallback `404.html` nécessaire au routage d'une
application monopage, et publie sur GitHub Pages.

## 1. Activer Pages

1. Settings → **Pages** → Source : **GitHub Actions**.
2. Un dépôt **public** est nécessaire pour Pages en offre gratuite.

## 2. Chemin de base

Le workflow publie sous `/<nom-du-depot>/`. Si le dépôt s'appelle
`<utilisateur>.github.io` (site racine), remplacez dans le workflow :

```yaml
env:
  BASE_PATH: /
```

Le routeur utilise `import.meta.env.BASE_URL` comme `basename`, donc les routes
`/analyse`, `/prompt`, `/` fonctionnent sous le sous-chemin comme à la racine — y compris
pour un lien profond ouvert directement (via `404.html`).

## 3. Déployer

`git push` sur `main`, ou Actions → « Déployer le site » → *Run workflow*.
L'URL publiée apparaît dans le résumé du job `deploy`.

## Alternatives

Mêmes fichiers, même résultat : Vercel, Netlify ou Cloudflare Pages branchés sur le dépôt
(build `bun run build`, sortie `dist`). Le routage d'une application monopage y est géré
nativement, sans `404.html` ni `BASE_PATH`.

## Notes

- Aucun fichier `.env` n'est nécessaire, ni en local ni en CI.
- Le typecheck (`bunx tsc -b --noEmit`) tourne dans le workflow avant le build : une erreur
  TypeScript bloque la publication au lieu de livrer une page blanche.
- Les réponses du questionnaire ne sont pas conservées : elles vivent dans l'onglet du
  navigateur et disparaissent au rechargement. Le bouton « Copier en .md » sert à garder une
  trace.
