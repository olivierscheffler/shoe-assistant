/**
 * Catalogue du conseiller chaussures : types, questionnaire et lignes de modèles
 * réellement commercialisées. C'est ici que vit la donnée, pas la décision.
 *
 * - le scoring et la composition de la réponse sont dans `src/lib/shoe-advisor.ts` ;
 * - les lignes ajoutées hors grandes marques et les métadonnées de disponibilité sont
 *   dans `src/lib/shoe-catalog-extra.ts`.
 *
 * ⚠️ La fin de ce fichier — helpers de disponibilité insérés puis remplacés, et moteur
 * mono-profil historique — n'est plus utilisée par l'application. La référence de calcul
 * est `src/lib/shoe-advisor.ts` : ne modifiez pas la fin du fichier pour changer le
 * comportement du produit.
 *
 * Règles de données (voir PROMPT.md) :
 * - aucune marque ni aucun modèle inventé : uniquement des lignes de modèles existantes
 *   et suivies, sans numéro de version quand celui-ci change chaque année ;
 * - toute valeur chiffrée est *indicative* et affichée avec « ≈ » ;
 * - une valeur inconnue vaut `null` et s'affiche « à vérifier » plutôt qu'être devinée.
 *
 * Ce fichier est du TypeScript pur (aucun import React / DOM) : il est utilisé à la fois
 * par le front et par les fonctions Convex.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Usage =
  | "urbain"
  | "marche"
  | "rando"
  | "rando-soutenue"
  | "trail"
  | "lifestyle";

export type Terrain = "asphalte" | "chemins" | "sentiers" | "mixte";

export type Style = "discret" | "sport" | "street" | "outdoor";

export type Support = "neutre" | "stabilite";

/**
 * Largeur du réseau de vente d'une ligne de modèle. C'est la seule information de
 * disponibilité vérifiable sans accès aux stocks : elle dit où la paire se trouve
 * réellement, pas si votre pointure est en rayon aujourd'hui.
 */
export type Availability = "large" | "specialisee" | "restreinte";

/** Permanence de la ligne dans le catalogue de la marque. */
export type LineStatus = "permanente" | "renouvelee" | "edition";

export type QuestionId =
  | "usage"
  | "terrain"
  | "volume"
  | "meteo"
  | "essayage"
  | "appui"
  | "pied"
  | "serrage"
  | "poids"
  | "budget"
  | "disponibilite"
  | "exigences"
  | "style"
  | "priorite";

/** Une réponse est toujours une valeur d'option, ou la liste des valeurs cochées. */
export type Answers = Partial<Record<QuestionId, string | string[]>>;

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
  /**
   * Option qui exclut les autres dans une question à choix multiple (« un peu des
   * trois » et « sec » n'ont pas de sens additionnés à autre chose).
   */
  exclusive?: boolean;
}

export interface Question {
  id: QuestionId;
  label: string;
  help?: string;
  multiple?: boolean;
  options: QuestionOption[];
}

export interface Step {
  id: string;
  title: string;
  intro: string;
  questions: QuestionId[];
}

export interface ShoeModel {
  id: string;
  brand: string;
  /** Ligne de modèle, sans numéro de version (ex. « Bondi »). */
  line: string;
  /** Version annuelle connue, ou `null` si elle change trop souvent pour être garantie. */
  version: string | null;
  category: "marche" | "rando" | "trail" | "lifestyle";
  usages: Usage[];
  terrains: Terrain[];
  support: Support;
  /** 1 = amorti minimal, 5 = amorti maximal. */
  cushioning: 1 | 2 | 3 | 4 | 5;
  dropMm: number | null;
  /** Poids approximatif d'une chaussure, taille 42 homme. */
  weightG: number | null;
  /** Existe en version large (2E / 4E) ou chaussant réputé large. */
  wideFit: boolean;
  waterproof: "aucune" | "traitement" | "membrane" | "a-verifier";
  membrane: string | null;
  orthotic: "compatible" | "a-tester" | "deconseille";
  vegan: "oui" | "options" | "non" | "a-verifier";
  madeInEurope: "oui" | "partiel" | "non" | "a-verifier";
  /** `true` = réparable chez un cordonnier ; « a-verifier » = montage non documenté ici. */
  repairable: boolean | "a-verifier";
  /**
   * Où la ligne se vend réellement, et depuis combien de temps elle existe. Chaque ligne
   * doit le déclarer : c'est ce qui permet d'écarter les modèles introuvables là où
   * l'utilisateur compte acheter.
   */
  availability: Availability;
  lineStatus: LineStatus;
  /** Fourchette de prix indicative en euros, à vérifier chez le distributeur. */
  priceEur: [number, number];
  style: Style[];
  highlights: string[];
  caveats: string[];
}

export interface MatchResult {
  model: ShoeModel;
  score: number;
  verdict: "excellent" | "bon" | "possible" | "ecarte";
  strengths: string[];
  cautions: string[];
  blockers: string[];
}

export interface Advice {
  matches: MatchResult[];
  alternates: MatchResult[];
  excluded: MatchResult[];
  summary: { label: string; value: string }[];
  pending: string[];
  /**
   * Déroulé d'essai conseillé, adapté au lieu d'achat déclaré, et points qui
   * relèvent d'un professionnel de santé. Complétés par `src/lib/advice.ts`,
   * qui assemble la réponse finale : le noyau de scoring de ce fichier ne les
   * produit pas.
   */
  tryOn?: string[];
  professional?: string[];
}

/* -------------------------------------------------------------------------- */
/* Questionnaire                                                              */
/* -------------------------------------------------------------------------- */

