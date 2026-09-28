/** Parse line-based pairs without discarding copy or inventing a missing value. */
export function parsePairedCopy(body: string, allowIntroduction = false) {
  const introduction: string[] = [];
  const pairs: { label: string; value: string }[] = [];
  for (const line of body.split("\n").map(line => line.trim()).filter(Boolean)) {
    const separator = line.indexOf("|");
    if (separator < 0) {
      if (!allowIntroduction || pairs.length) return null;
      introduction.push(line);
      continue;
    }
    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!label || !value) return null;
    pairs.push({ label, value });
  }
  return pairs.length ? { introduction, pairs } : null;
}
