import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SlideFrame } from "./SlideFrame";
import { SLIDE_PRESETS, SLIDE_STYLES } from "./styles";
import { BodySlide, CoverSlide, CtaSlide, ListSlide, QuoteSlide } from "./templates";

describe("SlideFrame", () => {
  it("carries the preset as custom properties and the ratio as aspect-ratio", () => {
    const { container } = render(
      <SlideFrame preset="editorial" ratio="1:1" handle="@sunny" page="1 / 8">
        <CoverSlide title="제목" />
      </SlideFrame>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("ohf-slide", "ohf-slide--end");
    expect(el.dataset.preset).toBe("editorial");
    expect(el.style.getPropertyValue("--sl-bg")).toBe(SLIDE_STYLES.editorial.bg);
    expect(el.style.getPropertyValue("--sl-head")).toBe(SLIDE_STYLES.editorial.head.family);
    expect(el.style.aspectRatio).toBe("1 / 1");
    expect(el.querySelector(".ohf-slide-foot")).toHaveTextContent("@sunny");
  });

  it("switches to white text over a picture and draws the dim layer", () => {
    const { container, rerender } = render(
      <SlideFrame preset="basic" image="/p.png" dim={0.58}>
        <BodySlide title="t" body="b" />
      </SlideFrame>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("ohf-slide--photo");
    expect(el.style.getPropertyValue("--sl-tx")).toBe("#ffffff");
    expect(el.style.getPropertyValue("--sl-dim")).toBe("0.58");
    expect(container.querySelector(".ohf-slide-dim")).not.toHaveClass("ohf-slide-dim--grad");
    rerender(
      <SlideFrame preset="basic" image="/p.png" dim="grad">
        <BodySlide title="t" body="b" />
      </SlideFrame>,
    );
    expect(container.querySelector(".ohf-slide-dim")).toHaveClass("ohf-slide-dim--grad");
  });

  it("has four presets", () => {
    expect(SLIDE_PRESETS).toEqual(["basic", "editorial", "impact", "soft"]);
  });
});

describe("templates", () => {
  it("render their parts", () => {
    render(
      <SlideFrame preset="basic">
        <CoverSlide kicker="가이드" title="표지" sub="부제" />
        <ListSlide title="목록" items={[{ label: "출퇴근", value: "SPF30" }, { label: "야외" }]} numbered />
        <QuoteSlide quote="인용" source="출처" />
        <CtaSlide title="CTA" pill="팔로우" />
      </SlideFrame>,
    );
    expect(screen.getByText("가이드")).toHaveClass("ohf-slide-kicker");
    expect(screen.getByRole("heading", { name: "표지" })).toHaveClass("ohf-slide-title");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("01")).toHaveClass("ohf-slide-num");
    expect(screen.getByText("인용").tagName).toBe("BLOCKQUOTE");
    expect(screen.getByText("팔로우")).toHaveClass("ohf-slide-pill");
  });
});
