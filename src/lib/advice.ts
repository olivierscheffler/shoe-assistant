/**
 * Assemblage de la réponse finale du conseiller.
 *
 * Le noyau du moteur — catalogue, filtres durs, scoring, disponibilité — vit dans
 * `shoe-advisor.ts` et `shoe-catalog.ts`. Ce module applique par-dessus les deux derniers
 * critères du questionnaire (avant-pied comprimé à l'essai, attente prioritaire déclarée),
 * remet les verdicts à jour, puis compose les sections « comment essayer » et
 * « à faire valider par un professionnel ».
 */

import {
  answerValues,
  hasPain,
  isAnswered,
  optionLabel,
  recommend as scoreCatalog,
  type Advice,
  type Answers,
  type MatchResult,
  type ShoeModel,
} from "./shoe-advisor";

// L'export Markdown vit avec le moteur : il connaît la disponibilité et la méthode.
// On le réexpose ici pour que les pages n'aient qu'un seul import à retenir.
export { adviceToMarkdown } from "./shoe-advisor";

export interface FullAdvice extends Advice {
  tryOn: string[];
  professional: string[];
}

interface Adjustment {
  points: number;
  strengths: string[];
  cautions: string[];
}

/**
 * Question « avant du pied à l'essai » : elle décide entre une paire qui laisse
 * respirer les orteils et une paire qui finit en ampoules.
 */
function frontFootAdjustment(model: ShoeModel, answers: Answers): Adjustment {
  switch (answerValues(answers, "serrage")[0]) {
    case "souvent":
      return model.wideFit
        ? {
            points: 2,
            strengths: ["Chaussant large : vos orteils ne devraient pas être comprimés à l'avant"],
            cautions: [],
          }
        : {
            points: 0.5,
            strengths: [],
            cautions: [
              "Pas de version large : montez d'une demi-pointure, quitte à perdre un peu de maintien",
            ],
          };
    case "jamais":
      return model.wideFit
        ? {
            points: 0,
            strengths: [],
            cautions: [
              "Chaussant large pour un pied jamais serré : essayez une demi-pointure en dessous",
            ],
          }
        : {
            points: 2,
            strengths: ["Chaussant ajusté, conforme à un pied jamais comprimé"],
            cautions: [],
          };
    case "inconnu":
      return {
        points: 1,
        strengths: [],
        cautions: [
          "Sensation de serrage non renseignée : mesurez vos pieds en fin de journée avant d'acheter",
        ],
      };
    default:
      return { points: 1, strengths: [], cautions: [] };
  }
}

export const PRIORITY_LABEL: Record<string, string> = {
  confort: "confort immédiat",
  durabilite: "durabilité",
  legerete: "légèreté",
  maintien: "maintien du pied",
  esthetique: "esthétique",
};

/**
 * Métrique secondaire : elle ne sert qu'à départager deux modèles à score égal.
 * La priorité déclarée est un arbitrage assumé, pas un bonus caché.
 */
function priorityMetric(model: ShoeModel, priorite: string | undefined): number {
  switch (priorite) {
    case "confort":
      return model.cushioning * 2;
    case "durabilite":
      return (
        (model.repairable === true ? 4 : 0) +
        (model.category === "rando" ? 2 : 0) +
        (model.orthotic === "compatible" ? 1 : 0)
      );
    case "legerete":
      return model.weightG === null ? 1 : Math.max(0, 420 - model.weightG) / 20;
    case "maintien":
      return (
        (model.support === "stabilite" ? 4 : 2) +
        (model.category === "rando" || model.category === "trail" ? 2 : 0)
      );
    case "esthetique":
      return model.style.includes("discret") || model.style.includes("street")
        ? 5
        : model.style.length;
    default:
      return 0;
  }
}

/** Mêmes seuils que `shoe-advisor.ts`, appliqués au score ajusté. */
function verdictFor(score: number, blocked: boolean): MatchResult["verdict"] {
  if (blocked) return "ecarte";
  if (score >= 78) return "excellent";
  if (score >= 62) return "bon";
  if (score >= 46) return "possible";
  return "ecarte";
}

