/**
 * ሁለት ስሞች የአንድ ሰው መሆናቸውን ይገምታል (መታወቂያ እና የባንክ ሂሳብ)።
 * የመጀመሪያዎቹ ሁለት ቃላት (ስምና የአባት ስም) ከተስማሙ ይበቃል፤ ባንኮች የአያት ስም ይጨምራሉ ወይም ይተዋሉ።
 */
function words(name: string): string[] {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !["ato", "w/ro", "wro", "mr", "mrs", "ms", "አቶ", "ወ/ሮ", "ወሮ"].includes(word));
}

export function namesMatch(a: string, b: string): boolean {
  const left = words(a);
  const right = words(b);
  if (left.length === 0 || right.length === 0) return false;
  const count = Math.min(2, left.length, right.length);
  return left.slice(0, count).every((word, index) => word === right[index]);
}
