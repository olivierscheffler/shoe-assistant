import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import promptMarkdown from "../../PROMPT.md?raw";

const SECTIONS = [
  { title: "Cinq règles d'or", detail: "Résumé décisionnel en tête de fichier : questions d'abord, rien d'inventé, incertitude classée, contraintes dures, santé." },
  { title: "Rôle, objectif et périmètre", detail: "Conseiller spécialisé marche, randonnée légère et sneakers — et ce qui sort du périmètre (sécurité, alpinisme, orthopédie, enfants)." },
  { title: "Règles absolues", detail: "Aucune marque inventée, aucun chiffre deviné, aucune source ni URL fabriquée, aucune donnée temps réel supposée." },
  { title: "Questions à poser", detail: "Cinq blocs, treize questions avant toute proposition, plus un mode express à six questions." },
  { title: "Méthode d'analyse", detail: "Usage et terrain éliminatoires, puis support, amorti, chaussant, contraintes, style ; indice de correspondance assumé." },
  { title: "Machine à états", detail: "Cadrage, questions, propositions, arbitrage, synthèse : l'étape en cours est toujours explicite." },
  { title: "Format de réponse", detail: "Ce que j'ai compris, 3 à 5 modèles, modèles écartés, essai, à vérifier — sous un budget de longueur." },
  { title: "Garde-fous", detail: "Anti-hallucination, reprise si réponses partielles, checklist d'auto-vérification, rappel professionnel de santé." },
];

export default function Prompt() {
  const navigate = useNavigate();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(promptMarkdown);
      toast.success("Prompt copié");
    } catch {
      toast.error("Copie impossible : sélectionnez le texte du fichier à la main.");
    }
  };

  const download = () => {
    const blob = new Blob([promptMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "prompt-choix-chaussures.md";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="text-[15px] font-medium tracking-[0.34em] uppercase">Semelle</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              prompt de l&apos;assistant
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="hidden items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <ArrowLeft className="size-3" />
              Accueil
            </button>
            <Button asChild size="sm" className="gap-2 rounded-none">
              <Link to="/auth?returnTo=%2Fdashboard">Lancer l&apos;analyse</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="micro">Fichier livré</p>
            <h1 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em] sm:text-5xl">
              Le prompt qui pilote l&apos;assistant.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
              Version 1.1, en français. Il définit le rôle du conseiller, interdit toute invention de
              modèle, de chiffre ou de source, impose les questions préalables, cadre le périmètre,
              fixe l'étape de conversation et le format de réponse. Copiable tel quel dans
              n&apos;importe quel assistant conversationnel.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2 rounded-none" onClick={copy}>
                <Copy className="size-3.5" />
                Copier le prompt
              </Button>
              <Button variant="outline" className="gap-2 rounded-none" onClick={download}>
                <Download className="size-3.5" />
                Télécharger le .md
              </Button>
            </div>

            <dl className="mt-14">
              {SECTIONS.map((section) => (
                <div key={section.title} className="border-t border-border py-4">
                  <dt className="text-sm font-medium">{section.title}</dt>
                  <dd className="mt-1 text-xs leading-6 text-muted-foreground">{section.detail}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-10 text-xs leading-6 text-muted-foreground">
              L&apos;espace d&apos;analyse de ce site applique exactement les mêmes règles, avec un
              classement déterministe sur treize critères pondérés et les exclusions affichées.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between border border-border border-b-0 bg-card px-5 py-3">
              <span className="micro">PROMPT.md</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {promptMarkdown.split("\n").length} lignes
              </span>
            </div>
            <pre className="max-h-[70vh] overflow-auto border border-border bg-card p-6 font-mono text-[11.5px] leading-6 whitespace-pre-wrap text-muted-foreground">
              {promptMarkdown}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
