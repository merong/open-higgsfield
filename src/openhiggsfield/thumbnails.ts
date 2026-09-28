import type { Surface } from "@/generation/catalog";
import { SAMPLES } from "./data";

/* Stable filenames keep every shuffled starter paired with its own artwork. */
export const THUMBNAIL_IDS: Record<Surface, readonly string[]> = {
  "image": [
    "beekeeper",
    "recording-studio",
    "concrete-poppies",
    "rain-alley",
    "luthier",
    "salt-ponds",
    "watch-movement",
    "fern-house",
    "espresso",
    "ski-lodge",
    "kneading-dough",
    "observatory"
  ],
  "video": [
    "forest-dawn",
    "ink-water",
    "neon-market",
    "night-diner",
    "sculptor",
    "lighthouse",
    "canyon",
    "greenhouse",
    "record-dancer",
    "swimmer",
    "train-viaduct",
    "glass-tower"
  ]
};

export const thumbnailUrl = (id: string) => `/content/thumbnails/${id}.webp`;
export function thumbnailFor(surface: Surface, prompt: string): string {
  const index = SAMPLES[surface].indexOf(prompt);
  return thumbnailUrl(THUMBNAIL_IDS[surface][index] ?? (surface === "video" ? "forest-dawn" : "concrete-poppies"));
}
export function thumbnailBackground(surface: Surface, prompt: string): string {
  return `url("${thumbnailFor(surface, prompt)}") center / cover no-repeat #151719`;
}

