import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Field } from "./Field";

it("labels its control and shows marks, counter and hint", () => {
  render(
    <Field label="주제" htmlFor="t" required="필수" counter={{ value: 16, max: 120 }} hint="한 줄이면 됩니다">
      <input id="t" />
    </Field>,
  );
  expect(screen.getByLabelText(/주제/)).toHaveAttribute("id", "t");
  expect(screen.getByText("필수")).toHaveClass("ohf-field-mark--req");
  expect(screen.getByText("16 / 120")).toHaveClass("ohf-field-counter");
  expect(screen.getByText("한 줄이면 됩니다")).toHaveClass("ohf-field-hint");
});

it("turns red past the limit and on error", () => {
  const { container, rerender } = render(
    <Field label="본문" counter={{ value: 96, max: 90 }}>
      <textarea />
    </Field>,
  );
  expect(container.firstChild).toHaveClass("ohf-field--error");
  expect(screen.getByText("96 / 90")).toHaveClass("ohf-field-counter--over");
  rerender(
    <Field label="본문" error="90자를 넘었습니다">
      <textarea />
    </Field>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("90자를 넘었습니다");
});
