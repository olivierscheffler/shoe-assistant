# Déploiement

Le front est statique (Vite/React), le backend est **Convex**. « Déployer sur GitHub »
couvre donc le front sur GitHub Pages, tandis que le backend reste joignable via son URL
Convex — il n'a pas besoin d'être hébergé par GitHub.

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit le site
avec le bon chemin de base, ajoute le fallback `404.html` nécessaire au routage d'une
application monopage, et publie sur GitHub Pages.

## 1. Activer Pages

1. Settings → **Pages** → Source : **GitHub Actions**.
2. Un dépôt **public** est nécessaire pour Pages en offre gratuite.

## 2. Créer les secrets

Settings → **Secrets and variables** → **Actions** :

| Secret | Obligatoire | Valeur |
| --- | --- | --- |
| `VITE_CONVEX_URL` | oui | URL du backend, `https://<deploiement>.convex.cloud` (tableau de bord Convex → Settings → URL and Deploy Key) |
| `CONVEX_DEPLOY_KEY` | non | Clé de déploiement Convex. Si elle est présente, le workflow déploie aussi les fonctions backend |

Deux façons de faire :

- **Simple** — on garde le backend existant : renseignez seulement `VITE_CONVEX_URL` avec
  l'URL du déploiement actuel. Le site publié partage alors les données du bac à sable.
- **Propre** — backend de production : créez la clé de déploiement **Production** dans le
  tableau de bord Convex, ajoutez-la en `CONVEX_DEPLOY_KEY`, et utilisez l'URL de
  production dans `VITE_CONVEX_URL`. Il faut aussi initialiser les variables de
  l'environnement de production Convex :

  ```bash
  bunx convex env set SITE_URL "https://<utilisateur>.github.io/<depot>/"
  # Clés de signature d'authentification : générées puis écrites sur le déploiement
  bunx @convex-dev/auth --prod
  ```

  Sans `SITE_URL` et sans les clés `JWKS` / `JWT_PRIVATE_KEY`, la connexion boucle :
  `RequireAuth` renvoie sur `/auth` et le jeton n'est jamais validé. Vous pouvez aussi
  recopier `JWKS` et `JWT_PRIVATE_KEY` depuis le déploiement de développement
  (tableau de bord Convex → Settings → Environment Variables) : la paire fonctionne dans
  les deux environnements.

### En cas de boucle de connexion

L'application revient sans cesse sur `/auth` après validation du code : la variable
`SITE_URL` du déploiement Convex ne correspond pas à l'origine du site publié. Corrigez-la
(elle vaut souvent `http://localhost:5173` sur le déploiement de développement), puis
relancez la connexion. C'est le seul réglage à faire côté Convex si vous gardez le backend
actuel.

## 3. Chemin de base

Le workflow publie sous `/<nom-du-depot>/`. Si le dépôt s'appelle
`<utilisateur>.github.io` (site racine), remplacez dans le workflow :

```yaml
env:
  BASE_PATH: /
```

Le routeur utilise `import.meta.env.BASE_URL` comme `basename`, donc les routes
`/dashboard`, `/prompt`, `/auth` fonctionnent sous le sous-chemin comme à la racine — y
compris pour un lien profond ouvert directement (via `404.html`).

## 4. Déployer

`git push` sur `main`, ou Actions → « Déployer le site » → *Run workflow*.
L'URL publiée apparaît dans le résumé du job `deploy`.

## Notes

- Aucun fichier `.env` n'est nécessaire en CI : la valeur de `VITE_CONVEX_URL` est injectée
  au moment du build et figée dans le bundle.
- Les types Convex (`src/convex/_generated`) sont versionnés pour que la compilation
  fonctionne sans clé Convex. Régénérez-les avec `bun convex dev --once` après une
  modification du backend, et pensez à les committer.
- Alternatives équivalentes si vous préférez éviter le fallback `404.html` : Vercel ou
  Cloudflare Pages branchés sur le même dépôt (build `bun run build`, sortie `dist`,
  variable `VITE_CONVEX_URL`). Le routage y est géré nativement.
