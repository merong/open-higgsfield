import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ProjectHeader } from "./ProjectHeader";

it("has a back link, a heading, tags, status and actions", () => {
  render(
    <ProjectHeader
      back={{ href: "/projects", label: "프로젝트 목록으로" }}
      title="여름 자외선 차단제"
      tags={<span>카드뉴스</span>}
      status="저장됨"
      actions={<button type="button">내보내기</button>}
    />,
  );
  expect(screen.getByRole("link", { name: "프로젝트 목록으로" })).toHaveAttribute("href", "/projects");
  expect(screen.getByRole("heading", { level: 1, name: "여름 자외선 차단제" })).toHaveClass("ohf-phead-title");
  expect(screen.getByText("저장됨")).toHaveClass("ohf-phead-status");
  expect(screen.getByRole("button", { name: "내보내기" })).toBeInTheDocument();
});

it("uses a button when back has no href", () => {
  render(<ProjectHeader back={{ onClick: () => {}, label: "뒤로" }} title="t" />);
  expect(screen.getByRole("button", { name: "뒤로" })).toBeInTheDocument();
});
