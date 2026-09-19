import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Persistance des analyses : une analyse = un jeu de réponses au questionnaire.
 * Le calcul des recommandations vit dans `src/lib/shoe-advisor.ts` et est partagé
 * avec le front, afin qu'une seule source de vérité définisse le classement.
 */

const answersValidator = v.record(
  v.string(),
  v.union(v.string(), v.array(v.string())),
);

type StoredAnswers = Record<string, string | string[]>;

const MAX_ANSWER_KEYS = 16;
const MAX_OPTION_LENGTH = 64;

/** Nettoyage défensif : on ne stocke que des chaînes d'options courtes. */
function sanitize(raw: Record<string, string | string[]>): StoredAnswers {
  const clean: StoredAnswers = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (count >= MAX_ANSWER_KEYS) break;
    if (key.length > MAX_OPTION_LENGTH) continue;
    if (typeof value === "string") {
      if (value.length === 0 || value.length > MAX_OPTION_LENGTH) continue;
      clean[key] = value;
      count += 1;
    } else if (Array.isArray(value)) {
      const list = value
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0 && entry.length <= MAX_OPTION_LENGTH)
        .slice(0, 8);
      if (list.length === 0) continue;
      clean[key] = list;
      count += 1;
    }
  }
  return clean;
}

/** Enregistre une analyse et renvoie son identifiant. */
export const saveAnalysis = mutation({
  args: { answers: answersValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Connexion requise pour enregistrer une analyse.");

    const answers = sanitize(args.answers);
    if (Object.keys(answers).length === 0) throw new Error("Aucune réponse exploitable transmise.");

    return await ctx.db.insert("advisories", {
      userId,
      answers,
      createdAt: Date.now(),
    });
  },
});

/** Dernière analyse enregistrée par l'utilisateur. */
export const latestAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const latest = await ctx.db
      .query("advisories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (latest === null) return null;
    return { _id: latest._id, createdAt: latest.createdAt, answers: latest.answers };
  },
});

/** Historique des analyses, du plus récent au plus ancien. */
export const analysisHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("advisories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(8);
  },
});

/** Supprime une analyse (uniquement la sienne). */
export const removeAnalysis = mutation({
  args: { id: v.id("advisories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Connexion requise.");

    const row = await ctx.db.get(args.id);
    if (row === null || row.userId !== userId) return;

    await ctx.db.delete(args.id);
  },
});
