import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  answerText,
  availabilityNote,
  AVAILABILITY_SHORT,
  brandSite,
  cushionLabel,
  DIVERSITY_NOTE,
  isAnswered,
  modelName,
  modelSearchUrl,
  QUESTIONS,
  STEPS,
  supportLabel,
  WEAR_NOTE,
  type Answers,
  type MatchResult,
  type Question,
  type QuestionId,
  type ShoeModel,
} from "@/lib/shoe-advisor";
import { adviceToMarkdown, recommend } from "@/lib/advice";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

/** Questions minimales pour produire un classement défendable. */
const REQUIRED: QuestionId[] = ["usage", "terrain", "appui"];

const VERDICT_LABEL: Record<MatchResult["verdict"], string> = {
  excellent: "Correspondance forte",
  bon: "Bon compromis",
  possible: "Compatible sous conditions",
  ecarte: "Écarté",
};

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function specChips(model: ShoeModel): string[] {
  const waterproof =
    model.waterproof === "membrane"
      ? `étanche (${model.membrane ?? "membrane"})`
      : model.waterproof === "traitement"
        ? "déperlant"
        : model.waterproof === "a-verifier"
          ? "étanchéité à vérifier"
          : "non étanche";
  return [
    supportLabel(model.support),
    `amorti ${cushionLabel(model.cushioning)}`,
    model.dropMm === null ? "drop à vérifier" : `drop ≈ ${model.dropMm} mm`,
    model.weightG === null ? "poids à vérifier" : `poids ≈ ${model.weightG} g`,
    waterproof,
    model.wideFit ? "largeurs larges" : "largeur standard",
    `${model.priceEur[0]}–${model.priceEur[1]} €`,
    AVAILABILITY_SHORT[model.availability],
  ];
}

/* -------------------------------------------------------------------------- */
/* Questionnaire                                                              */
/* -------------------------------------------------------------------------- */

