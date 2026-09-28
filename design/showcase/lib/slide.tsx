import {
  BodySlide,
  CoverSlide,
  CtaSlide,
  ListSlide,
  QuoteSlide,
  SlideFrame,
  type SlideFrameProps,
  type SlidePreset,
  type SlideRatio,
} from "@/index";

import { DECK, HANDLE, PHOTOS, type DeckSlide } from "../data";

export function renderSlide(
  s: DeckSlide,
  page: number,
  preset: SlidePreset,
  ratio: SlideRatio = "4:5",
  withImage = true,
  extra?: Partial<Omit<SlideFrameProps, "children" | "preset">>,
) {
  const image = withImage && s.photo ? PHOTOS[s.photo] : undefined;
  return (
    <SlideFrame
      preset={preset}
      ratio={ratio}
      edition="SUNNY SKIN LAB / FIELD NOTES"
      composition={
        s.kind === "cover" && preset === "editorial"
          ? "split"
          : s.kind === "cover" && preset === "soft"
            ? "inset"
            : "full"
      }
      image={image}
      dim={image ? s.dim : undefined}
      position={s.position}
      handle={HANDLE}
      page={`${page} / ${DECK.length}`}
      {...extra}
    >
      {s.kind === "cover" && (
        <CoverSlide kicker={s.kicker} title={s.title} sub={s.sub} />
      )}
      {s.kind === "body" && <BodySlide title={s.title} body={s.body} />}
      {s.kind === "list" && <ListSlide title={s.title} items={s.items ?? []} />}
      {s.kind === "quote" && <QuoteSlide quote={s.title} source={s.source} />}
      {s.kind === "cta" && (
        <CtaSlide title={s.title} sub={s.sub} pill={`${HANDLE} 팔로우`} />
      )}
    </SlideFrame>
  );
}
