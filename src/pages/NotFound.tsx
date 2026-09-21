import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground"
    >
      <div className="w-full max-w-md text-center">
        <p className="micro">Erreur 404</p>
        <h1 className="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.01em]">
          Cette page n&apos;existe pas.
        </h1>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          Le lien est peut-être obsolète. Le questionnaire, lui, est toujours là.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="gap-2 rounded-none px-5">
            <Link to="/analyse">
              Lancer l&apos;analyse
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none px-5">
            <Link to="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
