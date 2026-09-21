/**
 * Couche conseiller : décision, disponibilité et réponse.
 *
 * Le catalogue et le questionnaire vivent dans `shoe-catalog.ts`, les lignes hors
 * grandes marques et la disponibilité dans `shoe-catalog-extra.ts`. Ici on transforme
 * des réponses en une liste courte et justifiée :
 *
 * - **usages et terrains multiples** : un modèle doit couvrir *tout* ce qui a été
 *   déclaré, pas seulement la première case cochée. Un usage ou un terrain non couvert
 *   coûte des points et devient une réserve explicite ;
 * - **disponibilité** : la largeur du réseau de vente et la permanence de la ligne
 *   filtrent les modèles qu'un acheteur pressé ne trouvera pas ;
 * - **diversité** : jamais plus de deux modèles de la même marque, et un signalement
 *   quand la sélection s'enferme dans les marques les plus connues ;
 * - **notes de réserve** : tout ce qui n'est pas vérifiable est écrit noir sur blanc.
 *
 * Ce fichier est du TypeScript pur (aucun import React / DOM) : il sert au front comme
 * aux fonctions Convex.
 */

import {
  answerValues,
  brandSite,
  CATALOG,
  cushionLabel,
  isAnswered,
  modelName,
  modelSearchUrl,
  QUESTIONS,
  summaryOf,
  WEAR_NOTE,
  type Advice,
  type Answers,
  type MatchResult,
  type QuestionId,
  type ShoeModel,
  type Style,
  type Support,
  type Terrain,
  type Usage,
} from "./shoe-catalog";
import {
  availabilityNote,
  AVAILABILITY_LABEL,
  CATALOG_CHECKED_ON,
  EXTRA_MODELS,
  hasPain,
  LINE_STATUS_LABEL,
  MAINSTREAM_BRANDS,
} from "./shoe-catalog-extra";

/* -------------------------------------------------------------------------- */
/* Surface publique                                                           */
/* -------------------------------------------------------------------------- */

export * from "./shoe-catalog-extra";
export type {
  Advice,
  Answers,
  Availability,
  LineStatus,
  MatchResult,
  Question,
  QuestionId,
  QuestionOption,
  ShoeModel,
  Step,
  Style,
  Support,
  Terrain,
  Usage,
} from "./shoe-catalog";
export {
  answerText,
  answerValues,
  BRAND_SITES,
  brandSite,
  CATALOG,
  cushionLabel,
  isAnswered,
  modelName,
  modelSearchUrl,
  optionLabel,
  QUESTION_ORDER,
  QUESTIONS,
  STEPS,
  summaryOf,
  supportLabel,
  WEAR_NOTE,
} from "./shoe-catalog";

/** Catalogue complet : lignes historiques grand public + lignes spécialisées. */
export const FULL_CATALOG: ShoeModel[] = [...CATALOG, ...EXTRA_MODELS];

export const DIVERSITY_NOTE =
  "Sélection limitée à deux modèles par marque : cela évite de vous enfermer dans une seule marque et fait remonter des lignes moins connues, disponibles dans un réseau plus étroit.";

/* -------------------------------------------------------------------------- */
/* Critères                                                                   */
/* -------------------------------------------------------------------------- */

const USAGE_PHRASE: Record<Usage, string> = {
  urbain: "la marche quotidienne en ville",
  marche: "la marche active",
  rando: "la randonnée loisir",
  "rando-soutenue": "la randonnée soutenue",
  trail: "les sentiers et le trail",
  lifestyle: "un usage lifestyle",
};

const TERRAIN_PHRASE: Record<Terrain, string> = {
  asphalte: "asphalte et trottoir",
  chemins: "chemins de terre et gravier",
  sentiers: "sentiers techniques",
  mixte: "terrains variés",
};

const BUDGET_MAX: Record<string, number> = {
  "moins-80": 80,
  "80-130": 130,
  "130-180": 180,
  "180-plus": 400,
  flexible: Number.POSITIVE_INFINITY,
};