export function recommend(answers: Answers): FullAdvice {
  const base = scoreCatalog(answers);
  const priorite = answerValues(answers, "priorite")[0];

  const apply = (result: MatchResult): MatchResult => {
    const extra = frontFootAdjustment(result.model, answers);
    const score = Math.max(0, Math.min(100, Math.round(result.score + extra.points)));
    return {
      ...result,
      score,
      verdict: verdictFor(score, result.blockers.length > 0),
      strengths: [...result.strengths, ...extra.strengths],
      cautions: [...result.cautions, ...extra.cautions],
    };
  };

  const rank = (a: MatchResult, b: MatchResult) =>
    b.score - a.score || priorityMetric(b.model, priorite) - priorityMetric(a.model, priorite);

  const usable = [...base.matches, ...base.alternates]
    .map(apply)
    .filter((result) => result.blockers.length === 0 && result.score >= 46)
    .sort(rank);

  const pending = [...base.pending];
  if (!isAnswered(answers, "serrage"))
    pending.push(
      "Sensation de serrage non renseignée : la largeur du chaussant n'a été ajustée qu'avec vos autres réponses.",
    );
  if (priorite !== undefined) {
    pending.push(
      `Priorité déclarée (${PRIORITY_LABEL[priorite] ?? optionLabel("priorite", priorite)}) : elle départage deux modèles à score égal, elle n'ajoute aucun point au classement.`,
    );
    if (priorite === "legerete" && answerValues(answers, "exigences").includes("durabilite"))
      pending.push(
        "Vous demandez à la fois la légèreté et une semelle durable ou réparable : ces deux exigences se contredisent presque toujours, à vous de dire laquelle prime.",
      );
  }
  if (answerValues(answers, "essayage")[0] === "en-ligne")
    pending.push(
      "Achat en ligne : commandez deux pointures et vérifiez la durée de retour annoncée par le marchand ainsi que l'état exigé de la paire. Au Canada, aucun délai de rétractation fédéral ne s'applique : c'est la politique du marchand et les lois provinciales qui encadrent le retour.",
    );
  pending.push(
    "Prix en dollars canadiens, avant taxes fédérales et provinciales, et hors frais de livraison.",
  );

  return {
    matches: usable.slice(0, 4),
    alternates: usable.slice(4, 7),
    excluded: base.excluded.map(apply).sort((a, b) => b.score - a.score),
    summary: base.summary,
    pending,
    tryOn: tryOnPlan(answers),
    professional: professionalPoints(answers),
  };
}

/* -------------------------------------------------------------------------- */
/* Essai et points professionnels                                             */
/* -------------------------------------------------------------------------- */

/** Ordre de test conseillé, adapté au lieu d'achat déclaré. */
function tryOnPlan(answers: Answers): string[] {
  const plan = [
    "Mesurez vos deux pieds en fin de journée : c'est le moment où ils sont les plus larges.",
    "Prenez votre pointure habituelle et la demi-pointure au-dessus, puis gardez 5 à 10 mm devant l'orteil le plus long.",
    "Essayez avec les chaussettes que vous porterez réellement, et avec vos semelles si vous en utilisez.",
    "Contrôlez le talon : il doit être tenu sans glisser et sans comprimer le tendon d'Achille.",
    "Marchez au moins dix minutes sur sol dur, puis testez une pente si c'est une chaussure de randonnée.",
    "Vérifiez le déroulé du pas : le pied doit rouler sans que les orteils butent à l'avant.",
  ];

  switch (answerValues(answers, "essayage")[0]) {
    case "en-ligne":
      plan.push(
        "Achat en ligne : commandez deux pointures, essayez sur moquette, renvoyez celle qui ne va pas — vérifiez la fenêtre de retour annoncée avant de commander.",
      );
      break;
    case "magasin":
      plan.push(
        "En magasin : demandez deux pointures et une autre largeur, et marchez hors du tapis plutôt que dessus.",
      );
      break;
    case "les-deux":
      plan.push(
        "Magasin pour trouver la pointure et la largeur, ligne pour le prix : gardez la référence exacte du modèle essayé.",
      );
      break;
    default:
      plan.push(
        "Privilégiez un point de vente dont la durée de retour est clairement annoncée : la bonne pointure se décide à l'essai, pas sur une fiche produit.",
      );
  }

  return plan;
}

/** Points qui dépassent le cadre de l'outil et relèvent d'un professionnel de santé. */
function professionalPoints(answers: Answers): string[] {
  const pied = answerValues(answers, "pied");
  const points = [
    "Cet outil n'est ni un médecin ni un podologue : il ne pose aucun diagnostic et limite ses conseils au confort général.",
  ];

  if (pied.includes("hallux"))
    points.push(
      "Hallux valgus : un podologue peut dire si un chaussant large suffit ou si une prise en charge est nécessaire. Évitez les tiges rigides et les coutures sur l'articulation.",
    );
  if (pied.includes("orthopedie"))
    points.push(
      "Semelles orthopédiques : faites valider le volume intérieur et le retrait de la semelle d'origine par votre podologue, chaussures en main.",
    );
  if (pied.includes("ampoules"))
    points.push(
      "Ampoules à répétition : si elles reviennent toujours au même endroit, faites vérifier votre appui avant de multiplier les paires.",
    );
  if (hasPain(answers))
    points.push(
      "Douleurs au talon, à la voûte ou au tibia : consultez avant d'attribuer la douleur à vos chaussures, un changement de modèle ne suffit pas toujours.",
    );
  if (answerValues(answers, "poids")[0] === "plus-95")
    points.push(
      "Poids supérieur à 95 kg : en cas de douleur plantaire ou de fatigue anormale, un avis professionnel aide à distinguer un amorti insuffisant d'un problème à traiter.",
    );

  return points;
}


