import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Alert } from "./Alert";

it("is an alert strip with an icon, text and an optional action", () => {
  render(<Alert action={<button type="button">다시 시도</button>}>생성 실패</Alert>);
  const el = screen.getByRole("alert");
  expect(el).toHaveClass("ohf-alert");
  expect(el.querySelector(".ohf-alert-ic svg")).not.toBeNull();
  expect(el.querySelector(".ohf-alert-text")).toHaveTextContent("생성 실패");
  expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
});
