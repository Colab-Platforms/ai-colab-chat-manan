const ICON_PREFIXES = [
  "anthropic",
  "deepseek",
  "google",
  "moonshotai",
  "openai",
  "perplexity",
  "x-ai",
];

export function getModelIcon(externalId: string): string | null {
  if (!externalId) return null;
  const lower = externalId.toLowerCase();
  const match = ICON_PREFIXES.find((prefix) => lower.startsWith(prefix));
  return match ? `/model_icons/${match}.png` : null;
}
