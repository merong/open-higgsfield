// The Models API exposes availability, not endpoint/effort capabilities.
// Keep these explicit profiles aligned with the official model pages; do not
// infer capabilities for future model names, fine-tunes, or specialized variants.
// Sources and the verification date are recorded in docs/ai-quick-card.md.
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
type Profile = { efforts: readonly ReasoningEffort[]; defaultEffort: ReasoningEffort | null };
const basic: Profile = { efforts: [], defaultEffort: null };
const reasoning: Profile = { efforts: ["low", "medium", "high"], defaultEffort: "low" };
const gpt5: Profile = { efforts: ["minimal", "low", "medium", "high"], defaultEffort: "low" };
const gpt51: Profile = { efforts: ["none", "low", "medium", "high"], defaultEffort: "low" };
const gpt52: Profile = { efforts: ["none", "low", "medium", "high", "xhigh"], defaultEffort: "low" };
const gpt56: Profile = { efforts: ["none", "low", "medium", "high", "xhigh", "max"], defaultEffort: "low" };
const codex: Profile = { efforts: ["low", "medium", "high", "xhigh"], defaultEffort: "low" };
const profiles: Record<string, Profile> = {
  "gpt-6-astra": { efforts: ["low", "medium", "high", "xhigh", "max"], defaultEffort: "low" },
  "gpt-5.6": gpt56, "gpt-5.6-sol": gpt56, "gpt-5.6-terra": gpt56, "gpt-5.6-luna": gpt56,
  "gpt-5.5": gpt52, "gpt-5.5-pro": { efforts: ["medium", "high", "xhigh"], defaultEffort: "medium" },
  "gpt-5.4": gpt52, "gpt-5.4-mini": gpt52, "gpt-5.4-nano": gpt52,
  "gpt-5.2": gpt52, "gpt-5.1": gpt51,
  "gpt-5": gpt5, "gpt-5-mini": gpt5, "gpt-5-nano": gpt5,
  "gpt-5-pro": { efforts: ["high"], defaultEffort: "high" },
  "gpt-5.3-codex": codex, "gpt-5.2-codex": codex,
  "gpt-4.1": basic, "gpt-4.1-mini": basic, "gpt-4.1-nano": basic,
  "gpt-4o": basic, "gpt-4o-mini": basic,
  "o1": reasoning, "o3": reasoning, "o3-mini": reasoning, "o4-mini": reasoning,
};
export function openAiModelProfile(id: string): Profile | null {
  // This snapshot predates Structured Outputs.
  if (id === "gpt-4o-2024-05-13") return null;
  const alias = id.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  return Object.hasOwn(profiles, alias) ? profiles[alias] : null;
}
export function openAiModelOption(id: string) {
  const profile = openAiModelProfile(id);
  return { id, supported: !!profile, efforts: profile?.efforts ?? [], defaultEffort: profile?.defaultEffort ?? null };
}
export type OpenAiModelOption = ReturnType<typeof openAiModelOption>;
