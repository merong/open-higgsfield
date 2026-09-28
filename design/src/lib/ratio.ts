const RATIO = /^(\d+):(\d+)$/;

/* A fixed optical box: the long side is always 14px, so 21:9 and 1:1 leave
   their labels on the same rail. */
export function ratioBox(value: string): { width: number; height: number } | null {
  const match = RATIO.exec(value);
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  const scale = 14 / Math.max(w, h);
  return { width: Math.max(5, Math.round(w * scale)), height: Math.max(5, Math.round(h * scale)) };
}

export function ratioToCss(value: unknown, fallback: string): string {
  const match = RATIO.exec(String(value ?? ""));
  return match ? `${match[1]} / ${match[2]}` : fallback;
}
