import { describe, expect, it } from "vitest";

import pkg from "../package.json";

describe("package.json", () => {
  it("exposes the library entry and the stylesheet", () => {
    expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", import: "./dist/index.js" });
    expect(pkg.exports["./ohf.css"]).toBe("./dist/ohf.css");
  });

  it("leaves React to the consuming app", () => {
    expect(Object.keys(pkg.peerDependencies)).toEqual(["react", "react-dom"]);
  });
});
