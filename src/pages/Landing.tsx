import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CATALOG, STEPS, WEAR_NOTE } from "@/lib/shoe-advisor";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

const CRITERIA = [
  { title: "Usage principal", detail: "Ville, marche longue, randonnée, sentiers ou style." },
  { title: "Terrain", detail: "Asphalte, chemins de terre, sentiers techniques, ou les trois." },
  { title: "Distance hebdomadaire", detail: "Du kilomètre occasionnel aux 30 km et plus." },
  { title: "Météo", detail: "Usage sec, pluie fréquente, froid et boue : besoin d'étanchéité." },
  { title: "Appui et pronation", detail: "Neutre, pronation, supination, douleurs — ou « je ne sais pas »." },
  { title: "Forme du pied", detail: "Largeur, volume, hallux, ampoules, semelles orthopédiques." },
  { title: "Poids corporel", detail: "Une tranche suffit : elle change le besoin d'amorti." },
  { title: "Avant-pied", detail: "Orteils comprimés à l'essai ou jamais serré : cela décide de la largeur." },
  { title: "Budget", detail: "Un plafond dur : au-delà de 15 %, le modèle est écarté." },
  { title: "Contraintes", detail: "Vegan, fabrication européenne, réparable, poids, discrétion." },
  { title: "Style", detail: "Discret, sportif, streetwear, outdoor — ou indifférent." },
  { title: "Lieu d'essai", detail: "Magasin ou ligne avec retour : la stratégie de pointure change." },
  { title: "Priorité déclarée", detail: "Confort, durabilité, légèreté, maintien, esthétique : arbitrage à score égal." },
];

const FAMILIES = [
  { label: "Amorti maximal, marche longue", brands: "HOKA Bondi & Clifton · ASICS GEL-Nimbus · Brooks Glycerin · Saucony Triumph · New Balance 1080 · Nike Vomero · On Cloudmonster" },
  { label: "Stabilité et pronation", brands: "Brooks Adrenaline GTS · ASICS GEL-Kayano · Saucony Guide · New Balance 860 · HOKA Arahi & Gaviota · Mizuno Wave Inspire · Nike Structure" },
  { label: "Randonnée", brands: "Salomon X Ultra · Merrell Moab & Moab Speed · Keen Targhee · Lowa Renegade · HOKA Kaha" },
  { label: "Sentiers techniques", brands: "Salomon Speedcross · HOKA Speedgoat · Brooks Cascadia · ASICS GEL-Trabuco · Altra Lone Peak · La Sportiva Ultra Raptor" },
  { label: "Pied large, avant-pied libre", brands: "Altra · Topo Athletic · Keen · New Balance et Brooks en largeurs 2E / 4E" },
  { label: "Lifestyle et matières", brands: "Veja · Allbirds · adidas Samba · New Balance 574 · Salomon XT-6 — vegan uniquement sur certaines déclinaisons : ni les Allbirds en laine ni les Samba en cuir ne sont vegan" },
];

const DATA_LEVELS = [
  {
    title: "Fait de gamme",
    body: "Ce qui est stable sur plusieurs générations : positionnement de la ligne, type d'appui, famille d'usage.",
    example: "« Brooks Adrenaline GTS : ligne de stabilité suivie depuis des années. »",
  },
  {
    title: "Donnée indicative",
    body: "Ce qui bouge à chaque version : poids, drop, prix. Toujours affiché avec « ≈ » et une fourchette.",
    example: "« Amorti élevé · drop ≈ 12 mm · poids ≈ 275 g (taille 42). »",
  },
  {
    title: "À vérifier",
    body: "Ce que nous refusons de deviner : version en cours, matière exacte, disponibilité des largeurs.",
    example: "« Poids à vérifier sur la fiche produit avant achat. »",
  },
];

