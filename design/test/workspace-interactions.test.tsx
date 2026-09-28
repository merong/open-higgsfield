import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AssetCard,
  Button,
  Pagination,
  Progress,
  SearchField,
  TimelineClip,
} from "../src";
import { Projects } from "../showcase/screens/Projects";
import { EditorGenerating } from "../showcase/screens/Editors";
import { SlideFrame, BodySlide } from "../src/slides";

describe("workspace interactions", () => {
  it.each([{ disabled: true }, { busy: true }, { loading: true }])(
    "blocks link activation while unavailable: %o",
    (props) => {
      const click = vi.fn();
      render(
        <Button href="/destination" onClick={click} {...props}>
          Continue
        </Button>,
      );
      const link = screen.getByRole("link");
      fireEvent.click(link);
      expect(click).not.toHaveBeenCalled();
      expect(link).not.toHaveAttribute("href");
      expect(link).toHaveAttribute("aria-disabled", "true");
    },
  );
  it("searches and clears a controlled value", () => {
    function Example() {
      const [q, setQ] = useState("");
      return (
        <SearchField
          value={q}
          onValueChange={setQ}
          label="Search"
          clearLabel="Clear"
        />
      );
    }
    render(<Example />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "summer" },
    });
    expect(screen.getByRole("searchbox")).toHaveValue("summer");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
  it("does not navigate beyond an empty or last page", () => {
    const change = vi.fn();
    const { rerender } = render(
      <Pagination
        page={1}
        total={0}
        onPageChange={change}
        label="Pages"
        previousLabel="Previous"
        nextLabel="Next"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(change).not.toHaveBeenCalled();
    rerender(
      <Pagination
        page={3}
        total={3}
        onPageChange={change}
        label="Pages"
        previousLabel="Previous"
        nextLabel="Next"
      />,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(change).toHaveBeenCalledWith(2);
  });
  it("clamps progress and represents indeterminate progress honestly", () => {
    const { rerender } = render(<Progress label="Rendering" value={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    rerender(<Progress label="Rendering" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow",
    );
  });
  it("selects assets and timeline clips with real buttons", () => {
    const asset = vi.fn(),
      clip = vi.fn();
    render(
      <>
        <AssetCard title="Still life" selected onClick={asset} />
        <TimelineClip label="Opening" duration="00:04" onClick={clip} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Still life" }));
    fireEvent.click(screen.getByRole("button", { name: /Opening/ }));
    expect(asset).toHaveBeenCalledOnce();
    expect(clip).toHaveBeenCalledOnce();
  });
  it("filters projects and recovers from empty results", () => {
    render(<Projects />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "not-a-project" },
    });
    expect(screen.getByText("일치하는 프로젝트가 없습니다")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(
      screen.queryByText("일치하는 프로젝트가 없습니다"),
    ).not.toBeInTheDocument();
  });
  it("keeps selection, text edits, duplication and pagination synchronized", () => {
    render(<EditorGenerating />);
    fireEvent.click(screen.getByRole("button", { name: "다음 슬라이드" }));
    expect(screen.getByLabelText("제목")).toHaveValue(
      "SPF와 PA는 다른 것을 막아요",
    );
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "수정한 제목" },
    });
    expect(screen.getByRole("heading", { name: "수정한 제목" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "슬라이드 복제" }));
    expect(screen.getAllByRole("button", { name: "수정한 제목" })).toHaveLength(
      2,
    );
    fireEvent.click(screen.getByRole("button", { name: "슬라이드 삭제" }));
    expect(screen.getAllByRole("button", { name: "수정한 제목" })).toHaveLength(
      1,
    );
  });
  it("uses preset ink on separated photo compositions and clamps dim", () => {
    const { container, rerender } = render(
      <SlideFrame preset="editorial" image="/photo.jpg" composition="split">
        <BodySlide title="Title" body="Text" />
      </SlideFrame>,
    );
    expect(
      (container.firstChild as HTMLElement).style.getPropertyValue("--sl-tx"),
    ).toBe("#2a2320");
    expect(container.querySelector(".ohf-slide-dim")).toBeNull();
    rerender(
      <SlideFrame preset="editorial" image="/photo.jpg" dim={2}>
        <BodySlide title="Title" body="Text" />
      </SlideFrame>,
    );
    expect(
      (container.firstChild as HTMLElement).style.getPropertyValue("--sl-dim"),
    ).toBe("1");
  });
});
