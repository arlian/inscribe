/** Unicode-aware slug: keeps letters and numbers from any script, replaces everything else with hyphens. */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "untitled";
}

/** Produces collision-safe slugs for a batch of names, e.g. "jane-doe", "jane-doe-2". */
export function createSlugger(): (name: string) => string {
  const seen = new Map<string, number>();
  return (name: string): string => {
    const base = slugify(name);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}