export const QUESTIONS: Record<QuestionId, Question> = {
  usage: {
    id: "usage",
    label: "Usages prévus",
    help: "Plusieurs choix possibles : une paire peut servir en ville la semaine et sur les chemins le week-end. Plus vous cochez d'usages éloignés, plus le classement privilégiera la polyvalence.",
    multiple: true,
    options: [
      { value: "urbain", label: "Marche quotidienne en ville", hint: "Trajets, courses, station debout" },
      { value: "marche", label: "Marche active", hint: "Sorties longues, 5 à 15 km" },
      { value: "rando", label: "Randonnée loisir", hint: "Chemins, balades, demi-journée" },
      { value: "rando-soutenue", label: "Randonnée soutenue", hint: "Dénivelé, sac, journée entière" },
      { value: "trail", label: "Sentiers et trail", hint: "Terrain technique, racines, pierres" },
      { value: "lifestyle", label: "Surtout le style", hint: "Sneakers portées au quotidien", exclusive: true },
    ],
  },
  terrain: {
    id: "terrain",
    label: "Terrains fréquentés",
    help: "Plusieurs choix possibles : cochez tout ce que vous foulez réellement, pas seulement le terrain dominant.",
    multiple: true,
    options: [
      { value: "asphalte", label: "Asphalte et trottoir" },
      { value: "chemins", label: "Chemins de terre et gravier" },
      { value: "sentiers", label: "Sentiers techniques et pierreux" },
      { value: "mixte", label: "Un peu des trois", exclusive: true },
    ],
  },
  volume: {
    id: "volume",
    label: "Distance par semaine",
    options: [
      { value: "moins-5", label: "Moins de 5 km" },
      { value: "5-15", label: "5 à 15 km" },
      { value: "15-30", label: "15 à 30 km" },
      { value: "plus-30", label: "Plus de 30 km" },
    ],
  },
  meteo: {
    id: "meteo",
    label: "Météo habituelle",
    help: "Plusieurs choix possibles.",
    multiple: true,
    options: [
      { value: "sec", label: "Plutôt sec", exclusive: true },
      { value: "pluie", label: "Pluie fréquente" },
      { value: "froid-neige", label: "Froid, boue ou neige" },
    ],
  },
  essayage: {
    id: "essayage",
    label: "Où essayez-vous vos chaussures",
    help: "Cela change la façon de sécuriser la pointure : essayage direct ou commande avec retour.",
    options: [
      { value: "magasin", label: "En magasin spécialisé", hint: "Essayage direct, conseil sur place" },
      { value: "en-ligne", label: "En ligne, avec retour possible", hint: "Prix souvent plus bas, pointure à sécuriser" },
      { value: "les-deux", label: "Les deux" },
    ],
  },
  appui: {
    id: "appui",
    label: "Appui et pronation",
    help: "Un seul choix : un pied ne pronateur pas et ne supine pas en même temps. En cas de doute, répondez « je ne sais pas » — nous vous dirons quoi vérifier.",
    options: [
      { value: "neutre", label: "Neutre", hint: "Usure régulière sous la semelle" },
      { value: "pronation", label: "Pronation", hint: "Le pied s'affaisse vers l'intérieur" },
      { value: "supination", label: "Supination", hint: "Appui sur le bord extérieur" },
      { value: "inconnu", label: "Je ne sais pas" },
    ],
  },
  pied: {
    id: "pied",
    label: "Particularités du pied",
    help: "Plusieurs choix possibles, ou aucun. Les douleurs se cumulent avec n'importe quel appui.",
    multiple: true,
    options: [
      { value: "large", label: "Pied large" },
      { value: "etroit", label: "Pied étroit" },
      { value: "volume-eleve", label: "Dessus du pied haut" },
      { value: "hallux", label: "Hallux valgus" },
      { value: "ampoules", label: "Ampoules fréquentes" },
      { value: "douleurs", label: "Douleurs récurrentes", hint: "Talon, voûte, tibia" },
      { value: "orthopedie", label: "Semelles orthopédiques" },
    ],
  },
  serrage: {
    id: "serrage",
    label: "L'avant du pied à l'essai",
    help: "Un avant-pied comprimé est la première cause d'ampoules et d'ongles douloureux.",
    options: [
      { value: "jamais", label: "Jamais serré", hint: "Le pied est à l'aise à l'avant" },
      { value: "parfois", label: "Parfois, selon les modèles" },
      { value: "souvent", label: "Souvent comprimé", hint: "Orteils tassés, ongles sensibles" },
      { value: "inconnu", label: "Je ne sais pas" },
    ],
  },
  poids: {
    id: "poids",
    label: "Poids corporel approximatif",
    help: "Une tranche suffit : il influence le besoin d'amorti.",
    options: [
      { value: "moins-60", label: "Moins de 60 kg" },
      { value: "60-80", label: "60 à 80 kg" },
      { value: "80-95", label: "80 à 95 kg" },
      { value: "plus-95", label: "Plus de 95 kg" },
    ],
  },
  budget: {
    id: "budget",
    label: "Budget maximum",
    options: [
      { value: "moins-80", label: "Moins de 80 €" },
      { value: "80-130", label: "80 à 130 €" },
      { value: "130-180", label: "130 à 180 €" },
      { value: "180-plus", label: "Au-delà de 180 €", hint: "Si c'est justifié" },
      { value: "flexible", label: "Le prix n'est pas un frein" },
    ],
  },
  disponibilite: {
    id: "disponibilite",
    label: "Comment et quand acheter",
    help: "Aucun stock n'est consulté ici : cette réponse sert à écarter les modèles qu'on ne trouve que dans un réseau très étroit, et à vous dire où les chercher.",
    options: [
      {
        value: "magasin-large",
        label: "Tout de suite, en grande enseigne",
        hint: "Chaînes de sport et de chaussures, centre commercial",
      },
      {
        value: "magasin-specialiste",
        label: "Prêt à aller en magasin spécialisé",
        hint: "Randonnée ou running, quitte à faire quelques kilomètres",
      },
      {
        value: "en-ligne",
        label: "En ligne, commande et livraison",
        hint: "Y compris directement chez la marque",
      },
      {
        value: "attendre",
        label: "Je peux attendre un réassort",
        hint: "Y compris les modèles peu distribués",
      },
    ],
  },
  exigences: {
    id: "exigences",
    label: "Contraintes à respecter",
    help: "Plusieurs choix possibles. Le vegan est éliminatoire : un modèle en cuir ou en laine sera écarté. Les autres exigences pèsent dans le classement et restent visibles dans les réserves.",
    multiple: true,    options: [
      { value: "vegan", label: "Vegan", hint: "Aucune matière animale" },
      { value: "europe", label: "Fabrication européenne" },
      { value: "durabilite", label: "Réparable, semelle durable" },
      { value: "leger", label: "Poids léger" },
      { value: "discret", label: "Look discret et intemporel" },
    ],
  },
  style: {
    id: "style",
    label: "Style attendu",
    options: [
      { value: "discret", label: "Discret et sobre" },
      { value: "sport", label: "Sportif" },
      { value: "street", label: "Streetwear" },
      { value: "outdoor", label: "Outdoor" },
      { value: "indifferent", label: "Peu importe" },
    ],
  },
  priorite: {
    id: "priorite",
    label: "Attente prioritaire",
    help: "Sert d'arbitrage quand deux modèles obtiennent un score proche, pas de bonus caché.",
    options: [
      { value: "confort", label: "Confort immédiat" },
      { value: "durabilite", label: "Durabilité" },
      { value: "legerete", label: "Légèreté" },
      { value: "maintien", label: "Maintien du pied" },
      { value: "esthetique", label: "Esthétique" },
    ],
  },
};

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

export function optionLabel(id: QuestionId, value: string): string {
  const option = QUESTIONS[id].options.find((o) => o.value === value);
  return option ? option.label : value;
}

