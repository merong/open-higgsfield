export type SlidePreset = "basic" | "editorial" | "impact" | "soft";

export interface SlideStyle {
  bg: string;
  tx: string;
  acc: string;
  /* Ink on the accent (kicker pill). */
  accInk: string;
  rule: string;
  head: {
    family: string;
    weight: number;
    letterSpacing: string;
    lineHeight: number;
  };
  body: { family: string };
}

/* The showcase loads Pretendard; the studio will map --font-ohf-inter to it at
   integration. Slides state the face by name because they are exported as
   pictures, not themed by the app. */
const SANS =
  '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif';

export const SLIDE_STYLES: Record<SlidePreset, SlideStyle> = {
  basic: {
    bg: "#1d2a44",
    tx: "#ffffff",
    acc: "#ffd54a",
    accInk: "#1a1a1a",
    rule: "rgba(255, 255, 255, 0.22)",
    head: {
      family: SANS,
      weight: 800,
      letterSpacing: "-0.02em",
      lineHeight: 1.22,
    },
    body: { family: SANS },
  },
  editorial: {
    bg: "#f3ece0",
    tx: "#2a2320",
    acc: "#b5482f",
    accInk: "#ffffff",
    rule: "rgba(42, 35, 32, 0.18)",
    head: {
      family: '"Noto Serif KR", serif',
      weight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.26,
    },
    body: { family: SANS },
  },
  impact: {
    bg: "#0f0f10",
    tx: "#ffffff",
    acc: "#ff5a3c",
    accInk: "#1a1a1a",
    rule: "rgba(255, 255, 255, 0.22)",
    head: {
      family: `"Black Han Sans", ${SANS}`,
      weight: 400,
      letterSpacing: "0",
      lineHeight: 1.18,
    },
    body: { family: SANS },
  },
  soft: {
    bg: "#e6efe6",
    tx: "#22332b",
    acc: "#3f7d5d",
    accInk: "#ffffff",
    rule: "rgba(34, 51, 43, 0.2)",
    head: {
      family: `"Gowun Dodum", ${SANS}`,
      weight: 400,
      letterSpacing: "-0.01em",
      lineHeight: 1.26,
    },
    body: { family: `"Gowun Dodum", ${SANS}` },
  },
};

export const SLIDE_PRESETS = Object.keys(SLIDE_STYLES) as SlidePreset[];