/** Usages voisins : une paire de marche active dépanne en randonnée légère, pas l'inverse. */
const NEIGHBOUR_USAGES: Record<Usage, Usage[]> = {
  "rando-soutenue": ["rando"],
  rando: ["rando-soutenue", "marche"],
  marche: ["rando", "urbain"],
  urbain: ["marche", "lifestyle"],
  trail: ["rando-soutenue", "rando"],
  lifestyle: ["urbain"],
};

const LIGHT_USAGES: Usage[] = ["urbain", "lifestyle"];
const HEAVY_USAGES: Usage[] = ["rando-soutenue", "trail"];

interface Criteria {
  usages: Usage[];
  terrains: Terrain[];
  volume?: string;
  meteo: string[];
  essayage?: string;
  appui?: string;
  douleurs: boolean;
  pied: string[];
  serrage?: string;
  poids?: string;
  budget: number | undefined;
  disponibilite?: string;
  exigences: string[];
  style?: string;
  priorite?: string;
}

function optionsOf(id: QuestionId): string[] {
  return QUESTIONS[id].options.map((option) => option.value);
}

const USAGE_VALUES = optionsOf("usage");
const TERRAIN_VALUES = optionsOf("terrain");

function asUsages(values: string[]): Usage[] {
  return values.filter((value): value is Usage => USAGE_VALUES.includes(value));
}

function asTerrains(values: string[]): Terrain[] {
  return values.filter((value): value is Terrain => TERRAIN_VALUES.includes(value));
}

function single(values: string[]): string | undefined {
  return values[0];
}