const EXCLUDED = [
  { name: "Altra Lone Peak", reason: "Terrain incompatible : ce modèle ne couvre pas l'asphalte majoritaire de votre usage." },
  { name: "Nike Air Zoom Structure", reason: "Hors budget : 130 € minimum, soit plus de 15 % au-dessus de votre plafond." },
  { name: "Veja V-10", reason: "Ne respecte pas votre contrainte vegan sur la version cuir." },
];

const FAQ = [
  {
    q: "Pourquoi autant de questions avant une proposition ?",
    a: "Parce qu'une paire adaptée à un pied large et 20 km par semaine n'a rien à voir avec une paire pour un usage urbain occasionnel. Poser les questions d'abord évite de vous proposer un modèle générique — ou pire, un modèle qui vous blessera.",
  },
  {
    q: "Touchez-vous une commission sur les modèles proposés ?",
    a: "Non. Il n'y a aucun lien affilié et aucune marque partenaire. Les liens renvoient vers une recherche ouverte ou vers le site de la marque, jamais vers un panier.",
  },
  {
    q: "Pourquoi certains modèles sont-ils écartés ?",
    a: "Trois cas : un critère éliminatoire non respecté (terrain, budget, vegan), un score trop faible pour votre profil, ou des données insuffisantes. Chaque exclusion est affichée avec sa raison : c'est aussi informatif que la recommandation.",
  },
  {
    q: "Est-ce un avis médical ?",
    a: "Non. En cas de douleur plantaire, de tendinite, de hallux marqué, de pied diabétique ou de semelles orthopédiques, consultez un professionnel de santé. L'outil aide à préparer l'essai, il ne le remplace pas.",
  },
  {
    q: "Le prompt en Markdown est disponible ?",
    a: "Oui. Le prompt complet qui pilote l'assistant — règles, questions, méthode, format de réponse — est publié tel quel et copiable.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const start = () => navigate("/auth?returnTo=%2Fdashboard");
  const questionCount = STEPS.reduce((total, step) => total + step.questions.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* En-tête : filet unique, aligné sur la grille du contenu */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="text-[15px] font-medium tracking-[0.34em] uppercase">Semelle</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">conseil chaussures</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] text-muted-foreground md:flex">
            <a href="#methode" className="transition-colors hover:text-foreground">Méthode</a>
            <a href="#criteres" className="transition-colors hover:text-foreground">Critères</a>
            <a href="#familles" className="transition-colors hover:text-foreground">Familles</a>
            <Link to="/prompt" className="transition-colors hover:text-foreground">Prompt .md</Link>
          </nav>
          <Button onClick={start} size="sm" className="gap-2 rounded-none tracking-wide">
            Commencer
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-24">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-12">
          <motion.div {...fadeUp} className="lg:col-span-7">
            <p className="micro">Marche · Randonnée · Sneakers</p>
            <h1 className="mt-8 font-serif text-[2.75rem] leading-[1.04] tracking-[-0.015em] text-balance sm:text-6xl lg:text-[4.25rem]">
              On ne choisit pas une paire avant d&apos;avoir posé les bonnes questions.
            </h1>
            <p className="mt-8 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Semelle vous interroge d&apos;abord : usage, terrain, volume de marche, forme du pied,
              contraintes. Ensuite seulement, il propose des modèles réellement commercialisés — et il
              vous dit aussi ce qu&apos;il écarte, et pourquoi.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button onClick={start} className="gap-2 rounded-none px-5">
                Commencer l&apos;analyse
                <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="outline" className="rounded-none px-5">
                <a href="#methode">Lire la méthode</a>
              </Button>
            </div>

            <p className="mt-8 max-w-md text-xs leading-6 text-muted-foreground">
              Aucun lien affilié, aucune marque sponsorisée. Les données incertaines sont annoncées
              comme telles au lieu d&apos;être devinées.
            </p>
          </motion.div>

          {/* Aperçu du parcours */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <div className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <span className="micro">Parcours</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {questionCount} questions · {STEPS.length} étapes
                </span>
              </div>
              <ol className="divide-y divide-border">
                {STEPS.map((step, index) => (
                  <li key={step.id} className="flex items-baseline gap-5 px-6 py-4">
                    <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm">{step.title}</span>
                  </li>
                ))}
              </ol>
              <div className="border-t border-border px-6 py-6">
                <p className="micro">Exemple de résultat</p>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                  Profil : marche urbaine, 15–30 km, pronation, pied large, 130–180 €.
                </p>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Brooks Adrenaline GTS</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      stabilité · amorti élevé · drop ≈ 12 mm
                    </p>
                  </div>
                  <p className="font-serif text-3xl leading-none tabular-nums">82</p>
                </div>
                <div className="mt-4 h-px w-full bg-border">
                  <div className="h-px w-[82%] bg-foreground" />
                </div>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  Écarté : Brooks Cascadia — score trop faible pour ce profil (42/100).
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Chiffres clés */}
      <section className="border-y border-border">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-border px-6 sm:px-8 lg:grid-cols-4">
          {[
            { value: String(CATALOG.length), label: "lignes de modèles suivies" },
            { value: String(CRITERIA.length), label: "critères pris en compte" },
            { value: "3", label: "niveaux d'incertitude affichés" },
            { value: "0", label: "lien affilié" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`px-2 py-10 ${index >= 2 ? "border-t border-border lg:border-t-0" : ""}`}
            >
              <p className="font-serif text-4xl leading-none tabular-nums">{stat.value}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Méthode */}
      <section id="methode" className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 sm:py-32">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="micro">Méthode</p>
          <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em] sm:text-5xl">
            Quatre temps, dans cet ordre.
          </h2>
          <p className="mt-6 text-[15px] leading-7 text-muted-foreground">
            L&apos;assistant ne recommande rien avant d&apos;avoir compris votre usage. Le classement
            est déterministe : chaque point de score correspond à un critère explicite, jamais à une
            préférence de marque.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-px bg-border sm:grid-cols-2">
          {[
            {
              number: "01",
              title: "On pose les questions",
              body: "Cinq étapes, treize questions. Les réponses « je ne sais pas » sont acceptées : elles deviennent des points à vérifier, pas des suppositions.",
            },
            {
              number: "02",
              title: "On applique les filtres durs",
              body: "Budget, terrain, étanchéité, vegan, largeur du chaussant. Un modèle qui échoue est écarté, et l'exclusion est affichée avec sa raison.",
            },
            {
              number: "03",
              title: "On classe, critère par critère",
              body: "Usage, terrain, appui, amorti, chaussant, contraintes, style. Chaque modèle proposé affiche ses forces et ses limites.",
            },
            {
              number: "04",
              title: "On dit ce qui reste à vérifier",
              body: "Versions annuelles, poids selon la pointure, prix distributeur, avis professionnel en cas de douleur. Rien n'est présenté comme certain sans l'être.",
            },
          ].map((item, index) => (
            <motion.div
              key={item.number}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="bg-background p-8 sm:p-10"
            >
              <p className="micro tabular-nums">{item.number}</p>
              <h3 className="mt-6 text-lg font-medium tracking-[-0.01em]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Critères */}
      <section id="criteres" className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 sm:py-32">
          <motion.div {...fadeUp} className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="micro">Critères</p>
              <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em]">
                Ce que l&apos;analyse regarde.
              </h2>
              <p className="mt-6 text-[15px] leading-7 text-muted-foreground">
                Aucun critère caché, aucune pondération secrète : les treize questions ci-contre
                déterminent tout le classement.
              </p>
            </div>
            <dl className="lg:col-span-8">
              {CRITERIA.map((item) => (
                <div
                  key={item.title}
                  className="grid gap-1 border-t border-border py-5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8"
                >
                  <dt className="text-sm font-medium">{item.title}</dt>
                  <dd className="text-sm leading-6 text-muted-foreground">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* Niveaux de données */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 sm:py-32">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="micro">Honnêteté des données</p>
            <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em] sm:text-5xl">
              Trois niveaux, toujours distingués.
            </h2>
          </motion.div>
          <div className="mt-16 grid gap-px bg-border lg:grid-cols-3">
            {DATA_LEVELS.map((level, index) => (
              <motion.div
                key={level.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="bg-background p-8 sm:p-10"
              >
                <h3 className="text-sm font-medium tracking-[0.02em]">{level.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{level.body}</p>
                <p className="mt-6 border-t border-border pt-4 text-xs leading-6 text-muted-foreground italic">
                  {level.example}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Familles */}
      <section id="familles" className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 sm:py-32">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="micro">Familles couvertes</p>
            <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em] sm:text-5xl">
              {CATALOG.length} lignes suivies, six familles d&apos;usage.
            </h2>
            <p className="mt-6 text-[15px] leading-7 text-muted-foreground">
              Les lignes de modèles plutôt que des références figées : elles existent sur plusieurs
              générations et se renouvellent chaque année.
            </p>
          </motion.div>

          <div className="mt-16">
            {FAMILIES.map((family) => (
              <div
                key={family.label}
                className="grid gap-2 border-t border-border py-6 sm:grid-cols-[minmax(0,16rem)_1fr] sm:gap-10"
              >
                <p className="text-sm font-medium">{family.label}</p>
                <p className="text-sm leading-6 text-muted-foreground">{family.brands}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 border border-border bg-card p-8 sm:p-10">
            <p className="micro">Transparence des exclusions</p>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Ce qui est écarté est affiché avec sa raison. Trois exemples de rejets possibles :
            </p>
            <ul className="mt-8">
              {EXCLUDED.map((item) => (
                <li
                  key={item.name}
                  className="grid gap-1 border-t border-border py-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8"
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm leading-6 text-muted-foreground">{item.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 sm:py-32">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="micro">Questions fréquentes</p>
            <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em] sm:text-5xl">
              Avant de commencer.
            </h2>
          </motion.div>
          <div className="mt-14 max-w-3xl">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-t border-border py-6">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[15px] font-medium marker:hidden">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-20 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-24">
          <div className="max-w-xl">
            <p className="micro">Étape suivante</p>
            <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em]">
              Quelques questions, puis une liste courte et justifiée.
            </h2>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Créez votre espace pour retrouver vos analyses et comparer vos profils dans le temps.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Button onClick={start} className="w-full gap-2 rounded-none px-6 sm:w-auto">
              Commencer l&apos;analyse
              <ArrowRight className="size-4" />
            </Button>
            <Link
              to="/prompt"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Voir le prompt en Markdown
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <p className="text-[13px] font-medium tracking-[0.34em] uppercase">Semelle</p>
              <p className="mt-4 text-xs leading-6 text-muted-foreground">{WEAR_NOTE}</p>
            </div>
            <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs text-muted-foreground sm:grid-cols-1">
              <a href="#methode" className="transition-colors hover:text-foreground">Méthode</a>
              <a href="#criteres" className="transition-colors hover:text-foreground">Critères</a>
              <a href="#familles" className="transition-colors hover:text-foreground">Familles</a>
              <Link to="/prompt" className="transition-colors hover:text-foreground">Prompt .md</Link>
              <Link to="/auth?returnTo=%2Fdashboard" className="transition-colors hover:text-foreground">
                Se connecter
              </Link>
            </nav>
          </div>
          <Separator className="my-10" />
          <p className="text-xs leading-6 text-muted-foreground">
            Outil d&apos;aide au choix. Il ne remplace ni un essayage en magasin, ni l&apos;avis d&apos;un
            podologue ou d&apos;un médecin.
          </p>
        </div>
      </footer>
    </div>
  );
}
