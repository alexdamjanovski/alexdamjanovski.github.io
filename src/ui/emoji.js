/**
 * Geometric squares like ⬛ (U+2B1B) are "emoji-capable" but often render as
 * text symbols in monospace fonts (white bars on dark backgrounds). Append
 * the emoji variation selector (U+FE0F) so browsers use color emoji glyphs.
 */
const AMBIGUOUS_SQUARES =
  /[\u25A0\u25A1\u25FB\u25FC\u25FD\u25FE\u2B1B\u2B1C](?!\uFE0F)/g;

export function normalizeScoreEmojis(text) {
  if (!text) return text;
  return text.replace(AMBIGUOUS_SQUARES, (ch) => `${ch}\uFE0F`);
}
