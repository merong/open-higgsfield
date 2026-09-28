import { thumbnailBackground } from "./thumbnails";

/* Photo-backed examples also replace the legacy gradient artwork. */
export const artFor = thumbnailBackground;
export const swatchFor = thumbnailBackground;

/* Film-grain overlay shared by every artwork, defined once as a CSS custom
   property so the data URI lives in one place. */
export const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";
