import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

/* vitest.config.ts does not set test.globals, so @testing-library/react's own
   afterEach-detection (`typeof afterEach === "function"` on the global) never
   fires and DOM from one `it` leaks into the next. Every component test in
   this plan renders more than once per file, so cleanup must be wired here
   instead of per test. */
afterEach(() => {
  cleanup();
});
