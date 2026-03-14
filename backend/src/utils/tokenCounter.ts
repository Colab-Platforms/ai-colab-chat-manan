export function estimateTokenCount(content: string | any[]): number {
  if (!content) return 0;

  if (Array.isArray(content)) {
    let total = 0;
    for (const part of content) {
      if (part.type === "text" && typeof part.text === "string") {
        total += Math.ceil(part.text.length / 2.2);
      } else if (part.type === "image_url") {
        total += 300;
      } else if (part.type === "file" && part.file && typeof part.file.file_data === "string") {
        // Fallback for PDF base64 strings. Base64 is ~1.33x original size. 
        // We divide by 50 to provide a conservative baseline token count.
        total += Math.ceil(part.file.file_data.length / 50);
      }
    }
    return total;
  }

  if (typeof content === "string") {
    return Math.ceil(content.length / 2.2);
  }

  return 0;
}

export function estimateMessageTokens(
  messages: { role: string; content: string | any[] }[],
): number {
  let total = 0;

  for (const msg of messages) {
    if (!msg.content) continue;

    const tokens = estimateTokenCount(msg.content);
    total += tokens + 6;
  }

  return total + 3;
}
