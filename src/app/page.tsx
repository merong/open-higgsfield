import type { Metadata } from "next";
import { OpenHiggsfieldApp } from "@/openhiggsfield/openhiggsfield-app";

/* Title, description and the Open Graph block all come from the root, which
   already describes this surface. Only the canonical link is route-specific. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function OpenHiggsfieldPage() {
  return <OpenHiggsfieldApp fontClassName="ws-studio" />;
}
