export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // A standard conservative heuristic: ~1 token per 3.5 characters
  return Math.ceil(text.length / 3.5);
}

export function estimateMessageTokens(
  messages: { role: string; content: string }[],
): number {
  let total = 0;
  for (const msg of messages) {
    if (!msg.content) continue;
    total += estimateTokenCount(msg.content) + 4;
  }
  return total + 3;
}
