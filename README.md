# Semelle — assistant de choix de chaussures

Application de conseil en chaussures de marche, sneakers et randonnée. Elle pose d'abord
les questions (usages, terrains, forme du pied, budget), puis classe les modèles du
catalogue et affiche aussi ce qu'elle écarte, avec la raison.

**Aucun backend.** Il n'y a ni compte, ni profil, ni base de données : tout se calcule
dans le navigateur, et les réponses disparaissent au rechargement. Le récapitulatif peut
être copié ou téléchargé en Markdown.

## Stack

- Vite + React 19 + TypeScript
- React Router v7 (imports depuis `react-router`)
- Tailwind v4 + shadcn/ui + Lucide
- Framer Motion pour les animations

Gestionnaire de paquets : **bun**.

## Scripts

```bash
bun install          # dépendances
bun run dev          # serveur de développement
bunx tsc -b --noEmit # typecheck
bun run build        # build de production (dist/)
```

## Structure

```
src/
  main.tsx                 # routeur (/, /analyse, /prompt) + toaster
  pages/
    Landing.tsx            # présentation, méthode, disponibilité, FAQ
    Analyse.tsx            # questionnaire + résultats + export Markdown
    Prompt.tsx             # lecture/copie/téléchargement de PROMPT.md
    NotFound.tsx
  lib/
    shoe-catalog.ts        # catalogue, questions, moteur de classement
    shoe-catalog-extra.ts  # lignes hors grandes marques, disponibilité, prix
    shoe-catalog-meta.ts   # métadonnées du questionnaire
    shoe-advisor.ts        # surface publique du moteur (catalogue complet, classement)
    advice.ts              # assemblage de la réponse finale (essai, points pro)
  components/ui/           # primitives shadcn/ui
```

## Conventions de données

Le catalogue est la seule source de vérité, et il ne devine rien :

- **Prix** : fourchettes **en dollars canadiens, avant taxes**, alignées sur les prix des
  distributeurs canadiens — jamais une conversion mécanique depuis une autre devise. Un
  prix non documenté vaut `null` et s'affiche « prix à vérifier ».
- **`fait de gamme` / `donnée indicative` / `à vérifier`** : les trois niveaux d'incertitude
  sont distingués partout dans l'interface.
- **Disponibilité** : canal de vente et permanence de la ligne, jamais des stocks.
- **Diversité** : au plus deux modèles par marque, et une part de marques hors des tops
  habituels.

## Déploiement

Voir [`DEPLOY.md`](DEPLOY.md) (GitHub Pages, ou tout hébergeur statique).

## Prompt de l'assistant

[`PROMPT.md`](PROMPT.md) contient le prompt complet (rôle, questions, méthode, format de
réponse, garde-fous) réutilisable dans n'importe quel assistant conversationnel. Il est
lisible et copiable depuis la route `/prompt`.