function readCriteria(answers: Answers): Criteria {
  const budgetKey = single(answerValues(answers, "budget"));
  return {
    usages: asUsages(answerValues(answers, "usage")),
    terrains: asTerrains(answerValues(answers, "terrain")),
    volume: single(answerValues(answers, "volume")),
    meteo: answerValues(answers, "meteo"),
    essayage: single(answerValues(answers, "essayage")),
    appui: single(answerValues(answers, "appui")),
    douleurs: hasPain(answers),
    pied: answerValues(answers, "pied"),
    serrage: single(answerValues(answers, "serrage")),
    poids: single(answerValues(answers, "poids")),
    budget: budgetKey === undefined ? undefined : BUDGET_MAX[budgetKey],
    disponibilite: single(answerValues(answers, "disponibilite")),
    exigences: answerValues(answers, "exigences"),
    style: single(answerValues(answers, "style")),
    priorite: single(answerValues(answers, "priorite")),
  };
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

interface Scorer {
  points: number;
  strengths: string[];
  cautions: string[];
  blockers: string[];
}

function add(scorer: Scorer, points: number, reason: string) {
  scorer.points += points;
  scorer.strengths.push(reason);
}

function caution(scorer: Scorer, reason: string) {
  scorer.cautions.push(reason);
}

function block(scorer: Scorer, reason: string) {
  scorer.blockers.push(reason);
}

/** Énumération lisible : on évite le double « et » quand les libellés en contiennent déjà un. */
function frList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  const simple = items.every((item) => !item.includes(" et ") && !item.includes(","));
  if (!simple) return items.join(", ");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function usageList(usages: Usage[]): string {
  return frList(usages.map((usage) => USAGE_PHRASE[usage]));
}

function terrainList(terrains: Terrain[]): string {
  return frList(terrains.map((terrain) => TERRAIN_PHRASE[terrain]));
}

/** Un usage est « proche » quand le modèle vise une famille voisine de celle déclarée. */
function hasNeighbourUsage(model: ShoeModel, usage: Usage): boolean {
  return NEIGHBOUR_USAGES[usage].some((alt) => model.usages.includes(alt));
}

/**
 * Usages : c'est la couverture qui compte, plus que le nombre de cases cochées. Un
 * modèle qui couvre tous les usages déclarés marque le maximum ; un modèle qui n'en
 * couvre qu'une partie est retenu mais signalé, jamais présenté comme polyvalent.
 */
function scoreUsage(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 26;
  if (c.usages.length === 0) {
    s.points += max / 2;
    return;
  }

  const covered = c.usages.filter((usage) => model.usages.includes(usage));
  const missing = c.usages.filter((usage) => !model.usages.includes(usage));

  if (missing.length === 0) {
    add(s, max, `Conçue pour ${usageList(c.usages)}`);
    return;
  }
  if (covered.length > 0) {
    const share = covered.length / c.usages.length;
    add(s, Math.round(max * (0.35 + 0.45 * share)), `Conçue pour ${usageList(covered)}`);
    const near = missing.every((usage) => hasNeighbourUsage(model, usage));
    caution(
      s,
      `${near ? "À la limite de son domaine" : "Pas prévue"} pour ${usageList(missing)} : à réserver à un usage occasionnel`,
    );
    return;
  }

  if (c.usages.some((usage) => hasNeighbourUsage(model, usage))) s.points += 11;
  caution(s, `Usage décalé : ce modèle vise ${usageList(model.usages)}`);
}

/**
 * Terrains : un modèle qui couvre tous les terrains déclarés marque le maximum. Les
 * sentiers techniques restent éliminatoires : une semelle de ville n'y a rien à faire.
 */
function scoreTerrain(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 15;
  if (c.terrains.length === 0) {
    s.points += max / 2;
    return;
  }

  if (c.terrains.includes("mixte")) {
    const roadTerrains: Terrain[] = ["asphalte", "chemins", "sentiers"];
    const coverage = roadTerrains.filter((terrain) => model.terrains.includes(terrain)).length;
    if (coverage >= 3) add(s, max, "Polyvalente sur tous vos terrains");
    else if (coverage === 2) {
      s.points += 11;
      caution(s, "Bonne sur deux terrains sur trois : l'un de vos terrains n'est pas couvert");
    } else {
      s.points += 5;
      caution(s, "Terrain peu couvert pour un usage varié");
    }
    return;
  }

  const covered = c.terrains.filter((terrain) => model.terrains.includes(terrain));
  const missing = c.terrains.filter((terrain) => !model.terrains.includes(terrain));

  if (missing.length === 0) {
    add(s, max, `Couvre ${terrainList(c.terrains)} : dans son domaine`);
    return;
  }
  if (covered.length === 0) {
    block(s, `Terrain incompatible : ce modèle ne couvre pas ${terrainList(c.terrains)}`);
    return;
  }
  if (missing.includes("sentiers")) {
    block(s, "Sentiers techniques non couverts : ce modèle n'est pas fait pour y aller");
    return;
  }
  s.points += missing.length === 1 ? 9 : 6;
  if (missing.includes("asphalte")) caution(s, "Semelle orientée chemin : plus bruyante et plus lente sur bitume");
  else caution(s, `Pas prévue pour ${terrainList(missing)} : accroche ou confort à tester`);
}

/**
 * Appui : la douleur déclarée prime sur la pronation. Une douleur plantaire récurrente
 * demande de l'amorti et un avis professionnel, pas un renfort de stabilité.
 */
function scoreSupport(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 16;

  if (c.douleurs) {
    if (model.cushioning >= 4) add(s, max, "Amorti important, qui soulage talon et voûte");
    else if (model.cushioning === 3) {
      s.points += 9;
      caution(s, "Amorti moyen : à tester avant un usage intensif");
    } else {
      s.points += 3;
      caution(s, "Amorti ferme, à éviter en cas de douleurs plantaires");
    }
    return;
  }

  switch (c.appui) {
    case "pronation":
      if (model.support === "stabilite") add(s, max, "Renfort de stabilité adapté à la pronation");
      else {
        s.points += 4;
        caution(s, "Aucun renfort anti-pronation : peut accentuer l'affaissement du pied");
      }
      return;
    case "supination":
      if (model.support === "neutre" && model.cushioning >= 3) add(s, max, "Neutre et bien amortie : bon choix en supination");
      else if (model.support === "neutre") {
        s.points += 9;
        caution(s, "Amorti faible pour un appui sur le bord extérieur");
      } else {
        s.points += 10;
        caution(s, "Renfort de stabilité peu utile en supination, et souvent plus rigide");
      }
      return;
    case "neutre":
      if (model.support === "neutre") add(s, max, "Neutre, conforme à votre appui");
      else {
        s.points += 11;
        caution(s, "Renfort de stabilité : confortable pour certains, trop directif pour d'autres");
      }
      return;
    case "inconnu":
    default:
      s.points += 10;
      caution(s, "Appui non déterminé : privilégiez un modèle neutre que vous pouvez essayer en magasin");
  }
}

function scoreCushioning(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 8;
  if (c.volume === undefined && c.poids === undefined) {
    s.points += max / 2;
    return;
  }
  let target = 3;
  if (c.volume === "plus-30") target = 4.5;
  else if (c.volume === "15-30") target = 4;
  else if (c.volume === "moins-5") target = 2.5;

  if (c.poids === "plus-95") target += 1;
  else if (c.poids === "moins-60") target -= 0.5;

  const delta = Math.abs(model.cushioning - target);
  if (delta <= 0.75) add(s, max, `Amorti ${cushionLabel(model.cushioning)} cohérent avec votre volume et votre poids`);
  else if (delta <= 1.5) {
    s.points += 5;
    caution(s, `Amorti ${cushionLabel(model.cushioning)} : un cran en dessous ou au-dessus de l'idéal pour votre profil`);
  } else {
    s.points += 2;
    if (model.cushioning < target) caution(s, "Amorti insuffisant pour ce volume de marche");
    else caution(s, "Amorti excessif pour ce volume : sensation de flottement");
  }
}

function scoreWeather(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 6;
  const needsProtection = c.meteo.includes("pluie") || c.meteo.includes("froid-neige");

  if (model.waterproof === "a-verifier") {
    s.points += needsProtection ? 2 : max - 1;
    caution(s, "Protection contre l'eau non documentée ici : à vérifier sur la fiche produit");
    return;
  }
  if (!needsProtection) {
    s.points += c.meteo.length === 0 ? max - 1 : max;
    if (model.waterproof === "membrane")
      caution(s, "Imperméable : utile sous la pluie, plus chaud et moins respirant l'été");
    return;
  }
  if (model.waterproof === "membrane") add(s, max, `Étanche (${model.membrane ?? "membrane"}), adaptée à votre météo`);
  else if (model.waterproof === "traitement") {
    s.points += 3;
    caution(s, "Simple traitement déperlant : ne tient pas sur une pluie prolongée");
  } else caution(s, "Aucune protection contre l'eau alors que vous marchez souvent mouillé");
}

function scoreBudget(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 9;
  if (c.budget === undefined || !Number.isFinite(c.budget)) {
    s.points += max;
    return;
  }
  const [min, maxPrice] = model.priceEur;
  if (min <= c.budget) {
    add(s, max, `Dans votre budget (${min}–${maxPrice} € environ)`);
    return;
  }
  if (min <= c.budget * 1.15) {
    s.points += 4;
    caution(s, `Légèrement au-dessus de votre budget : à partir de ${min} € environ`);
    return;
  }
  block(s, `Hors budget : ${min} € minimum, soit plus de 15 % au-dessus de votre plafond`);
}

function scoreFit(model: ShoeModel, c: Criteria, s: Scorer) {
  const roomy = ["large", "hallux", "volume-eleve"];

  for (const flag of c.pied) {
    if (flag === "orthopedie") {
      if (model.orthotic === "compatible") add(s, 2, "Compatible avec des semelles orthopédiques");
      else if (model.orthotic === "a-tester") {
        s.points += 1;
        caution(s, "Semelles orthopédiques : faisabilité à tester, la chaussure peut devenir trop serrée");
      } else caution(s, "Chaussure conçue pour un pied nu : peu compatible avec des semelles épaisses");
      continue;
    }
    if (flag === "etroit") {
      if (!model.wideFit) add(s, 2, "Chaussant ajusté, adapté à un pied étroit");
      else caution(s, "Chaussant plutôt large pour un pied étroit : essayez une taille en dessous");
      continue;
    }
    if (flag === "douleurs") continue; // traité par le critère d'appui
    if (roomy.includes(flag) || flag === "ampoules") {
      if (model.wideFit) add(s, 2, "Chaussant large disponible ou avant-pied généreux");
      else caution(s, "Pas de version large : risque de compression de l'avant-pied");
    }
  }
}

function scoreNeeds(model: ShoeModel, c: Criteria, s: Scorer) {
  for (const need of c.exigences.slice(0, 5)) {
    if (need === "vegan") {
      if (model.vegan === "oui") add(s, 1.5, "Sans matière animale");
      else if (model.vegan === "options") {
        s.points += 0.5;
        caution(s, "Vegan uniquement sur certaines déclinaisons : vérifiez la référence exacte");
      } else if (model.vegan === "a-verifier") {
        caution(s, "Matières non documentées ici : le caractère vegan est à vérifier sur la fiche produit");
      } else block(s, "Ne respecte pas votre contrainte vegan (matières animales)");
      continue;
    }
    if (need === "europe") {
      if (model.madeInEurope === "oui") add(s, 1.5, "Fabrication européenne");
      else if (model.madeInEurope === "partiel") {
        s.points += 0.75;
        caution(s, "Production partiellement européenne selon les lignes");
      } else if (model.madeInEurope === "a-verifier") {
        caution(s, "Origine de fabrication non documentée ici : à vérifier sur la fiche produit");
      } else caution(s, "Fabrication hors d'Europe");
      continue;
    }
    if (need === "durabilite") {
      if (model.repairable === true) add(s, 1.5, "Réparable ou ressemelable chez un cordonnier");
      else if (model.repairable === "a-verifier") {
        caution(s, "Réparabilité non documentée ici : demandez si la semelle est remplaçable");
      } else caution(s, "Colle et mousse : réparation difficile en fin de vie");
      continue;
    }
    if (need === "leger") {
      if (model.weightG === null) caution(s, "Poids non communiqué ici : à vérifier sur la fiche produit");
      else if (model.weightG <= 270) add(s, 1.5, `Poids contenu (≈ ${model.weightG} g)`);
      else caution(s, `Poids supérieur à 270 g (≈ ${model.weightG} g)`);
      continue;
    }
    if (need === "discret") {
      if (model.style.includes("discret")) add(s, 1.5, "Look discret, portable en toute situation");
      else caution(s, "Look technique ou sportif, peu discret");
    }
  }
}

function scoreStyle(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 4;
  if (c.style === undefined || c.style === "indifferent") {
    s.points += max;
    return;
  }
  if (model.style.includes(c.style as Style)) add(s, max, "Style conforme à votre préférence");
  else {
    s.points += 2;
    caution(s, "Style différent de celui recherché (possible uniquement dans une autre déclinaison)");
  }
}

/**
 * Disponibilité : l'outil ne connaît pas les stocks. On juge donc ce qui est
 * vérifiable — la largeur du réseau de vente et la permanence de la ligne — et on
 * écarte les modèles qu'un acheteur pressé ne trouvera pas là où il compte acheter.
 */
function scoreAvailability(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 6;
  const { availability } = model;
  const channel = AVAILABILITY_LABEL[availability];
  const edition = model.lineStatus === "edition";

  if (c.disponibilite === "magasin-large" && availability !== "large") {
    block(s, `Pas trouvable en grande enseigne : ${channel.toLowerCase()}`);
    return;
  }
  if (c.disponibilite === "magasin-specialiste" && availability === "restreinte") {
    block(s, `Aucun réseau de magasins fiable : ${channel.toLowerCase()}`);
    return;
  }

  if (availability === "restreinte") {
    s.points += 2;
    caution(
      s,
      `Réseau de vente très étroit (${channel.toLowerCase()}) : comptez sur une commande, avec un réassort incertain`,
    );
    return;
  }
  if (edition) {
    s.points += 3;
    caution(s, "Ligne non reconduite : vérifiez qu'elle est encore produite avant de la chercher partout");
    return;
  }

  const points = availability === "large" ? max : 4;
  add(s, points, `Disponibilité : ${channel.toLowerCase()} · ${LINE_STATUS_LABEL[model.lineStatus].toLowerCase()}`);
}

function score(model: ShoeModel, c: Criteria): MatchResult {
  const s: Scorer = { points: 0, strengths: [], cautions: [], blockers: [] };
  scoreUsage(model, c, s);
  scoreTerrain(model, c, s);
  scoreSupport(model, c, s);
  scoreCushioning(model, c, s);
  scoreWeather(model, c, s);
  scoreBudget(model, c, s);
  scoreFit(model, c, s);
  scoreNeeds(model, c, s);
  scoreStyle(model, c, s);
  scoreAvailability(model, c, s);

  const points = Math.max(0, Math.min(100, Math.round(s.points)));
  const verdict: MatchResult["verdict"] =
    s.blockers.length > 0
      ? "ecarte"
      : points >= 78
        ? "excellent"
        : points >= 62
          ? "bon"
          : points >= 46
            ? "possible"
            : "ecarte";

  return {
    model,
    score: points,
    verdict,
    strengths: s.strengths,
    cautions: s.cautions,
    blockers: s.blockers,
  };
}

/** Deux modèles maximum par marque : la sélection ne doit pas être un catalogue d'une marque. */
function pickDiverse(ranked: MatchResult[], count: number, perBrand = 2): MatchResult[] {
  const picked: MatchResult[] = [];
  const used = new Map<string, number>();
  for (const result of ranked) {
    if (picked.length === count) break;
    const seen = used.get(result.model.brand) ?? 0;
    if (seen >= perBrand) continue;
    picked.push(result);
    used.set(result.model.brand, seen + 1);
  }
  return picked;
}

/* -------------------------------------------------------------------------- */
/* Recommandation                                                             */
/* -------------------------------------------------------------------------- */

const MIN_SCORE = 46;

/**
 * Moteur principal : classe le catalogue selon les réponses, sépare les modèles
 * exploitables des modèles écartés (et explique chaque exclusion).
 */
export function recommend(answers: Answers): Advice {
  const criteria = readCriteria(answers);
  const scored = FULL_CATALOG.map((model) => score(model, criteria)).sort((a, b) => b.score - a.score);
  const usable = scored.filter((result) => result.blockers.length === 0 && result.score >= MIN_SCORE);

  const matches = pickDiverse(usable, 4);
  const alternates = pickDiverse(
    usable.filter((result) => !matches.includes(result)),
    3,
  );

  const pending = availabilityNotes(answers, criteria, matches);
  pending.push(`Versions annuelles : les modèles sont renouvelés, vérifiez la référence en cours sur le site de la marque.`);
  pending.push(
    "Poids, drop et prix affichés sont des ordres de grandeur (pointure de référence et prix distributeur) : à vérifier avant achat.",
  );

  return {
    matches,
    alternates,
    excluded: scored.filter((result) => result.blockers.length > 0 || result.score < MIN_SCORE).slice(0, 6),
    summary: summaryOf(answers),
    pending,
  };
}

function availabilityNotes(answers: Answers, criteria: Criteria, matches: MatchResult[]): string[] {
  const notes: string[] = [];

  if (!isAnswered(answers, "appui") && !criteria.douleurs)
    notes.push("Appui non renseigné : le classement suppose un appui neutre.");
  if (criteria.appui === "inconnu")
    notes.push("Appui non déterminé : faites analyser votre foulée en magasin spécialisé avant d'acheter.");
  if (!isAnswered(answers, "pied") && !criteria.douleurs)
    notes.push("Particularités du pied non renseignées : la largeur du chaussant n'a pas pu être ajustée.");
  if (!isAnswered(answers, "budget"))
    notes.push("Budget non renseigné : les modèles proposés ne sont pas filtrés par le prix.");
  if (criteria.exigences.length === 0)
    notes.push("Aucune contrainte forte sélectionnée : vegan, fabrication européenne et réparabilité n'ont pas été vérifiées.");
  if (criteria.pied.includes("orthopedie"))
    notes.push("Semelles orthopédiques : validez le volume intérieur avec votre podologue ou en magasin.");
  if (criteria.douleurs)
    notes.push("Douleurs récurrentes : faites confirmer l'origine par un professionnel de santé avant de choisir un modèle.");

  notes.push(
    `Disponibilité : aucun stock n'est consulté par cet outil. Les lignes du catalogue ont été vérifiées le ${CATALOG_CHECKED_ON}, mais la présence en rayon, la pointure et le prix du jour restent à confirmer chez le distributeur.`,
  );
  if (criteria.disponibilite === "magasin-large")
    notes.push(
      "Vous voulez acheter en magasin : les pointures larges sont rarement stockées. Appelez le point de vente avec la référence exacte avant de vous déplacer.",
    );
  if (criteria.disponibilite === "en-ligne")
    notes.push(
      "Achat en ligne : commandez deux pointures si le retour est gratuit, et vérifiez la durée de retour du marchand (14 jours de rétractation légale au minimum en Europe).",
    );
  if (!isAnswered(answers, "disponibilite"))
    notes.push("Canal d'achat non précisé : la sélection n'a pas écarté les lignes au réseau de vente très étroit.");

  const light = criteria.usages.some((usage) => LIGHT_USAGES.includes(usage));
  const heavy = criteria.usages.some((usage) => HEAVY_USAGES.includes(usage));
  if (light && heavy)
    notes.push(
      "Vous cumulez un usage urbain et un usage de sentier : aucune paire ne fait parfaitement les deux, le classement privilégie donc la polyvalence. Deux paires séparées resteront plus confortables qu'un compromis unique.",
    );
  if (criteria.terrains.includes("asphalte") && criteria.terrains.includes("sentiers"))
    notes.push(
      "Asphalte et sentiers demandent des semelles opposées (usure rapide d'un côté, accroche insuffisante de l'autre) : les modèles retenus sont des compromis, à arbitrer selon le terrain dominant.",
    );

  if (matches.length > 0 && matches.every((result) => MAINSTREAM_BRANDS.has(result.model.brand)))
    notes.push(
      "Les modèles les mieux classés appartiennent tous aux marques les plus connues. Des lignes moins répandues existent (Hanwag, Meindl, Alt-Berg, Paraboot, NNormal, inov-8, Novesta, Karhu…) : elles sortent de la sélection dès que vous demandez un achat en magasin généraliste.",
    );

  return notes;
}

/* -------------------------------------------------------------------------- */
/* Export Markdown                                                            */
/* -------------------------------------------------------------------------- */

export function resultToMarkdown(result: MatchResult): string {
  const { model } = result;
  const spec = [
    supportText(model.support),
    `amorti ${cushionLabel(model.cushioning)}`,
    model.dropMm === null ? "drop à vérifier" : `drop ≈ ${model.dropMm} mm`,
    model.weightG === null ? "poids à vérifier" : `poids ≈ ${model.weightG} g (à vérifier selon la pointure)`,
    model.waterproof === "membrane"
      ? `étanche (${model.membrane ?? "membrane"})`
      : model.waterproof === "traitement"
        ? "déperlant"
        : model.waterproof === "a-verifier"
          ? "étanchéité à vérifier"
          : "non étanche",
    model.wideFit ? "largeurs larges" : "largeur standard",
  ].join(", ");

  const lines = [
    `### ${modelName(model)} — score ${result.score}/100`,
    "",
    `- **Pourquoi** : ${result.strengths.join(" ; ")}`,
    `- **Caractéristiques** : ${spec}`,
    `- **Prix indicatif** : ${model.priceEur[0]} à ${model.priceEur[1]} € environ (à vérifier chez le distributeur)`,
    `- **Disponibilité** : ${availabilityNote(model)}`,
  ];
  if (result.cautions.length > 0) lines.push(`- **Limites / vigilance** : ${result.cautions.join(" ; ")}`);
  const site = brandSite(model);
  lines.push(
    `- **À vérifier avant achat** : version en cours, pointure et largeur disponible — ${modelSearchUrl(model)}${site ? ` (site de la marque : ${site})` : ""}`,
  );
  return lines.join("\n");
}

/** Récapitulatif Markdown complet, copiable depuis l'interface. */
export function adviceToMarkdown(answers: Answers, advice: Advice): string {
  const blocks: string[] = [
    "# Récapitulatif — choix de chaussures",
    "",
    `_Généré par l'assistant. ${WEAR_NOTE}_`,
    "",
    "## Ce que j'ai compris",
    "",
    ...advice.summary.map((item) => `- **${item.label}** : ${item.value}`),
    "",
    "## Modèles proposés",
    "",
    ...advice.matches.map(resultToMarkdown),
  ];

  if (advice.alternates.length > 0) {
    blocks.push("", "## Également compatibles", "");
    for (const alt of advice.alternates) {
      blocks.push(`- **${modelName(alt.model)}** (score ${alt.score}/100) : ${alt.strengths.slice(0, 2).join(" ; ")}`);
    }
  }

  if (advice.excluded.length > 0) {
    blocks.push("", "## Modèles écartés et pourquoi", "");
    for (const item of advice.excluded) {
      const reason =
        item.blockers.length > 0
          ? item.blockers.join(" ; ")
          : `score trop faible (${item.score}/100) pour votre profil`;
      blocks.push(`- **${modelName(item.model)}** : ${reason}`);
    }
  }

  blocks.push("", "## Disponibilité", "", `- ${DIVERSITY_NOTE}`);
  for (const result of advice.matches) {
    blocks.push(`- **${modelName(result.model)}** : ${availabilityNote(result.model)}`);
  }

  if (advice.tryOn && advice.tryOn.length > 0)
    blocks.push("", "## Comment essayer", "", ...advice.tryOn.map((item) => `- ${item}`));
  if (advice.professional && advice.professional.length > 0)
    blocks.push("", "## Points à faire valider par un professionnel", "", ...advice.professional.map((item) => `- ${item}`));

  blocks.push("", "## Données à vérifier (non garanties)", "", ...advice.pending.map((item) => `- ${item}`));
  blocks.push(
    "",
    "## Méthode et limites",
    "",
    "- Classement déterministe sur des critères explicites : usages et terrains déclarés, appui, amorti, chaussant, contraintes (budget, vegan, Europe, réparabilité), style, disponibilité.",
    "- Le score est un indice de correspondance avec vos réponses, pas une note de qualité de la chaussure.",
    `- Catalogue vérifié le ${CATALOG_CHECKED_ON}. ${WEAR_NOTE}`,
    "- Cet assistant ne remplace ni un avis médical ni un essai en magasin.",
  );

  return blocks.join("\n");
}

/** Type d'appui lisible, utilisé par l'export Markdown. */
export function supportText(support: Support): string {
  return support === "stabilite" ? "stabilité" : "neutre";
}
