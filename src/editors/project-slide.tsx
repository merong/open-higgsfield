"use client";
import {
  SlideFrame,
  CoverSlide,
  BodySlide,
  ListSlide,
  QuoteSlide,
  CtaSlide,
  MetricSlide,
  CompareSlide,
} from "@openhiggsfield/design";
import "./card-reading.css";
import "./typography.css";
import { TypographyFonts } from "./typography-panel";
import { typographyStyle } from "@/projects/typography";
import type { CSSProperties } from "react";
import type { Project, Slot } from "@/projects/types";
export function ProjectSlide({
  project,
  slot,
  index = 0,
  overlay = false,
}: {
  project: Project;
  slot: Slot;
  index?: number;
  overlay?: boolean;
}) {
  const items = slot.body.split("\n").filter(Boolean);
  const image = slot.media?.kind === "image" ? slot.media.url : undefined;
  return (
    <><TypographyFonts value={project.typography}/><SlideFrame
      style={project.typography ? typographyStyle(project.typography) as CSSProperties : undefined}
      preset={project.preset}
      ratio={project.ratio}
      image={image}
      composition={slot.composition}
      dim={slot.dim}
      imagePosition={`center ${slot.crop}%`}
      edition={project.brand || undefined}
      handle={project.brand || undefined}
      page={`${index + 1} / ${project.slots.length}`}
      showFooter={project.format !== "reels"}
      className={[project.typography ? "ws-typography" : "", overlay ? "ws-slide-overlay" : "", project.format === "card-news" ? `ws-card-reading ws-card-reading--${slot.readingLayout || "balanced"}` : ""].join(" ")}
      position={slot.kind === "quote" ? "mid" : "end"}
    >
      {slot.kind === "cover" || slot.kind === "hero" ? (
        <CoverSlide
          title={slot.title}
          sub={slot.body}
          kicker={slot.kicker || undefined}
        />
      ) : slot.kind === "list" ? (
        <ListSlide
          title={slot.title}
          items={items.map((label) => ({ label }))}
        />
      ) : slot.kind === "quote" ? (
        <QuoteSlide quote={slot.title} source={slot.body} />
      ) : slot.kind === "metric" ? (
        <MetricSlide
          value={slot.kicker}
          title={slot.title}
          detail={slot.body}
        />
      ) : slot.kind === "compare" ? (
        <CompareSlide
          title={slot.title}
          columns={items.map((line) => {
            const [label, ...body] = line.split(":");
            return { label, body: body.join(":") };
          })}
        />
      ) : slot.kind === "cta" ? (
        <CtaSlide title={slot.title} sub={slot.body} pill={slot.cta} />
      ) : (
        <BodySlide title={slot.title} body={slot.body} />
      )}
    </SlideFrame></>
  );
}
