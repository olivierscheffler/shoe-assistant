/**
 * Métadonnées d'interface du conseiller chaussures : étapes du questionnaire, ordre des
 * questions, libellés hérités, sites officiels des marques et mention de fiabilité.
 *
 * Pourquoi un fichier séparé ? `shoe-catalog.ts` porte les types et les données des modèles,
 * `shoe-catalog-extra.ts` les lignes hors grandes marques et la disponibilité, et
 * `shoe-advisor.ts` la décision. Ces éléments-ci ne décrivent aucune chaussure : ils pilotent
 * l'affichage. Ils sont replacés tels quels par `shoe-catalog.ts`, qui reste le point d'entrée.
 *
 * Ce fichier n'importe que des **types** de `shoe-catalog.ts` : aucun cycle d'exécution.
 */

import type { QuestionId, Step } from "./shoe-catalog";

/** Déroulé du questionnaire, en cinq étapes. */
export const STEPS: Step[] = [
  {
    id: "usage",
    title: "Votre usage",
    intro:
      "Commençons par ce que la paire doit encaisser. Une chaussure de ville et une chaussure de sentier ne répondent pas aux mêmes contraintes.",
    questions: ["usage", "terrain"],
  },
  {
    id: "volume",
    title: "Votre rythme",
    intro:
      "Plus les kilomètres s'accumulent, plus l'amorti et la durabilité comptent davantage que le poids.",
    questions: ["volume", "meteo", "essayage"],
  },
  {
    id: "pied",
    title: "Votre pied",
    intro:
      "C'est ici que se joue la différence entre une paire confortable et une paire qui blesse. Aucune réponse n'est obligatoire.",
    questions: ["appui", "pied", "serrage", "poids"],
  },
  {
    id: "contraintes",
    title: "Vos contraintes",
    intro:
      "Budget, canaux d'achat et exigences servent de filtres durs : un modèle qui ne les respecte pas sera écarté, et nous vous dirons pourquoi.",
    questions: ["budget", "disponibilite", "exigences"],
  },
  {
    id: "style",
    title: "Vos préférences",
    intro:
      "Dernier point : l'apparence et votre priorité déclarée, pour éviter de vous proposer une paire que vous ne porterez pas.",
    questions: ["style", "priorite"],
  },
];

/** Ordre canonique des questions, utilisé par le récapitulatif et l'export `.md`. */
export const QUESTION_ORDER: QuestionId[] = [
  "usage",
  "terrain",
  "volume",
  "meteo",
  "essayage",
  "appui",
  "pied",
  "serrage",
  "poids",
  "budget",
  "disponibilite",
  "exigences",
  "style",
  "priorite",
];

/**
 * Libellés des réponses d'analyses plus anciennes : les bandes de budget y étaient plus
 * étroites et « douleurs » était une option d'appui. On les réaffiche proprement dans
 * l'historique, au lieu de laisser apparaître un code brut.
 */
export const LEGACY_OPTION_LABELS: Partial<Record<QuestionId, Record<string, string>>> = {
  budget: {
    "moins-80": "Moins de 120 $ CA",
    "80-130": "120 à 200 $ CA",
    "130-180": "200 à 280 $ CA",
    "180-plus": "Au-delà de 280 $ CA",
  },
  appui: { douleurs: "Douleurs récurrentes" },
};

/** Sites officiels des marques présentes au catalogue, quand ils sont vérifiés. */
export const BRAND_SITES: Record<string, string> = {
  "HOKA": "https://www.hoka.com/",
  "Brooks": "https://www.brooksrunning.com/",
  "ASICS": "https://www.asics.com/",
  "Saucony": "https://www.saucony.com/",
  "New Balance": "https://www.newbalance.com/",
  "Mizuno": "https://www.mizuno.com/",
  "Nike": "https://www.nike.com/",
  "On": "https://www.on.com/",
  "Altra": "https://www.altrarunning.com/",
  "Topo Athletic": "https://www.topoathletic.com/",
  "Mephisto": "https://www.mephisto.com/",
  "Salomon": "https://www.salomon.com/",
  "Merrell": "https://www.merrell.com/",
  "Keen": "https://www.keenfootwear.com/",
  "Lowa": "https://www.lowa.com/",
  "La Sportiva": "https://www.lasportiva.com/",
  "Veja": "https://www.veja-store.com/",
  "Allbirds": "https://www.allbirds.com/",
  "adidas": "https://www.adidas.com/",
  "Hanwag": "https://www.hanwag.com/",
  "Meindl": "https://www.meindl.de/",
  "Scarpa": "https://www.scarpa.com/",
  "Alt-Berg": "https://www.altberg.co.uk/",
  "Skechers": "https://www.skechers.com/",
  "Ecco": "https://www.ecco.com/",
  "Karhu": "https://www.karhu.com/",
  "Novesta": "https://www.novesta.com/",
  "Vivobarefoot": "https://www.vivobarefoot.com/",
  "Xero Shoes": "https://xeroshoes.com/",
  "NNormal": "https://www.nnormal.com/",
  "inov-8": "https://www.inov-8.com/",
  "Paraboot": "https://www.paraboot.com/",
};

/** Mention de fiabilité affichée dans l'interface, l'export `.md`. */
export const WEAR_NOTE =
  "Données indicatives : les lignes de modèles sont renouvelées chaque année, le poids varie avec la pointure et les prix en dollars canadiens changent selon le distributeur. Montants avant taxes, à vérifier sur la fiche produit avant achat.";