function Wizard({
  draft,
  setDraft,
  stepIndex,
  setStepIndex,
  onSubmit,
  saving,
}: {
  draft: Answers;
  setDraft: (next: Answers) => void;
  stepIndex: number;
  setStepIndex: (next: number) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const stepMissing = step.questions.filter((id) => REQUIRED.includes(id) && !isAnswered(draft, id));
  const allMissing = REQUIRED.filter((id) => !isAnswered(draft, id));
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  /**
   * Choix multiple = cases à cocher (plusieurs valeurs, et une option exclusive comme
   * « un peu des trois » vide les autres). Choix unique = bouton radio, et un second
   * clic sur la même option annule la réponse.
   */
  const toggle = (question: Question, value: string) => {
    const { id } = question;

    if (question.multiple) {
      const isExclusive = question.options.find((option) => option.value === value)?.exclusive === true;
      if (isExclusive) {
        setDraft({ ...draft, [id]: [value] });
        return;
      }
      const current = draft[id];
      const list = (Array.isArray(current) ? current : []).filter(
        (entry) => question.options.find((option) => option.value === entry)?.exclusive !== true,
      );
      const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
      setDraft({ ...draft, [id]: next });
      return;
    }

    const current = draft[id];
    setDraft({ ...draft, [id]: current === value ? undefined : value });
  };

  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
      {/* Rail d'étapes */}
      <aside className="lg:col-span-4">
        <p className="micro">Questions d&apos;abord</p>
        <ol className="mt-6">
          {STEPS.map((item, index) => {
            const answered = item.questions.filter((id) => isAnswered(draft, id)).length;
            const active = index === stepIndex;
            return (
              <li key={item.id} className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={cn(
                    "flex w-full items-baseline gap-5 py-4 text-left transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="w-6 shrink-0 text-xs tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm">{item.title}</span>
                  <span className="text-xs tabular-nums">
                    {answered}/{item.questions.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 border-t border-border pt-5">
          <div className="h-px w-full bg-border">
            <div className="h-px bg-foreground transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {allMissing.length === 0
              ? "Base suffisante : le classement peut être calculé."
              : `${allMissing.length} réponse(s) requise(s) : ${allMissing
                  .map((id) => QUESTIONS[id].label.toLowerCase())
                  .join(", ")}.`}
          </p>
        </div>
      </aside>

      {/* Questions de l'étape */}
      <div className="lg:col-span-8">
        <p className="micro tabular-nums">
          Étape {String(stepIndex + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </p>
        <h2 className="mt-6 font-serif text-3xl leading-tight tracking-[-0.01em] sm:text-4xl">
          {step.title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{step.intro}</p>

        <div className="mt-12 space-y-12">
          {step.questions.map((id) => {
            const question = QUESTIONS[id];
            const values = draft[id];
            const selected = Array.isArray(values) ? values : values ? [values] : [];
            return (
              <fieldset key={id} role={question.multiple ? "group" : "radiogroup"}>
                <legend className="flex flex-wrap items-baseline gap-3">
                  <span className="text-sm font-medium">{question.label}</span>
                  {REQUIRED.includes(id) && (
                    <span className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                      requise
                    </span>
                  )}
                  <span className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                    {question.multiple ? "plusieurs choix" : "choix unique"}
                  </span>
                </legend>
                {question.help && (
                  <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{question.help}</p>
                )}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role={question.multiple ? "checkbox" : "radio"}
                        aria-checked={isSelected}
                        aria-pressed={question.multiple ? isSelected : undefined}
                        onClick={() => toggle(question, option.value)}
                        className={cn(
                          "flex items-start gap-3 border px-4 py-3.5 text-left transition-colors",
                          isSelected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background hover:border-foreground/30 hover:bg-accent/60",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                            question.multiple ? "rounded-none" : "rounded-full",
                            isSelected ? "border-background/70 bg-background/10" : "border-border",
                          )}
                        >
                          {isSelected &&
                            (question.multiple ? (
                              <Check className="size-3" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-current" />
                            ))}
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm leading-5">{option.label}</span>
                          {option.hint && (
                            <span
                              className={cn(
                                "text-xs leading-5",
                                isSelected ? "text-background/70" : "text-muted-foreground",
                              )}
                            >
                              {option.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <Button
            variant="ghost"
            className="gap-2 rounded-none"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          >
            <ArrowLeft className="size-4" />
            Précédent
          </Button>

          {isLast ? (
            <div className="flex flex-col items-end gap-2">
              <Button
                className="gap-2 rounded-none px-5"
                disabled={saving || allMissing.length > 0}
                onClick={onSubmit}
              >
                {saving ? "Enregistrement…" : "Voir les résultats"}
                <ArrowRight className="size-4" />
              </Button>
              {allMissing.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Répondez d&apos;abord :{" "}
                  {allMissing.map((id) => QUESTIONS[id].label.toLowerCase()).join(", ")}.
                </p>
              )}
            </div>
          ) : (
            <Button
              className="gap-2 rounded-none px-5"
              disabled={stepMissing.length > 0}
              onClick={() => setStepIndex(stepIndex + 1)}
            >
              Continuer
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Résultats                                                                  */
/* -------------------------------------------------------------------------- */

function ResultCard({ result, rank }: { result: MatchResult; rank: number }) {
  const { model } = result;
  const site = brandSite(model);
  return (
    <article className="border-t border-border pt-10">
      <header className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex items-baseline gap-5">
          <span className="text-xs tabular-nums text-muted-foreground">
            {String(rank).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-lg font-medium tracking-[-0.01em]">{modelName(model)}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {VERDICT_LABEL[result.verdict]} · {model.highlights[0]}
            </p>
          </div>
        </div>
        <div className="sm:w-40">
          <p className="font-serif text-4xl leading-none tabular-nums">{result.score}</p>
          <p className="mt-1 text-xs text-muted-foreground">score / 100</p>
          <div className="mt-3 h-px w-full bg-border">
            <div className="h-px bg-foreground" style={{ width: `${result.score}%` }} />
          </div>
        </div>
      </header>

      <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-2">
        {specChips(model).map((chip) => (
          <li
            key={chip}
            className="border border-border px-2.5 py-1 text-xs text-muted-foreground tabular-nums"
          >
            {chip}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="micro">Pourquoi ce modèle</p>
          <ul className="mt-4 space-y-3">
            {(result.strengths.length > 0
              ? result.strengths
              : ["Correspondance globale satisfaisante sur vos critères principaux."]
            ).map((reason) => (
              <li key={reason} className="flex gap-3 text-sm leading-6">
                <span className="mt-2.5 size-1 shrink-0 bg-foreground" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="micro">Limites et vigilance</p>
          <ul className="mt-4 space-y-3">
            {(result.cautions.length > 0 ? result.cautions : ["Aucune réserve majeure identifiée sur vos critères."]).map(
              (reason) => (
                <li key={reason} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2.5 size-1 shrink-0 bg-muted-foreground" />
                  {reason}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <div className="mt-8 grid gap-5 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-10">
        <p className="max-w-xl text-xs leading-6 text-muted-foreground">{availabilityNote(model)}</p>
        <div className="flex flex-wrap items-center gap-6">
          <a
            href={modelSearchUrl(model)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs tracking-[0.02em] text-foreground underline-offset-4 hover:underline"
          >
            Vérifier la version en cours
            <ArrowUpRight className="size-3" />
          </a>
          {site && (
            <a
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs tracking-[0.02em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Fiche de la marque
              <ArrowUpRight className="size-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Results({
  answers,
  createdAt,
  onRestart,
  onDelete,
}: {
  answers: Answers;
  createdAt?: number;
  onRestart: () => void;
  onDelete?: () => void;
}) {
  const advice = useMemo(() => recommend(answers), [answers]);

  // Quand aucune contrainte dure ne peut être satisfaite en même temps, on explique
  // lesquelles bloquent le plus souvent plutôt que de renvoyer une liste vide.
  const topBlockers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of advice.excluded) {
      for (const blocker of item.blockers) {
        counts.set(blocker, (counts.get(blocker) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [advice.excluded]);

  const copyRecap = async () => {
    try {
      await navigator.clipboard.writeText(adviceToMarkdown(answers, advice));
      toast.success("Récapitulatif Markdown copié");
    } catch {
      toast.error("Copie impossible : sélectionnez le texte du récapitulatif à la main.");
    }
  };

  return (
    <div className="space-y-16">
      <header className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="micro">Résultat</p>
          <h1 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em] sm:text-5xl">
            {advice.matches.length === 0
              ? "Aucun modèle ne respecte toutes vos contraintes."
              : `${advice.matches.length} modèle${advice.matches.length > 1 ? "s" : ""} retenu${advice.matches.length > 1 ? "s" : ""} pour votre profil.`}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
            {createdAt ? `Analyse enregistrée le ${formatDate(createdAt)}. ` : ""}
            Classement recalculé à partir de vos réponses : chaque point correspond à un critère
            explicite, jamais à une préférence de marque.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 rounded-none" onClick={copyRecap}>
              <Copy className="size-3.5" />
              Copier en .md
            </Button>
            <Button variant="outline" className="gap-2 rounded-none" onClick={onRestart}>
              <RotateCcw className="size-3.5" />
              Refaire le questionnaire
            </Button>
            {onDelete && (
              <Button variant="ghost" className="gap-2 rounded-none" onClick={onDelete}>
                <Trash2 className="size-3.5" />
                Supprimer
              </Button>
            )}
          </div>
          <p className="text-xs leading-6 text-muted-foreground lg:text-right">
            Les scores sont des indices de correspondance, pas des notes de qualité absolue.
          </p>
        </div>
      </header>

      {/* Récapitulatif des réponses */}
      <section className="border border-border bg-card p-8 sm:p-10">
        <p className="micro">Ce que j&apos;ai compris</p>
        <dl className="mt-6 grid gap-x-12 sm:grid-cols-2">
          {advice.summary.map((item) => (
            <div key={item.label} className="flex gap-6 border-t border-border py-3">
              <dt className="w-44 shrink-0 text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-sm leading-6">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Conflit de contraintes dures */}
      {advice.matches.length === 0 && (
        <section className="border border-border bg-card p-8 sm:p-10">
          <p className="micro">Conflit de contraintes</p>
          <h2 className="mt-5 font-serif text-2xl leading-snug">
            Vos exigences s&apos;excluent mutuellement dans ce catalogue.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Plutôt que de vous proposer un modèle qui trahit une de vos contraintes dures, l&apos;outil
            préfère le dire. Voici ce qui bloque le plus souvent :
          </p>
          <ul className="mt-6">
            {topBlockers.map(([reason, count]) => (
              <li key={reason} className="flex gap-4 border-t border-border py-4 text-sm leading-6">
                <span className="w-8 shrink-0 tabular-nums text-muted-foreground">{count}×</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">
            Assouplissez une seule de ces contraintes puis relancez l&apos;analyse : le classement se
            recalcule immédiatement, sans repartir de zéro.
          </p>
        </section>
      )}

      {/* Modèles retenus */}
      <section className="space-y-14">
        {advice.matches.length > 0 && (
          <div>
            <p className="micro">Sélection principale</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Essayez-les dans cet ordre. Un modèle qui gêne à l&apos;essayage reste un mauvais choix,
              même avec un bon score.
            </p>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">{DIVERSITY_NOTE}</p>
          </div>
        )}
        {advice.matches.map((result, index) => (
          <ResultCard key={result.model.id} result={result} rank={index + 1} />
        ))}
      </section>

      {/* Alternatives */}
      {advice.alternates.length > 0 && (
        <section className="border-t border-border pt-10">
          <p className="micro">Également compatibles</p>
          <ul className="mt-6">
            {advice.alternates.map((alt) => (
              <li
                key={alt.model.id}
                className="grid gap-1 border-t border-border py-4 sm:grid-cols-[minmax(0,18rem)_1fr_auto] sm:items-baseline sm:gap-8"
              >
                <span className="text-sm font-medium">{modelName(alt.model)}</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {alt.strengths.slice(0, 2).join(" · ") || "Correspondance partielle"}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{alt.score}/100</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Écartés */}
      {advice.excluded.length > 0 && (
        <section className="border-t border-border pt-10">
          <p className="micro">Écartés, et pourquoi</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Un modèle écarté n&apos;est pas un mauvais modèle : il ne correspond pas à vos contraintes.
          </p>
          <ul className="mt-6">
            {advice.excluded.map((item) => (
              <li
                key={item.model.id}
                className="grid gap-1 border-t border-border py-4 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-8"
              >
                <span className="text-sm font-medium">{modelName(item.model)}</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {item.blockers.length > 0
                    ? item.blockers.join(" ; ")
                    : `Score trop faible (${item.score}/100) pour votre profil`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comment essayer */}
      <section className="border-t border-border pt-10">
        <p className="micro">Comment essayer</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          L&apos;ordre compte : c&apos;est l&apos;essai qui valide la pointure, pas la fiche produit.
        </p>
        <ol className="mt-6">
          {advice.tryOn.map((item, index) => (
            <li key={item} className="flex gap-5 border-t border-border py-4 text-sm leading-6">
              <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Points professionnels */}
      <section className="border-t border-border pt-10">
        <p className="micro">Points à faire valider par un professionnel</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Ces éléments sortent du champ d&apos;un conseil en chaussures : ils relèvent d&apos;un médecin,
          d&apos;un podologue ou d&apos;un orthopédiste.
        </p>
        <ul className="mt-6">
          {advice.professional.map((item) => (
            <li
              key={item}
              className="flex gap-4 border-t border-border py-4 text-sm leading-6 text-muted-foreground"
            >
              <span className="w-6 shrink-0 text-xs text-muted-foreground">⚠</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Données à vérifier */}
      <section className="border-t border-border pt-10">
        <p className="micro">Données à vérifier (non garanties)</p>
        <ul className="mt-6 space-y-3">
          {advice.pending.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
              <span className="mt-2.5 size-1 shrink-0 bg-muted-foreground" />
              {item}
            </li>
          ))}
        </ul>
        <Separator className="mt-10" />
        <p className="mt-6 max-w-3xl text-xs leading-6 text-muted-foreground">{WEAR_NOTE}</p>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const latest = useQuery(api.advisor.latestAnalysis);
  const history = useQuery(api.advisor.analysisHistory);
  const saveAnalysis = useMutation(api.advisor.saveAnalysis);
  const removeAnalysis = useMutation(api.advisor.removeAnalysis);

  const [answers, setAnswers] = useState<Answers | null>(null);
  const [draft, setDraft] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);

  // Reprend la dernière analyse enregistrée une seule fois, à l'ouverture.
  useEffect(() => {
    if (restored || latest === undefined) return;
    if (latest) {
      const stored = latest.answers as Answers;
      setAnswers(stored);
      setDraft(stored);
    }
    setRestored(true);
  }, [latest, restored]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveAnalysis({ answers: draft as Record<string, string | string[]> });
      setAnswers(draft);
      toast.success("Analyse enregistrée");
    } catch (error) {
      console.error(error);
      toast.error("Enregistrement impossible : voici le résultat calculé localement.");
      setAnswers(draft);
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setDraft(answers ?? {});
    setStepIndex(0);
    setAnswers(null);
  };

  const handleDelete = async () => {
    if (!latest) return;
    try {
      await removeAnalysis({ id: latest._id });
      setAnswers(null);
      setDraft({});
      setStepIndex(0);
      toast.success("Analyse supprimée");
    } catch (error) {
      console.error(error);
      toast.error("Suppression impossible");
    }
  };

  const openHistory = (stored: Record<string, string | string[]>) => {
    setAnswers(stored as Answers);
    setDraft(stored as Answers);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="text-[15px] font-medium tracking-[0.34em] uppercase">Semelle</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">espace d&apos;analyse</span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/prompt" className="hidden transition-colors hover:text-foreground sm:inline">
              Prompt .md
            </Link>
            <span className="hidden sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="transition-colors hover:text-foreground"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
        {latest === undefined ? (
          <div className="py-24 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : answers === null ? (
          <Wizard
            draft={draft}
            setDraft={setDraft}
            stepIndex={stepIndex}
            setStepIndex={setStepIndex}
            onSubmit={handleSubmit}
            saving={saving}
          />
        ) : (
          <Results
            answers={answers}
            createdAt={latest?.createdAt}
            onRestart={handleRestart}
            onDelete={latest ? handleDelete : undefined}
          />
        )}

        {/* Historique */}
        {history && history.length > 0 && (
          <section className="mt-24 border-t border-border pt-10">
            <p className="micro">Analyses précédentes</p>
            <ul className="mt-6">
              {history.map((entry) => (
                <li
                  key={entry._id}
                  className="flex flex-wrap items-baseline justify-between gap-4 border-t border-border py-4"
                >
                  <div>
                    <p className="text-sm">{formatDate(entry.createdAt)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {answerText(entry.answers as Answers, "usage")} ·{" "}
                      {answerText(entry.answers as Answers, "terrain")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHistory(entry.answers as Record<string, string | string[]>)}
                    className="text-xs tracking-[0.02em] text-foreground underline-offset-4 hover:underline"
                  >
                    Ouvrir cette analyse
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