export function answerValues(answers: Answers, id: QuestionId): string[] {
  const value = answers[id];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function answerText(answers: Answers, id: QuestionId): string {
  const values = answerValues(answers, id);
  if (values.length === 0) return "non précisé";
  return values.map((v) => optionLabel(id, v)).join(", ");
}

export function isAnswered(answers: Answers, id: QuestionId): boolean {
  return answerValues(answers, id).length > 0;
}

/** Récapitulatif lisible des réponses, utilisé par l'interface et l'export .md. */
export function summaryOf(answers: Answers): { label: string; value: string }[] {
  return QUESTION_ORDER.map((id) => ({
    label: QUESTIONS[id].label,
    value: answerText(answers, id),
  }));
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

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

/** Site de la marque, ou `null` quand il n'est pas vérifié (l'appelant retombe sur la recherche). */
export function brandSite(model: ShoeModel): string | null {
  return BRAND_SITES[model.brand] ?? null;
}

export function modelName(model: ShoeModel): string {
  return model.version ? `${model.brand} ${model.version}` : `${model.brand} ${model.line}`;
}

/** Lien de recherche : toujours valide, il laisse l'utilisateur vérifier la version en cours. */
export function modelSearchUrl(model: ShoeModel): string {
  return `https://www.google.com/search?q=${encodeURIComponent(modelName(model))}`;
}

export const WEAR_NOTE =
  "Données indicatives : les lignes de modèles sont renouvelées chaque année, le poids varie avec la pointure et les prix changent selon le distributeur. Vérifiez la fiche produit avant achat.";

export const CATALOG: ShoeModel[] = [
  /* ---------------------------------------------------------------- marche */
  {
    id: "hoka-bondi",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "HOKA",
    line: "Bondi",
    version: "Bondi 9",
    category: "marche",
    usages: ["urbain", "marche", "lifestyle"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 5,
    dropMm: 4,
    weightG: 297,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [170, 200],
    style: ["sport", "street"],
    highlights: [
      "Amorti maximal : la référence pour rester debout et marcher longtemps sur dur",
      "Base large et rocker qui accompagnent le déroulé du pas",
    ],
    caveats: [
      "Semelle très épaisse : peu de sensation du terrain",
      "Peu de maintien latéral sur sentier irrégulier",
    ],
  },
  {
    id: "hoka-clifton",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "HOKA",
    line: "Clifton",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 4,
    dropMm: 5,
    weightG: 250,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["sport", "street"],
    highlights: [
      "Bon compromis amorti / poids pour la marche quotidienne",
      "Chaussant plutôt généreux à l'avant",
    ],
    caveats: ["Durabilité moyenne si vous marchez beaucoup sur gravier"], // PROBE_C
  },
  {
    id: "hoka-gaviota",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "HOKA",
    line: "Gaviota",
    version: "Gaviota 5",
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 5,
    dropMm: 6,
    weightG: 300,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [160, 185],
    style: ["sport"],
    highlights: [
      "Amorti maximal et renfort de stabilité : rare combinaison",
      "Adaptée aux longues stations debout avec pronation",
    ],
    caveats: ["Chaussure haute et large, moins discrète en ville"],
  },
  {
    id: "hoka-arahi",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "HOKA",
    line: "Arahi",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 4,
    dropMm: 5,
    weightG: 277,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["sport"],
    highlights: ["Renfort de stabilité plus souple que les modèles traditionnels", "Assez légère pour la marche urbaine"],
    caveats: ["Stabilité plus légère que celle d'un modèle dit « motion control »"],
  },
  {
    id: "brooks-ghost",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Brooks",
    line: "Ghost",
    version: null,
    category: "marche",
    usages: ["urbain", "marche", "lifestyle"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 4,
    dropMm: 12,
    weightG: 283,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 160],
    style: ["sport", "street"],
    highlights: [
      "Valeur sûre de la marche et de la course facile, très disponible en magasin",
      "Existe en largeurs multiples et en version imperméable",
    ],
    caveats: ["Drop élevé (12 mm) : peut ne pas convenir si vous cherchez un appui bas"],
  },
  {
    id: "brooks-glycerin",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Brooks",
    line: "Glycerin",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 5,
    dropMm: 10,
    weightG: 290,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [170, 190],
    style: ["sport"],
    highlights: ["Amorti moelleux et très bon confort immédiat", "Tige confortable, peu d'échauffements"],
    caveats: ["Moins stable si vous avez besoin de rigidité"],
  },
  {
    id: "brooks-adrenaline-gts",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Brooks",
    line: "Adrenaline GTS",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 4,
    dropMm: 12,
    weightG: 275,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 160],
    style: ["sport"],
    highlights: [
      "Renfort de stabilité discret, qui ne force pas le pied",
      "Disponible en plusieurs largeurs, dont version imperméable",
    ],
    caveats: ["Le drop de 12 mm convient moins aux utilisateurs habitués à un appui bas"],
  },
  {
    id: "asics-nimbus",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "ASICS",
    line: "GEL-Nimbus",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 5,
    dropMm: 8,
    weightG: 290,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [180, 210],
    style: ["sport"],
    highlights: [
      "Amorti maximal très apprécié sur bitume et longues marches",
      "Renouvellement annuel : les versions précédentes restent un bon achat soldé",
    ],
    caveats: ["Prix élevé au lancement"],
  },
  {
    id: "asics-cumulus",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "ASICS",
    line: "GEL-Cumulus",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 4,
    dropMm: 8,
    weightG: 280,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 160],
    style: ["sport"],
    highlights: ["Polyvalente et confortable dès la sortie du carton", "Bon rapport amorti / prix"],
    caveats: ["Semelle extérieure qui s'use vite sur gravier abrasif"],
  },
  {
    id: "asics-kayano",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "ASICS",
    line: "GEL-Kayano",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 4,
    dropMm: 10,
    weightG: 300,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [180, 210],
    style: ["sport"],
    highlights: [
      "Le modèle de stabilité le plus régulier du marché, décliné en largeurs",
      "Maintien du talon solide, rassurant en cas de pronation",
    ],
    caveats: ["Chaussure plus lourde et plus directrice qu'un modèle neutre"],
  },
  {
    id: "saucony-triumph",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Saucony",
    line: "Triumph",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 5,
    dropMm: 10,
    weightG: 280,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [180, 210],
    style: ["sport"],
    highlights: ["Amorti généreux et progressif, très confortable sur longue distance", "Tige douce, peu de coutures génantes"],
    caveats: ["Prix en hausse à chaque génération"],
  },
  {
    id: "saucony-guide",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Saucony",
    line: "Guide",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 3,
    dropMm: 6,
    weightG: 280,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["sport"],
    highlights: ["Stabilité par la géométrie de la semelle, sans bloc dur", "Drop modéré, adapté aux appuis bas"],
    caveats: ["Amorti juste pour un usage intensif au-delà de 90 kg"],
  },
  {
    id: "nb-1080",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "New Balance",
    line: "Fresh Foam X 1080",
    version: "v14",
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 5,
    dropMm: 6,
    weightG: 295,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "partiel",
    repairable: false,
    priceEur: [180, 210],
    style: ["sport", "discret"],
    highlights: [
      "Amorti maximal, tailles larges largement distribuées",
      "Une partie de la production New Balance est assurée en Europe (séries « Made in UK / EU »)",
    ],
    caveats: ["Chaussant parfois étroit à l'avant en largeur standard"],
  },
  {
    id: "nb-860",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "New Balance",
    line: "Fresh Foam X 860",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 4,
    dropMm: 10,
    weightG: 290,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["sport"],
    highlights: ["Stabilité efficace disponible en 2E et 4E", "Semelle tolérante pour les longues stations debout"],
    caveats: ["Peu d'options imperméables"],
  },
  {
    id: "mizuno-wave-rider",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Mizuno",
    line: "Wave Rider",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 4,
    dropMm: 12,
    weightG: 270,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["sport"],
    highlights: ["Semelle durable, très bon maintien pour un modèle neutre", "Poids contenu"],
    caveats: ["Drop élevé et sensation de semelle plus ferme qu'un amorti maximal"],
  },
  {
    id: "mizuno-wave-inspire",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Mizuno",
    line: "Wave Inspire",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 4,
    dropMm: 12,
    weightG: 290,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["sport"],
    highlights: ["Renfort anti-pronation sur toute la longueur", "Très bonne longévité de semelle"],
    caveats: ["Drop de 12 mm à tester si vous êtes sensible du mollet"],
  },
  {
    id: "nike-pegasus",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Nike",
    line: "Air Zoom Pegasus",
    version: null,
    category: "marche",
    usages: ["urbain", "marche", "lifestyle"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 3,
    dropMm: 10,
    weightG: 285,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [130, 145],
    style: ["sport", "street"],
    highlights: ["Très répandue : facile à essayer en magasin et souvent soldée", "Polyvalente pour la marche urbaine"],
    caveats: ["Chaussant plutôt étroit, pas de version large en Europe", "Amorti moyen pour de longues distances"],
  },
  {
    id: "nike-structure",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Nike",
    line: "Air Zoom Structure",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 3,
    dropMm: 8,
    weightG: 300,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [130, 150],
    style: ["sport"],
    highlights: ["Renfort de stabilité au prix le plus accessible du catalogue", "Bonne accroche sur bitume humide"],
    caveats: ["Pas de version large, amorti moyen"],
  },
  {
    id: "nike-vomero",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Nike",
    line: "Vomero",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 5,
    dropMm: 10,
    weightG: 310,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [160, 180],
    style: ["sport", "street"],
    highlights: ["Amorti maximal très souple, agréable en marche urbaine", "Look reconnaissable, porté au quotidien"],
    caveats: ["Chaussant étroit et pas de version large", "Semelle épaisse, moins de sensations"],
  },
  {
    id: "on-cloudmonster",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "On",
    line: "Cloudmonster",
    version: null,
    category: "marche",
    usages: ["urbain", "marche", "lifestyle"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 4,
    dropMm: 6,
    weightG: 280,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [170, 190],
    style: ["sport", "street"],
    highlights: ["Très bon compromis confort / style pour la marche urbaine", "Semelle à modules qui garde du dynamisme"],
    caveats: ["Rigidité inhabituelle si vous venez d'une semelle classique"],
  },
  {
    id: "on-cloud",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "On",
    line: "Cloud",
    version: null,
    category: "lifestyle",
    usages: ["urbain", "lifestyle"],
    terrains: ["asphalte"],
    support: "neutre",
    cushioning: 2,
    dropMm: 8,
    weightG: 250,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [150, 170],
    style: ["discret", "street"],
    highlights: ["Sneaker discrète, facile à porter avec tout", "Confortable pour la marche quotidienne légère"],
    caveats: ["Ce n'est pas une chaussure d'endurance : s'écrase vite au-delà de 15 km par semaine"],
  },
  {
    id: "altra-paradigm",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "Altra",
    line: "Paradigm",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "stabilite",
    cushioning: 5,
    dropMm: 0,
    weightG: 280,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "deconseille",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [170, 190],
    style: ["sport"],
    highlights: [
      "Amorti maximal à drop nul et avant-pied large : la meilleure option si vos orteils sont comprimés",
      "Renfort de stabilité latéral plus tolérant qu'un bloc dur",
    ],
    caveats: [
      "Drop nul : transition à faire progressivement, douleurs possibles au mollet au début",
      "Conçue pour un pied nu dans la chaussure, peu adaptée aux semelles orthopédiques épaisses",
    ],
  },
  {
    id: "topo-phantom",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "Topo Athletic",
    line: "Phantom",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 3,
    dropMm: 5,
    weightG: 260,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [160, 180],
    style: ["sport"],
    highlights: [
      "Avant-pied anatomique large, très efficace contre les ampoules entre les orteils",
      "Légère pour son volume",
    ],
    caveats: ["Moins de maintien sur terrain irrégulier", "Distribution plus limitée en France"],
  },
  {
    id: "mephisto-match",
    availability: "large",
    lineStatus: "permanente",
    brand: "Mephisto",
    line: "Match",
    version: null,
    category: "marche",
    usages: ["urbain", "marche"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 3,
    dropMm: null,
    weightG: null,
    wideFit: true,
    waterproof: "traitement",
    membrane: null,
    orthotic: "compatible",
    vegan: "non",
    madeInEurope: "partiel",
    repairable: true,
    priceEur: [200, 250],
    style: ["discret"],
    highlights: [
      "Chaussure de marche classique, cuir, réparable et ressemblable chez le cordonnier",
      "Une partie de la production Mephisto est européenne (France, Suisse)",
    ],
    caveats: ["Style daté pour certains, prix élevé", "Pas de matière vegan"],
  },

  /* ----------------------------------------------------------------- rando */
  {
    id: "salomon-x-ultra-5",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Salomon",
    line: "X Ultra 5 GTX",
    version: null,
    category: "rando",
    usages: ["rando", "marche", "urbain"],
    terrains: ["chemins", "sentiers", "mixte"],
    support: "stabilite",
    cushioning: 3,
    dropMm: 11,
    weightG: 390,
    wideFit: false,
    waterproof: "membrane",
    membrane: "GORE-TEX",
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [150, 180],
    style: ["outdoor", "sport"],
    highlights: [
      "Maintien du pied et accroche excellent sur chemins et sentiers",
      "Version GORE-TEX étanche, efficace en pluie et boue",
    ],
    caveats: [
      "Chaussant ajusté : à essayer, surtout en pied large",
      "Une membrane réduit la respirabilité en été",
    ],
  },
  {
    id: "salomon-x-ultra-5-mid",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Salomon",
    line: "X Ultra 5 Mid GTX",
    version: null,
    category: "rando",
    usages: ["rando", "rando-soutenue"],
    terrains: ["chemins", "sentiers", "mixte"],
    support: "stabilite",
    cushioning: 3,
    dropMm: 11,
    weightG: 430,
    wideFit: false,
    waterproof: "membrane",
    membrane: "GORE-TEX",
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [180, 210],
    style: ["outdoor"],
    highlights: [
      "Tige montante : cheville maintenue avec sac et dénivelé",
      "Étanche et accrocheuse, référence des randonnées à la journée",
    ],
    caveats: ["Plus lourde et plus chaude qu'une version basse", "Chaussant serré en pied large"],
  },
  {
    id: "salomon-x-ultra-360",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "Salomon",
    line: "X Ultra 360 GTX",
    version: null,
    category: "rando",
    usages: ["rando", "urbain"],
    terrains: ["chemins", "asphalte"],
    support: "stabilite",
    cushioning: 2,
    dropMm: 11,
    weightG: 400,
    wideFit: false,
    waterproof: "membrane",
    membrane: "membrane maison",
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [130, 150],
    style: ["outdoor"],
    highlights: ["Point d'entrée de la gamme randonnée Salomon, étanche", "Assez sobre pour la ville et les balades"],
    caveats: ["Semelle plus ferme que la gamme X Ultra 5", "Chaussant étroit"],
  },
  {
    id: "merrell-moab",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Merrell",
    line: "Moab",
    version: null,
    category: "rando",
    usages: ["rando", "urbain"],
    terrains: ["chemins", "sentiers", "asphalte"],
    support: "neutre",
    cushioning: 2,
    dropMm: 11,
    weightG: 420,
    wideFit: true,
    waterproof: "membrane",
    membrane: "membrane maison (selon version)",
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [120, 150],
    style: ["outdoor"],
    highlights: [
      "Déclinée en version ventilée ou imperméable, et en tailles larges",
      "Confort immédiat, très peu de rodage, largement distribuée",
    ],
    caveats: [
      "Semelle souple : moins de maintien avec un sac lourd",
      "Amorti modeste pour de longues journées sur dur",
    ],
  },
  {
    id: "merrell-moab-speed",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Merrell",
    line: "Moab Speed 2 GTX",
    version: null,
    category: "rando",
    usages: ["rando", "marche", "urbain"],
    terrains: ["chemins", "sentiers", "mixte"],
    support: "neutre",
    cushioning: 3,
    dropMm: 8,
    weightG: 350,
    wideFit: true,
    waterproof: "membrane",
    membrane: "GORE-TEX",
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 170],
    style: ["outdoor", "sport"],
    highlights: ["Plus légère et plus amortissante que la Moab classique", "Étanche, bon compromis marche rapide et rando"],
    caveats: ["Moins durable que le cuir sur un usage très intensif"],
  },
  {
    id: "keen-targhee",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "Keen",
    line: "Targhee",
    version: null,
    category: "rando",
    usages: ["rando", "urbain"],
    terrains: ["chemins", "sentiers", "asphalte"],
    support: "neutre",
    cushioning: 2,
    dropMm: 11,
    weightG: 450,
    wideFit: true,
    waterproof: "membrane",
    membrane: "membrane maison",
    orthotic: "compatible",
    vegan: "non",
    madeInEurope: "non",
    repairable: false,
    priceEur: [150, 180],
    style: ["outdoor"],
    highlights: [
      "Bout renforcé et avant-pied large : référence pour les pieds larges et les orteils sensibles",
      "Bonne protection sur sentier caillouteux",
    ],
    caveats: ["Chaussure lourde", "Cuir : pas de version vegan sur cette ligne"],
  },
  {
    id: "lowa-renegade",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "Lowa",
    line: "Renegade GTX Mid",
    version: null,
    category: "rando",
    usages: ["rando", "rando-soutenue"],
    terrains: ["chemins", "sentiers", "mixte"],
    support: "stabilite",
    cushioning: 2,
    dropMm: 12,
    weightG: 480,
    wideFit: true,
    waterproof: "membrane",
    membrane: "GORE-TEX",
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "partiel",
    repairable: true,
    priceEur: [190, 230],
    style: ["outdoor", "discret"],
    highlights: [
      "Cuir, tige montante, très durable et ressemelable par un cordonnier",
      "Lowa fabrique une partie de ses chaussures en Europe",
    ],
    caveats: ["Rodage nécessaire avec le cuir", "Lourde pour de simples balades"],
  },
  {
    id: "hoka-kaha",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "HOKA",
    line: "Kaha GTX",
    version: null,
    category: "rando",
    usages: ["rando", "rando-soutenue"],
    terrains: ["chemins", "sentiers", "mixte"],
    support: "neutre",
    cushioning: 4,
    dropMm: 6,
    weightG: 480,
    wideFit: true,
    waterproof: "membrane",
    membrane: "GORE-TEX",
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [200, 230],
    style: ["outdoor", "sport"],
    highlights: ["Amorti maximal dans une tige montante étanche", "Très confortable si vous avez mal aux pieds en fin de rando"],
    caveats: ["Lourde et volumineuse", "Base haute : moins de stabilité latérale sur terrain très irrégulier"],
  },

  /* ----------------------------------------------------------------- trail */
  {
    id: "salomon-speedcross",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Salomon",
    line: "Speedcross",
    version: null,
    category: "trail",
    usages: ["trail", "rando"],
    terrains: ["sentiers"],
    support: "neutre",
    cushioning: 3,
    dropMm: 10,
    weightG: 320,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 165],
    style: ["outdoor", "sport"],
    highlights: ["Crampons profonds : accroche exceptionnelle en boue et sol meuble", "Maintien du pied très ferme"],
    caveats: ["Semelle agressive désagréable sur asphalte", "Chaussant étroit"],
  },
  {
    id: "hoka-speedgoat",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "HOKA",
    line: "Speedgoat",
    version: null,
    category: "trail",
    usages: ["trail", "rando"],
    terrains: ["sentiers", "chemins"],
    support: "neutre",
    cushioning: 4,
    dropMm: 5,
    weightG: 280,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [160, 185],
    style: ["outdoor", "sport"],
    highlights: ["Amorti important et accroche solide : bon compromis longues sorties sur sentier", "Version imperméable disponible"],
    caveats: ["Durabilité moyenne sur rocher abrasif", "Peu de protection contre les cailloux sous le pied"],
  },
  {
    id: "brooks-cascadia",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "Brooks",
    line: "Cascadia",
    version: null,
    category: "trail",
    usages: ["trail", "rando"],
    terrains: ["sentiers", "chemins"],
    support: "stabilite",
    cushioning: 3,
    dropMm: 8,
    weightG: 320,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 160],
    style: ["outdoor"],
    highlights: ["Trail relativement stable, adapté aux longues randonnées sur sentier", "Existe en version imperméable et en largeur large"],
    caveats: ["Moins agile qu'un modèle de trail rapide"],
  },
  {
    id: "asics-trabuco",
    availability: "large",
    lineStatus: "renouvelee",
    brand: "ASICS",
    line: "GEL-Trabuco",
    version: null,
    category: "trail",
    usages: ["trail", "rando"],
    terrains: ["sentiers", "chemins"],
    support: "neutre",
    cushioning: 3,
    dropMm: 8,
    weightG: 320,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "compatible",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [140, 170],
    style: ["outdoor", "sport"],
    highlights: ["Protection renforcée sur l'avant du pied, rassurante sur cailloux", "Version GORE-TEX disponible"],
    caveats: ["Semelle assez rigide au début"],
  },
  {
    id: "altra-lone-peak",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "Altra",
    line: "Lone Peak",
    version: null,
    category: "trail",
    usages: ["trail", "rando", "marche"],
    terrains: ["sentiers", "chemins", "mixte"],
    support: "neutre",
    cushioning: 3,
    dropMm: 0,
    weightG: 300,
    wideFit: true,
    waterproof: "aucune",
    membrane: null,
    orthotic: "deconseille",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    priceEur: [150, 175],
    style: ["outdoor", "sport"],
    highlights: [
      "Avant-pied large et drop nul : idéale si vos orteils souffrent en descente",
      "Existe en version imperméable et en version cuir pour la randonnée",
    ],
    caveats: [
      "Drop nul : adaptation progressive indispensable",
      "Peu compatible avec des semelles orthopédiques épaisses",
    ],
  },
  {
    id: "la-sportiva-ultra-raptor",
    availability: "specialisee",
    lineStatus: "renouvelee",
    brand: "La Sportiva",
    line: "Ultra Raptor",
    version: null,
    category: "trail",
    usages: ["trail", "rando-soutenue"],
    terrains: ["sentiers"],
    support: "neutre",
    cushioning: 3,
    dropMm: null,
    weightG: 330,
    wideFit: false,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "a-verifier",
    repairable: false,
    priceEur: [160, 190],
    style: ["outdoor"],
    highlights: ["Très bon maintien en terrain technique, semelle adhérente sur rocher", "Marque italienne, production en partie européenne"],
    caveats: ["Chaussant étroit et plutôt ferme", "À réserver aux terrains techniques"],
  },

  /* ------------------------------------------------------------- lifestyle */
  {
    id: "veja-v10",
    availability: "large",
    lineStatus: "permanente",
    brand: "Veja",
    line: "V-10",
    version: null,
    category: "lifestyle",
    usages: ["urbain", "lifestyle"],
    terrains: ["asphalte"],
    support: "neutre",
    cushioning: 2,
    dropMm: null,
    weightG: null,
    waterproof: "aucune",
    membrane: null,
    orthotic: "deconseille",
    vegan: "options",
    madeInEurope: "non",
    repairable: false,
    wideFit: false,
    priceEur: [130, 160],
    style: ["discret", "street"],
    highlights: [
      "Sneaker discrète et intemporelle, matières tracées (coton bio, caoutchouc amazonien)",
      "Certaines déclinaisons sont vegan, la V-10 en cuir ne l'est pas",
    ],
    caveats: [
      "Amorti très faible : pas conçue pour la marche longue distance",
      "Production au Brésil",
      "Vérifiez la mention vegan sur la fiche du modèle précis",
    ],
  },
  {
    id: "allbirds-tree-runner",
    availability: "specialisee",
    lineStatus: "permanente",
    brand: "Allbirds",
    line: "Tree Runner",
    version: null,
    category: "lifestyle",
    usages: ["urbain", "lifestyle"],
    terrains: ["asphalte"],
    support: "neutre",
    cushioning: 2,
    dropMm: null,
    weightG: null,
    waterproof: "aucune",
    membrane: null,
    orthotic: "deconseille",
    vegan: "oui",
    madeInEurope: "non",
    repairable: false,
    wideFit: false,
    priceEur: [110, 140],
    style: ["discret"],
    highlights: [
      "Sans matière animale, lavable en machine, très légère",
      "Discrète et confortable dès l'enfilage",
    ],
    caveats: [
      "Semelle fine : usure rapide si vous marchez plusieurs kilomètres par jour",
      "Pas de renfort ni de membrane",
    ],
  },
  {
    id: "adidas-samba",
    availability: "large",
    lineStatus: "permanente",
    brand: "adidas",
    line: "Samba OG",
    version: null,
    category: "lifestyle",
    usages: ["urbain", "lifestyle"],
    terrains: ["asphalte"],
    support: "neutre",
    cushioning: 1,
    dropMm: null,
    weightG: null,
    waterproof: "aucune",
    membrane: null,
    orthotic: "deconseille",
    vegan: "options",
    madeInEurope: "non",
    repairable: false,
    wideFit: false,
    priceEur: [100, 130],
    style: ["discret", "street"],
    highlights: ["Sneaker basse intemporelle, très facile à associer", "Certaines éditions utilisent des matières recyclées et une version sans cuir existe"],
    caveats: [
      "Semelle très plate et dure : inadaptée à la marche quotidienne prolongée",
      "Pas de soutien de voûte",
    ],
  },
  {
    id: "nb-574",
    availability: "large",
    lineStatus: "permanente",
    brand: "New Balance",
    line: "574",
    version: null,
    category: "lifestyle",
    usages: ["urbain", "lifestyle"],
    terrains: ["asphalte", "chemins"],
    support: "neutre",
    cushioning: 2,
    dropMm: null,
    weightG: null,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "partiel",
    repairable: false,
    wideFit: true,
    priceEur: [90, 120],
    style: ["discret", "street", "sport"],
    highlights: [
      "Sneaker classique, disponible en tailles larges",
      "Prix d'entrée accessible, bonne tenue en marche urbaine légère",
    ],
    caveats: ["Amorti ferme, pas de technologie moderne de marche"],
  },
  {
    id: "salomon-xt-6",
    availability: "large",
    lineStatus: "permanente",
    brand: "Salomon",
    line: "XT-6",
    version: null,
    category: "lifestyle",
    usages: ["urbain", "lifestyle", "rando"],
    terrains: ["chemins", "asphalte"],
    support: "neutre",
    cushioning: 2,
    dropMm: null,
    weightG: null,
    waterproof: "aucune",
    membrane: null,
    orthotic: "a-tester",
    vegan: "a-verifier",
    madeInEurope: "non",
    repairable: false,
    wideFit: false,
    priceEur: [160, 200],
    style: ["street", "outdoor"],
    highlights: ["Look trail urbain, semelle accrocheuse et tige solide", "Passage ville / chemin sans souci"],
    caveats: ["Amorti ferme pour la marche longue", "Maintien limité pour la randonnée avec sac"],
  },
];

/* -------------------------------------------------------------------------- */
/* Moteur de correspondance                                                   */
/* -------------------------------------------------------------------------- */

/*P3*/const USAGE_LABEL: Record<Usage, string> = {
  urbain: "la marche urbaine",
  marche: "la marche active",
  rando: "la randonnée loisir",
  "rando-soutenue": "la randonnée soutenue",
  trail: "le trail",
  lifestyle: "un usage lifestyle",
};

const TERRAIN_LABEL: Record<Terrain, string> = {
  asphalte: "asphalte",
  chemins: "chemins de terre",
  sentiers: "sentiers techniques",
  mixte: "terrains variés",
};

const SUPPORT_LABEL: Record<Support, string> = {
  neutre: "neutre",
  stabilite: "stabilité",
};

const BUDGET_MAX: Record<string, number> = {
  "moins-80": 80,
  "80-130": 130,
  "130-180": 180,
  "180-plus": 400,
  flexible: Number.POSITIVE_INFINITY,
};

const CUSHION_LABEL = ["", "minimal", "léger", "moyen", "élevé", "maximal"];

export function cushionLabel(level: number): string {
  return CUSHION_LABEL[level] ?? "moyen";
}

export function supportLabel(support: Support): string {
  return SUPPORT_LABEL[support];
}

const AVAILABILITY_LABEL: Record<Availability, string> = {
  large: "Grande distribution sport et chaussures, plus vente en ligne",
  specialisee: "Magasins spécialisés (outdoor ou running) et vente en ligne",
  restreinte: "Réseau très étroit : vente directe ou quelques revendeurs",
};

const LINE_STATUS_LABEL: Record<LineStatus, string> = {
  permanente: "Ligne permanente au catalogue",
  renouvelee: "Ligne reconduite, avec une nouvelle version chaque année ou presque",
  edition: "Ligne non permanente, susceptible de disparaître du catalogue",
};

/** Date de dernière vérification des lignes du catalogue (et non des stocks). */
export const CATALOG_CHECKED_ON = "21 septembre 2026";

export function availabilityLabel(availability: Availability): string {
  return AVAILABILITY_LABEL[availability];
}

export function lineStatusLabel(status: LineStatus): string {
  return LINE_STATUS_LABEL[status];
}

/** Déclaration honnête : ce que l'outil sait, et ce qu'il ne sait pas. */
export function availabilityNote(model: ShoeModel): string {
  return `${AVAILABILITY_LABEL[model.availability]} · ${LINE_STATUS_LABEL[model.lineStatus].toLowerCase()}. Stocks non consultés : à confirmer chez le distributeur (catalogue vérifié le ${CATALOG_CHECKED_ON}).`;
}

const USAGE_VALUES = Object.keys(USAGE_LABEL) as Usage[];
const TERRAIN_VALUES = Object.keys(TERRAIN_LABEL) as Terrain[];

function asUsages(values: string[]): Usage[] {
  return values.filter((value): value is Usage => (USAGE_VALUES as string[]).includes(value));
}

function asTerrains(values: string[]): Terrain[] {
  return values.filter((value): value is Terrain => (TERRAIN_VALUES as string[]).includes(value));
}

function frList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function usageList(usages: Usage[]): string {
  return frList(usages.map((usage) => USAGE_LABEL[usage]));
}

function terrainList(terrains: Terrain[]): string {
  return frList(terrains.map((terrain) => TERRAIN_LABEL[terrain]));
}

/** Usages voisins : une paire de marche active dépanne en randonnée légère, pas l'inverse. */
const NEIGHBOUR_USAGES: Record<Usage, Usage[]> = {
  "rando-soutenue": ["rando"],
  rando: ["rando-soutenue", "marche"],
  marche: ["rando", "urbain"],
  urbain: ["marche", "lifestyle"],
  trail: ["rando-soutenue", "rando"],
  lifestyle: ["urbain"],
};

/**
 * Marques que l'on retrouve dans toutes les listes de recommandation. Le classement
 * s'interdit d'en empiler plus de deux et signale quand la sélection y est enfermée.
 */
export const MAINSTREAM_BRANDS = new Set([
  "HOKA",
  "Brooks",
  "ASICS",
  "Saucony",
  "New Balance",
  "Mizuno",
  "Nike",
  "On",
  "adidas",
  "Salomon",
  "Merrell",
  "Keen",
  "Skechers",
  "Ecco",
  "Quechua",
]);

/** Douleur déclarée : dans la v1.1 c'était une option d'appui, on accepte encore cette forme. */
export function hasPain(answers: Answers): boolean {
  return answerValues(answers, "pied").includes("douleurs") || answerValues(answers, "appui")[0] === "douleurs";
}

function single(values: string[]): string | undefined {
  return values[0];
}

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

interface Criteria {
  usage?: string;
  terrain?: string;
  volume?: string;
  meteo: string[];
  essayage?: string;
  appui?: string;
  pied: string[];
  serrage?: string;
  poids?: string;
  budget: number | undefined;
  exigences: string[];
  style?: string;
  priorite?: string;
}

function readCriteria(answers: Answers): Criteria {
  const budgetKey = single(answerValues(answers, "budget"));
  return {
    usage: single(answerValues(answers, "usage")),
    terrain: single(answerValues(answers, "terrain")),
    volume: single(answerValues(answers, "volume")),
    meteo: answerValues(answers, "meteo"),
    essayage: single(answerValues(answers, "essayage")),
    appui: single(answerValues(answers, "appui")),
    pied: answerValues(answers, "pied"),
    serrage: single(answerValues(answers, "serrage")),
    poids: single(answerValues(answers, "poids")),
    budget: budgetKey === undefined ? undefined : BUDGET_MAX[budgetKey],
    exigences: answerValues(answers, "exigences"),
    style: single(answerValues(answers, "style")),
    priorite: single(answerValues(answers, "priorite")),
  };
}

function scoreUsage(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 27;
  if (c.usage === undefined) {
    s.points += max / 2;
    return;
  }
  if (model.usages.includes(c.usage as Usage)) {
    add(s, max, `Conçue pour ${USAGE_LABEL[c.usage as Usage]}`);
    return;
  }
  const alternatives: Usage[] = c.usage === "rando-soutenue" ? ["rando"] : c.usage === "rando" ? ["marche"] : [];
  if (alternatives.some((alt) => model.usages.includes(alt))) {
    add(s, 16, `Usage proche de ${USAGE_LABEL[c.usage as Usage]}`);
    caution(s, `Pensée d'abord pour ${USAGE_LABEL[model.usages[0]]}`);
    return;
  }
  caution(s, `Usage décalé : ce modèle vise ${USAGE_LABEL[model.usages[0]]}`);
}

function scoreTerrain(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 15;
  if (c.terrain === undefined) {
    s.points += max / 2;
    return;
  }
  const t = c.terrain as Terrain;
  const has = (terrain: Terrain) => model.terrains.includes(terrain);

  if (t === "mixte") {
    const coverage = (["asphalte", "chemins", "sentiers"] as Terrain[]).filter(has).length;
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

  if (has(t)) {
    add(s, max, `Terrain ${TERRAIN_LABEL[t]} : dans son domaine`);
    return;
  }
  if (t === "asphalte" && has("chemins")) {
    s.points += 9;
    caution(s, "Semelle orientée chemin : plus bruyante et plus lente sur bitume");
    return;
  }
  if (t === "chemins" && (has("asphalte") || has("sentiers"))) {
    s.points += 8;
    caution(s, "Prévue pour un autre terrain que le vôtre : accroche ou confort à tester");
    return;
  }
  block(s, `Terrain incompatible : ce modèle ne couvre pas ${TERRAIN_LABEL[t]}`);
}

function scoreSupport(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 16;
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
    case "douleurs":
      if (model.cushioning >= 4) add(s, max, "Amorti important, qui soulage talon et voûte");
      else if (model.cushioning === 3) {
        s.points += 9;
        caution(s, "Amorti moyen : à tester avant un usage intensif");
      } else {
        s.points += 3;
        caution(s, "Amorti ferme, à éviter en cas de douleurs plantaires");
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
  if (!needsProtection) {
    if (c.meteo.length === 0) s.points += max - 1;
    else s.points += max;
    if (model.waterproof === "membrane") caution(s, "Imperméable : utile sous la pluie, plus chaud et moins respirant l'été");
    return;
  }
  if (model.waterproof === "membrane") add(s, max, `Étanche (${model.membrane ?? "membrane"}), adaptée à votre météo`);
  else if (model.waterproof === "traitement") {
    s.points += 3;
    caution(s, "Simple traitement déperlant : ne tient pas sur une pluie prolongée");
  } else caution(s, "Aucune protection contre l'eau alors que vous marchez souvent mouillé");
}

function scoreBudget(model: ShoeModel, c: Criteria, s: Scorer) {
  const max = 8;
  if (c.budget === undefined || !Number.isFinite(c.budget)) {
    s.points += max;
    return;
  }
  const [min, maxPriceText] = model.priceEur;
  if (min <= c.budget) {
    add(s, max, `Dans votre budget (${min}–${maxPriceText} € environ)`);
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
  let index = 0;
  const roomy = ["large", "hallux", "volume-eleve"];
  for (const flag of c.pied) {
    if (index >= 4) break;
    index += 1;
    if (flag === "orthopedie") {
      if (model.orthotic === "compatible") add(s, 2, "Compatible avec des semelles orthopédiques");
      else if (model.orthotic === "a-tester") {
        s.points += 1;
        caution(s, "Semelles orthopédiques : faisabilité à tester, la chaussure peut devenir trop serrée");
      } else {
        caution(s, "Chaussure conçue pour un pied nu : peu compatible avec des semelles épaisses");
      }
      continue;
    }
    if (flag === "etroit") {
      if (!model.wideFit) add(s, 2, "Chaussant ajusté, adapté à un pied étroit");
      else {
        caution(s, "Chaussant plutôt large pour un pied étroit : essayez une taille en dessous");
      }
      continue;
    }
    if (roomy.includes(flag) || flag === "ampoules") {
      if (model.wideFit) add(s, 2, "Chaussant large disponible ou avant-pied généreux");
      else caution(s, "Pas de version large : risque de compression de l'avant-pied");
    }
  }
}

function scoreNeeds(model: ShoeModel, c: Criteria, s: Scorer) {
  for (const need of c.exigences.slice(0, 4)) {
    if (need === "vegan") {
      if (model.vegan === "oui") add(s, 1.5, "Sans matière animale");
      else if (model.vegan === "options") {
        s.points += 0.5;
        caution(s, "Vegan uniquement sur certaines déclinaisons : vérifiez la référence exacte");
      } else {
        block(s, "Ne respecte pas votre contrainte vegan (matières animales)");
      }
      continue;
    }
    if (need === "europe") {
      if (model.madeInEurope === "oui") add(s, 1.5, "Fabrication européenne");
      else if (model.madeInEurope === "partiel") {
        s.points += 0.75;
        caution(s, "Production partiellement européenne selon les lignes");
      } else caution(s, "Fabrication hors d'Europe");
      continue;
    }
    if (need === "durabilite") {
      if (model.repairable) add(s, 1.5, "Réparable chez un cordonnier");
      else caution(s, "Colle et mousse : réparation difficile en fin de vie");
      continue;
    }
    if (need === "leger") {
      if (model.weightG !== null && model.weightG <= 270) add(s, 1.5, `Poids contenu (≈ ${model.weightG} g)`);
      else if (model.weightG === null) caution(s, "Poids non communiqué ici : à vérifier sur la fiche produit");
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

  const points = Math.max(0, Math.min(100, Math.round(s.points)));
  const verdict: MatchResult["verdict"] =
    s.blockers.length > 0 ? "ecarte" : points >= 78 ? "excellent" : points >= 62 ? "bon" : points >= 46 ? "possible" : "ecarte";

  return {
    model,
    score: points,
    verdict,
    strengths: s.strengths,
    cautions: s.cautions,
    blockers: s.blockers,
  };
}

/**
 * Moteur principal : classe le catalogue selon les réponses, sépare les modèles
 * exploitables des modèles écartés (et explique chaque exclusion).
 */
export function recommend(answers: Answers): Advice {
  const criteria = readCriteria(answers);
  const scored = CATALOG.map((model) => score(model, criteria)).sort((a, b) => b.score - a.score);
  const usable = scored.filter((r) => r.blockers.length === 0 && r.score >= 46);

  const pending: string[] = [];
  if (!isAnswered(answers, "appui")) pending.push("Appui et pronation non renseignés : le classement suppose un appui neutre.");
  if (answers.appui === "inconnu")
    pending.push("Appui non déterminé : faites analyser votre foulée en magasin spécialisé avant d'acheter.");
  if (!isAnswered(answers, "pied")) pending.push("Particularités du pied non renseignées : la largeur du chaussant n'a pas pu être ajustée.");
  if (!isAnswered(answers, "budget")) pending.push("Budget non renseigné : les modèles proposés ne sont pas filtrés par le prix.");
  if (answers.exigences === undefined || answerValues(answers, "exigences").length === 0)
    pending.push("Aucune contrainte forte sélectionnée : vegan et fabrication européenne n'ont pas été vérifiées.");
  if (criteria.pied.includes("orthopedie"))
    pending.push("Semelles orthopédiques : validez le volume intérieur avec votre podologue ou en magasin.");
  if (criteria.appui === "douleurs")
    pending.push("Douleurs récurrentes : faites confirmer l'origine par un professionnel de santé avant de choisir un modèle.");
  pending.push("Versions annuelles : les modèles sont renouvelés, vérifiez la référence en cours sur le site de la marque.");
  pending.push("Poids, drop et prix affichés sont des ordres de grandeur (taille 42, prix distributeur).");

  return {
    matches: usable.slice(0, 4),
    alternates: usable.slice(4, 7),
    excluded: scored
      .filter((r) => r.blockers.length > 0 || r.score < 46)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6),
    summary: summaryOf(answers),
    pending,
  };
}

/* -------------------------------------------------------------------------- */
/* Export Markdown                                                            */
/* -------------------------------------------------------------------------- */

function modelSpecLine(model: ShoeModel): string {
  const drop = model.dropMm === null ? "drop à vérifier" : `drop ≈ ${model.dropMm} mm`;
  const weight = model.weightG === null ? "poids à vérifier" : `poids ≈ ${model.weightG} g (à vérifier selon la pointure)`;
  const waterproof =
    model.waterproof === "membrane"
      ? `étanche (${model.membrane ?? "membrane"})`
      : model.waterproof === "traitement"
        ? "déperlant"
        : "non étanche";
  return `${model.support === "stabilite" ? "stabilité" : "neutre"}, amorti ${cushionLabel(model.cushioning)}, ${drop}, ${weight}, ${waterproof}`;
}

export function resultToMarkdown(result: MatchResult): string {
  const { model } = result;
  const lines = [
    `### ${modelName(model)} — score ${result.score}/100`,
    "",
    `- **Pourquoi** : ${result.strengths.join(" ; ")}`,
    `- **Caractéristiques** : ${modelSpecLine(model)}`,
    `- **Prix indicatif** : ${model.priceEur[0]} à ${model.priceEur[1]} € environ (à vérifier chez le distributeur)`,
  ];
  if (result.cautions.length > 0) lines.push(`- **Limites / vigilance** : ${result.cautions.join(" ; ")}`);
  lines.push(`- **À vérifier** : version en cours, pointure et largeur disponible — ${modelSearchUrl(model)}`);
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
      const reason = item.blockers.length > 0 ? item.blockers.join(" ; ") : `score trop faible (${item.score}/100) pour votre profil`;
      blocks.push(`- **${modelName(item.model)}** : ${reason}`);
    }
  }

  blocks.push("", "## À valider avant achat", "", ...advice.pending.map((item) => `- ${item}`));
  blocks.push(
    "",
    "## Méthode et limites",
    "",
    "- Classement déterministe sur des critères explicites : usage, terrain, appui, amorti, chaussant, contraintes, style.",
    `- ${WEAR_NOTE}`,
    "- Cet assistant ne remplace ni un avis médical ni un essai en magasin.",
  );
  return blocks.join("\n");
}
