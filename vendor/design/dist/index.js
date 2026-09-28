import { jsxs as i, jsx as e, Fragment as y } from "react/jsx-runtime";
import { useRef as $, useId as z, useEffect as B, useLayoutEffect as W, useState as Z } from "react";
const j = "#0a0a0b", q = "#101112", G = "#151719", K = "#1a1d1f", U = "#222629", _ = "#2b3033", Q = "rgba(255, 255, 255, 0.06)", Y = "#edefef", J = "#a8aeaf", X = "#878e90", ee = "#7d8486", ae = "#d1fe17", ne = "rgba(6, 9, 8, 0.7)", re = "inset 0 1px 0 rgba(255, 255, 255, 0.045)", se = "cubic-bezier(0.2, 0, 0, 1)", ie = "#ff8d78", le = "#a5cfb8", ce = "#e7bd83", te = "#9bbfe0", oe = {
  bg: j,
  rail: q,
  s1: G,
  s2: K,
  s3: U,
  s4: _,
  line: Q,
  "line-2": "rgba(255, 255, 255, 0.11)",
  tx: Y,
  tx2: J,
  tx3: X,
  tx4: ee,
  "tx-off": "#5c6365",
  accent: ae,
  "accent-strong": "#ddfe51",
  "accent-ink": "#141a02",
  "accent-08": "rgba(209, 254, 23, 0.08)",
  "accent-14": "rgba(209, 254, 23, 0.14)",
  "accent-32": "rgba(209, 254, 23, 0.32)",
  plate: ne,
  "plate-ink": "rgba(246, 250, 248, 0.9)",
  "shadow-1": "0 1px 2px rgba(0, 0, 0, 0.4)",
  "shadow-2": "0 4px 12px rgba(0, 0, 0, 0.3), 0 16px 40px rgba(0, 0, 0, 0.35)",
  "shadow-3": "0 8px 24px rgba(0, 0, 0, 0.4), 0 32px 88px rgba(0, 0, 0, 0.52)",
  glint: re,
  ease: se,
  "ease-slide": "cubic-bezier(0.16, 1, 0.3, 1)",
  "font-ui": "var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif",
  danger: ie,
  "danger-bg": "rgba(255, 141, 120, 0.1)",
  "danger-line": "rgba(255, 141, 120, 0.28)",
  "radius-xs": "4px",
  "radius-sm": "6px",
  "radius-md": "8px",
  "radius-ctl": "10px",
  "radius-lg": "14px",
  "radius-bar": "15px",
  "radius-xl": "24px",
  "radius-pill": "999px",
  "h-xs": "28px",
  "h-sm": "32px",
  "h-md": "36px",
  "h-lg": "38px",
  "h-bar": "46px",
  "fs-2xs": "10.5px",
  "fs-xs": "11.5px",
  "fs-sm": "12.5px",
  "fs-md": "13px",
  "fs-base": "14px",
  "fs-lg": "15px",
  "fs-title": "22px",
  "fw-medium": "500",
  "fw-strong": "550",
  "fw-bold": "600",
  "fw-display": "620",
  "ls-tight": "-0.005em",
  "ls-heading": "-0.015em",
  "ls-caps": "0.16em",
  "sp-0": "2px",
  "sp-1": "4px",
  "sp-2": "6px",
  "sp-3": "8px",
  "sp-4": "12px",
  "sp-5": "16px",
  "sp-6": "20px",
  "sp-7": "24px",
  "sp-8": "32px",
  "dur-fast": "0.12s",
  "dur-base": "0.15s",
  "dur-slow": "0.2s",
  "dur-slide": "0.34s",
  "surface-canvas": "var(--bg)",
  "surface-panel": "var(--s1)",
  "surface-raised": "var(--s2)",
  "surface-hover": "var(--s3)",
  "text-primary": "var(--tx)",
  "text-secondary": "var(--tx2)",
  "text-muted": "var(--tx3)",
  "border-subtle": "var(--line)",
  "border-control": "var(--line-2)",
  "focus-ring": "var(--accent)",
  "fs-heading": "28px",
  "fs-display": "40px",
  "sp-section": "48px",
  "sp-page": "40px",
  "radius-panel": "18px",
  success: le,
  warning: ce,
  info: te
}, Ie = Object.freeze({ ...oe });
function Ce(a) {
  return `var(--${a})`;
}
function f(a) {
  return {
    width: a,
    height: a,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": !0
  };
}
function H({ size: a = 16 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "1.75", y: "1.75", width: "12.5", height: "12.5", rx: "3" }),
    /* @__PURE__ */ e("circle", { cx: "5.9", cy: "6", r: "1.3", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ e("path", { d: "M14 11.2 10.5 7.8 3.4 14" })
  ] });
}
function Se({ size: a = 16 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "1.75", y: "2.9", width: "12.5", height: "10.2", rx: "2.8" }),
    /* @__PURE__ */ e("path", { d: "M6.8 6 10.2 8 6.8 10 Z", fill: "currentColor", stroke: "none" })
  ] });
}
function $e({ size: a = 16 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M2.75 6.6v2.8" }),
    /* @__PURE__ */ e("path", { d: "M6.25 3.8v8.4" }),
    /* @__PURE__ */ e("path", { d: "M9.75 5.6v4.8" }),
    /* @__PURE__ */ e("path", { d: "M13.25 7v2" })
  ] });
}
function ze({ size: a = 16 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "1.9", y: "6.35", width: "12.2", height: "7.75", rx: "2.2" }),
    /* @__PURE__ */ e("path", { d: "M4.1 4.15h7.8" }),
    /* @__PURE__ */ e("path", { d: "M5.6 1.9h4.8" })
  ] });
}
function Ae({ size: a = 15 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("circle", { cx: "5.6", cy: "10.2", r: "3.1" }),
    /* @__PURE__ */ e("path", { d: "M7.9 7.9 13.2 2.6M10.8 5l1.7 1.7M8.9 6.9l1.7 1.7" })
  ] });
}
function R({ size: a = 10 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M4 6.2 8 10.2 12 6.2" }) });
}
function L({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M4 4l8 8M12 4l-8 8" }) });
}
function I({ size: a = 13 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), strokeWidth: 1.8, children: /* @__PURE__ */ e("path", { d: "M3 8.4 6.4 11.8 13 4.6" }) });
}
function de({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("circle", { cx: "7", cy: "7", r: "4.4" }),
    /* @__PURE__ */ e("path", { d: "M10.4 10.4 13.6 13.6" })
  ] });
}
function Be({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M13.4 8a5.4 5.4 0 1 1-1.6-3.85" }),
    /* @__PURE__ */ e("path", { d: "M13.6 1.9v2.5h-2.5" })
  ] });
}
function He({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M13.2 8a5.2 5.2 0 1 1-1.55-3.7" }),
    /* @__PURE__ */ e("path", { d: "M13.4 2.2v2.4H11" })
  ] });
}
function F({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M8 2.6 14.2 13H1.8Z" }),
    /* @__PURE__ */ e("path", { d: "M8 6.6v3" }),
    /* @__PURE__ */ e("path", { d: "M8 11.4h.01" })
  ] });
}
function Re({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M2.9 8h9.5" }),
    /* @__PURE__ */ e("path", { d: "M8.9 4.5 12.4 8l-3.5 3.5" })
  ] });
}
function he({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M8 3.2v9.6M3.2 8h9.6" }) });
}
function fe({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M3.2 8h9.6" }) });
}
function ue({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M4.3 2.6h7.4l2.4 3.6L8 13.4 1.9 6.2z" }),
    /* @__PURE__ */ e("path", { d: "M1.9 6.2h12.2" })
  ] });
}
function Le({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("circle", { cx: "8", cy: "8", r: "5.9" }),
    /* @__PURE__ */ e("path", { d: "M8 4.6V8l2.5 1.6" })
  ] });
}
function Fe({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M9.2 1.9H5a2.1 2.1 0 0 0-2.1 2.1v8a2.1 2.1 0 0 0 2.1 2.1h6a2.1 2.1 0 0 0 2.1-2.1V5.8z" }),
    /* @__PURE__ */ e("path", { d: "M9.2 1.9v3.9h3.9" })
  ] });
}
function Pe({ size: a = 18 }) {
  return /* @__PURE__ */ e("svg", { width: a, height: a, viewBox: "0 0 16 16", "aria-hidden": !0, children: /* @__PURE__ */ e("path", { d: "M4.9 3.2 12.4 8 4.9 12.8Z", fill: "currentColor" }) });
}
function De({ size: a = 9 }) {
  return /* @__PURE__ */ e("svg", { width: a, height: a, viewBox: "0 0 16 16", "aria-hidden": !0, children: /* @__PURE__ */ e("path", { d: "M3.6 2.2 13.4 8 3.6 13.8Z", fill: "currentColor" }) });
}
function Te({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M8 2.6v7.2M4.9 7 8 10.2 11.1 7" }),
    /* @__PURE__ */ e("path", { d: "M2.8 13.2h10.4" })
  ] });
}
function Ee({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M13.2 9.4v3.1a1.7 1.7 0 0 1-1.7 1.7H3.5a1.7 1.7 0 0 1-1.7-1.7V4.5a1.7 1.7 0 0 1 1.7-1.7h3.1" }),
    /* @__PURE__ */ e("path", { d: "M9.7 2.2h4.1v4.1M7.3 8.7l6.3-6.3" })
  ] });
}
function Oe({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M8 10.6V3.4M4.9 6.5 8 3.4l3.1 3.1" }),
    /* @__PURE__ */ e("path", { d: "M2.8 13.2h10.4" })
  ] });
}
function Ve({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "5.6", y: "5.6", width: "8.6", height: "8.6", rx: "2.2" }),
    /* @__PURE__ */ e("path", { d: "M10.4 5.6V4A2.2 2.2 0 0 0 8.2 1.8H4A2.2 2.2 0 0 0 1.8 4v4.2A2.2 2.2 0 0 0 4 10.4h1.6" })
  ] });
}
function We({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M2.2 4.6h3.1M8.3 4.6h5.5" }),
    /* @__PURE__ */ e("circle", { cx: "6.8", cy: "4.6", r: "1.5" }),
    /* @__PURE__ */ e("path", { d: "M2.2 11.4h5.5M10.7 11.4h3.1" }),
    /* @__PURE__ */ e("circle", { cx: "9.2", cy: "11.4", r: "1.5" })
  ] });
}
function Ze({ size: a = 15 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), strokeWidth: 1.8, children: [
    /* @__PURE__ */ e("path", { d: "M8 13V3.4" }),
    /* @__PURE__ */ e("path", { d: "M3.8 7.6 8 3.4l4.2 4.2" })
  ] });
}
const pe = "M8 13.2C8 13.2 2.4 9.75 2.4 6.05C2.4 4.28 3.78 3.05 5.4 3.05C6.5 3.05 7.5 3.65 8 4.55C8.5 3.65 9.5 3.05 10.6 3.05C12.22 3.05 13.6 4.28 13.6 6.05C13.6 9.75 8 13.2 8 13.2Z";
function je({ size: a = 14, filled: n = !1 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), fill: n ? "currentColor" : "none", children: /* @__PURE__ */ e("path", { d: pe }) });
}
function qe({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M2.9 4.25h10.2" }),
    /* @__PURE__ */ e("path", { d: "M6.15 4.25V3.05a1 1 0 0 1 1-1h1.7a1 1 0 0 1 1 1v1.2" }),
    /* @__PURE__ */ e("path", { d: "M4.55 6.1h6.9l-.45 6.4a1.5 1.5 0 0 1-1.5 1.4H6.5a1.5 1.5 0 0 1-1.5-1.4Z" })
  ] });
}
function me({ size: a = 13 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M2.8 8a5.2 5.2 0 1 0 1.55-3.7" }),
    /* @__PURE__ */ e("path", { d: "M2.6 2.2v2.4H5" })
  ] });
}
function Ge({ size: a = 12 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M2.75 6.6v2.8M6.25 4.4v7.2M9.75 6v4M13.25 7v2" }) });
}
function Ke({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M8 2.2 9.4 6.6 13.8 8 9.4 9.4 8 13.8 6.6 9.4 2.2 8 6.6 6.6Z" }),
    /* @__PURE__ */ e("path", { d: "M12.6 2.2v2.2M11.5 3.3h2.2" })
  ] });
}
function Ue({ size: a = 15 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M8 2.2a5.8 5.8 0 1 0 0 11.6c.8 0 1.3-.6 1.3-1.3 0-.4-.2-.7-.4-1-.2-.3-.3-.6-.3-.9 0-.7.6-1.2 1.3-1.2h1a2.9 2.9 0 0 0 2.9-2.9c0-2.5-2.6-4.3-5.8-4.3Z" }),
    /* @__PURE__ */ e("circle", { cx: "5.2", cy: "7.6", r: "0.7", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ e("circle", { cx: "6.8", cy: "5", r: "0.7", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ e("circle", { cx: "9.8", cy: "5", r: "0.7", fill: "currentColor", stroke: "none" })
  ] });
}
function ve({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: [4, 8, 12].map((n) => /* @__PURE__ */ i("g", { children: [
    /* @__PURE__ */ e("circle", { cx: "6", cy: n, r: "0.9", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ e("circle", { cx: "10", cy: n, r: "0.9", fill: "currentColor", stroke: "none" })
  ] }, n)) });
}
function _e({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("circle", { cx: "8", cy: "5.4", r: "2.6" }),
    /* @__PURE__ */ e("path", { d: "M2.9 13.6c.4-2.6 2.5-4.1 5.1-4.1s4.7 1.5 5.1 4.1" })
  ] });
}
function be({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "1.75", y: "2.4", width: "12.5", height: "11.2", rx: "2.2" }),
    /* @__PURE__ */ e("path", { d: "M1.75 5.8h12.5M1.75 10.2h12.5M5.4 2.4v11.2M10.6 2.4v11.2" })
  ] });
}
function Qe({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "1.75", y: "2.4", width: "12.5", height: "11.2", rx: "2.2" }),
    /* @__PURE__ */ e("path", { d: "M1.75 6.4h12.5M6.4 6.4v7.2" })
  ] });
}
function Ye({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("path", { d: "M8 2.4 13.8 5.3 8 8.2 2.2 5.3Z" }),
    /* @__PURE__ */ e("path", { d: "M2.2 8.3 8 11.2l5.8-2.9M2.2 11.1 8 14l5.8-2.9" })
  ] });
}
function Je({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "4.4", y: "1.75", width: "7.2", height: "12.5", rx: "1.8" }),
    /* @__PURE__ */ e("path", { d: "M7.2 11.8h1.6" })
  ] });
}
function Xe({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M3.2 3.6h9.6M8 3.6v9M5.6 12.6h4.8" }) });
}
function ea({ size: a = 14 }) {
  return /* @__PURE__ */ i("svg", { ...f(a), children: [
    /* @__PURE__ */ e("rect", { x: "1.75", y: "3.6", width: "12.5", height: "9.2", rx: "2" }),
    /* @__PURE__ */ e("path", { d: "M1.75 6.6h12.5M10.4 9.6h1.6" })
  ] });
}
function C({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M9.8 3.4 5.4 8l4.4 4.6" }) });
}
function P({ size: a = 14 }) {
  return /* @__PURE__ */ e("svg", { ...f(a), children: /* @__PURE__ */ e("path", { d: "M6.2 3.4 10.6 8l-4.4 4.6" }) });
}
function d(...a) {
  return a.filter(Boolean).join(" ");
}
function aa({ icon: a, action: n, className: r, children: s, ...l }) {
  return /* @__PURE__ */ i("div", { role: "alert", className: d("ohf-alert", r), ...l, children: [
    /* @__PURE__ */ e("span", { className: "ohf-alert-ic", children: a ?? /* @__PURE__ */ e(F, {}) }),
    /* @__PURE__ */ e("div", { className: "ohf-alert-text", children: s }),
    n
  ] });
}
function na({ initials: a, src: n, alt: r = "", size: s = 32, className: l, ...c }) {
  return /* @__PURE__ */ e("span", { className: d("ohf-avatar", `ohf-avatar--${s}`, l), ...c, children: n ? /* @__PURE__ */ e("img", { className: "ohf-avatar-img", src: n, alt: r }) : a });
}
function Ne({ className: a, ...n }) {
  return /* @__PURE__ */ e("kbd", { className: d("ohf-kbd", a), ...n });
}
function ge({ label: a, className: n }) {
  return a ? /* @__PURE__ */ e("span", { className: d("ohf-spinner", n), role: "status", "aria-label": a }) : /* @__PURE__ */ e("span", { className: d("ohf-spinner", n), "aria-hidden": "true" });
}
function ra({
  variant: a = "secondary",
  size: n = "md",
  icon: r,
  kbd: s,
  busy: l = !1,
  loading: c = !1,
  disabled: t = !1,
  href: o,
  type: u,
  className: p,
  children: m,
  ref: g,
  ...h
}) {
  const b = d(
    "ohf-btn",
    `ohf-btn--${a}`,
    `ohf-btn--${n}`,
    p
  ), N = t || l || c, v = /* @__PURE__ */ i(y, { children: [
    c ? /* @__PURE__ */ e(ge, {}) : r ? /* @__PURE__ */ e("span", { className: "ohf-btn-icon", children: r }) : null,
    m !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-btn-label", children: m }),
    s && /* @__PURE__ */ e(Ne, { children: s })
  ] });
  return o !== void 0 ? /* @__PURE__ */ e(
    "a",
    {
      ref: g,
      className: b,
      href: N ? void 0 : o,
      role: "link",
      "aria-disabled": N || void 0,
      "data-busy": l || void 0,
      "data-loading": c || void 0,
      ...h,
      tabIndex: N ? -1 : h.tabIndex,
      onClick: (x) => {
        if (N) {
          x.preventDefault();
          return;
        }
        h.onClick?.(x);
      },
      children: v
    }
  ) : /* @__PURE__ */ e(
    "button",
    {
      ref: g,
      type: u ?? "button",
      className: b,
      disabled: t || l || c,
      "data-busy": l || void 0,
      "data-loading": c || void 0,
      ...h,
      children: v
    }
  );
}
const D = /^(\d+):(\d+)$/;
function T(a) {
  const n = D.exec(a);
  if (!n) return null;
  const r = Number(n[1]), s = Number(n[2]), l = 14 / Math.max(r, s);
  return { width: Math.max(5, Math.round(r * l)), height: Math.max(5, Math.round(s * l)) };
}
function A(a, n) {
  const r = D.exec(String(a ?? ""));
  return r ? `${r[1]} / ${r[2]}` : n;
}
function sa({ pressed: a, dot: n = !1, ratio: r, className: s, type: l, children: c, ...t }) {
  const o = r ? T(r) : null;
  return /* @__PURE__ */ i("button", { type: l ?? "button", className: d("ohf-chip", s), "aria-pressed": a, ...t, children: [
    n && /* @__PURE__ */ e("span", { className: "ohf-chip-dot", "aria-hidden": "true" }),
    r && /* @__PURE__ */ e("span", { className: "ohf-chip-ratio", "aria-hidden": "true", style: o ?? void 0 }),
    /* @__PURE__ */ e("span", { className: "ohf-chip-label", children: c })
  ] });
}
function xe({ amount: a, unit: n, icon: r, locale: s = "ko-KR", className: l, ...c }) {
  return /* @__PURE__ */ i("span", { className: d("ohf-credit", l), ...c, children: [
    /* @__PURE__ */ e("span", { className: "ohf-credit-icon", children: r ?? /* @__PURE__ */ e(ue, {}) }),
    /* @__PURE__ */ e("span", { className: "ohf-credit-amount", children: a.toLocaleString(s) }),
    n !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-credit-unit", children: n })
  ] });
}
function w({ icon: a, size: n = 30, ghost: r = !1, spin: s = !1, className: l, type: c, ...t }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: c ?? "button",
      className: d("ohf-icon-btn", `ohf-icon-btn--${n}`, r && "ohf-icon-btn--ghost", l),
      "data-spin": s || void 0,
      ...t,
      children: a
    }
  );
}
function ia({
  open: a,
  title: n,
  onClose: r,
  width: s = 480,
  closeLabel: l,
  head: c,
  inline: t = !1,
  children: o,
  className: u
}) {
  const p = $(null), m = z();
  B(() => {
    const h = p.current;
    h && (a && !h.open ? (typeof h.showModal == "function" && h.showModal(), h.open || h.setAttribute("open", "")) : !a && h.open && (typeof h.close == "function" && h.close(), h.removeAttribute("open")));
  }, [a]);
  const g = /* @__PURE__ */ i(
    "div",
    {
      className: d("ohf-dialog-panel", t && u),
      style: { width: s, maxWidth: t ? "100%" : void 0 },
      tabIndex: -1,
      role: t ? "dialog" : void 0,
      "aria-labelledby": t ? m : void 0,
      children: [
        /* @__PURE__ */ i("div", { className: "ohf-dialog-head", children: [
          /* @__PURE__ */ e("div", { className: "ohf-dialog-title", id: m, children: n }),
          c,
          /* @__PURE__ */ e(
            w,
            {
              ghost: !0,
              size: 28,
              icon: /* @__PURE__ */ e(L, {}),
              "aria-label": l,
              onClick: r
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "ohf-dialog-body", children: o })
      ]
    }
  );
  return t ? a ? g : null : /* @__PURE__ */ e(
    "dialog",
    {
      ref: p,
      className: u,
      "aria-modal": "true",
      "aria-labelledby": m,
      onCancel: (h) => {
        h.preventDefault(), r();
      },
      onClick: (h) => {
        h.target === h.currentTarget && r();
      },
      children: g
    }
  );
}
function la({ label: a, hint: n, required: r, optional: s, counter: l, error: c, value: t, htmlFor: o, children: u, className: p }) {
  const m = l !== void 0 && l.value > l.max;
  return /* @__PURE__ */ i("div", { className: d("ohf-field", (!!c || m) && "ohf-field--error", p), children: [
    /* @__PURE__ */ i("div", { className: "ohf-field-row", children: [
      /* @__PURE__ */ i("label", { className: "ohf-field-label", htmlFor: o, children: [
        a,
        r && /* @__PURE__ */ e("span", { className: "ohf-field-mark ohf-field-mark--req", children: r }),
        s && /* @__PURE__ */ e("span", { className: "ohf-field-mark", children: s })
      ] }),
      t !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-field-value", children: t }),
      l && /* @__PURE__ */ i("span", { className: d("ohf-field-counter", m && "ohf-field-counter--over"), children: [
        l.value,
        " / ",
        l.max
      ] })
    ] }),
    u,
    n !== void 0 && !c && /* @__PURE__ */ e("div", { className: "ohf-field-hint", children: n }),
    c !== void 0 && /* @__PURE__ */ e("div", { className: "ohf-field-error", role: "alert", children: c })
  ] });
}
function ca({ invalid: a = !1, className: n, ...r }) {
  return /* @__PURE__ */ e("input", { className: d("ohf-input", n), "aria-invalid": a || void 0, ...r });
}
function ye({
  value: a,
  label: n,
  active: r,
  onSelect: s,
  ratio: l
}) {
  const c = l ? T(a) : null;
  return /* @__PURE__ */ i("button", { type: "button", className: "ohf-opt", "aria-pressed": r, onClick: s, children: [
    l && /* @__PURE__ */ e("span", { className: "ohf-opt-ratio", "aria-hidden": !0, children: /* @__PURE__ */ e("span", { className: `ohf-opt-box${c ? "" : " ohf-opt-box--auto"}`, style: c ?? void 0 }) }),
    /* @__PURE__ */ e("span", { className: "ohf-opt-label", children: n }),
    r && /* @__PURE__ */ e("span", { className: "ohf-opt-check", "aria-hidden": !0, children: /* @__PURE__ */ e(I, { size: 12 }) })
  ] });
}
function ta({ options: a, value: n, onChange: r, ratio: s }) {
  const l = $(null);
  return W(() => {
    const c = l.current, t = c?.querySelector('[aria-pressed="true"]');
    !c || !t || (c.scrollTop = Math.max(0, t.offsetTop - (c.clientHeight - t.offsetHeight) / 2));
  }, []), /* @__PURE__ */ e("div", { className: "ohf-opts ohf-scroll", role: "group", ref: l, children: a.map((c) => /* @__PURE__ */ e(
    ye,
    {
      value: c.value,
      label: c.label,
      active: c.value === n,
      ratio: s,
      onSelect: () => r(c.value)
    },
    c.value
  )) });
}
function oa({ glyph: a, label: n, value: r, expanded: s, caret: l = !0, className: c, type: t, ...o }) {
  return /* @__PURE__ */ i("button", { type: t ?? "button", className: d("ohf-ctl", c), "aria-expanded": s, ...o, children: [
    a && /* @__PURE__ */ e("span", { className: "ohf-ctl-glyph", children: a }),
    n !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-ctl-label", children: n }),
    /* @__PURE__ */ e("span", { className: "ohf-ctl-value", children: r }),
    l && /* @__PURE__ */ e("span", { className: "ohf-ctl-caret", "aria-hidden": "true", children: /* @__PURE__ */ e(R, {}) })
  ] });
}
function da({ variant: a, placement: n = "up", head: r, x: s, y: l, className: c, style: t, children: o, ...u }) {
  const p = {
    ...s !== void 0 ? { "--ohf-pop-x": `${s}px` } : null,
    ...l !== void 0 ? { "--ohf-pop-y": `${l}px` } : null
  };
  return /* @__PURE__ */ i(
    "div",
    {
      className: d("ohf-popover", `ohf-popover--${a}`, n !== "up" && `ohf-popover--${n}`, c),
      style: { ...p, ...t },
      ...u,
      children: [
        r !== void 0 && /* @__PURE__ */ e("div", { className: "ohf-pop-head", children: r }),
        o
      ]
    }
  );
}
function ha({ className: a, ...n }) {
  return /* @__PURE__ */ e("div", { role: "menu", className: d("ohf-menu", a), ...n });
}
function fa({ icon: a, label: n, count: r, className: s, type: l, ...c }) {
  return /* @__PURE__ */ i("button", { type: l ?? "button", role: "menuitem", className: d("ohf-menu-row", s), ...c, children: [
    a && /* @__PURE__ */ e("span", { className: "ohf-menu-ic", children: a }),
    /* @__PURE__ */ e("span", { className: "ohf-menu-label", children: n }),
    r !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-menu-count", children: r })
  ] });
}
function E({
  items: a,
  value: n,
  onChange: r,
  size: s = "md",
  plate: l = !1,
  className: c,
  "aria-label": t
}) {
  const o = $(null), [u, p] = Z(null);
  B(() => {
    const h = o.current;
    if (!h) return;
    let b = !0;
    const N = () => {
      const x = h.querySelector('[aria-selected="true"]');
      b && x ? p(
        (M) => M?.x === x.offsetLeft && M.w === x.offsetWidth ? M : { x: x.offsetLeft, w: x.offsetWidth }
      ) : b && p(null);
    };
    N();
    const v = typeof ResizeObserver > "u" ? null : new ResizeObserver(N);
    return v?.observe(h), document.fonts?.ready.then(N), () => {
      b = !1, v?.disconnect();
    };
  }, [n, a]);
  const m = (h) => {
    if (!a.length) return;
    const b = a.findIndex((v) => v.id === n), N = h.key === "ArrowRight" ? (b + 1) % a.length : h.key === "ArrowLeft" ? (b - 1 + a.length) % a.length : h.key === "Home" ? 0 : h.key === "End" ? a.length - 1 : -1;
    N < 0 || (h.preventDefault(), r(a[N].id), o.current?.querySelectorAll('[role="tab"]')[N]?.focus());
  }, g = /* @__PURE__ */ i(
    "div",
    {
      ref: o,
      role: "tablist",
      "aria-label": t,
      className: d(
        "ohf-tabs",
        s === "sm" && "ohf-tabs--sm",
        !l && c
      ),
      onKeyDown: m,
      children: [
        /* @__PURE__ */ e(
          "span",
          {
            className: "ohf-thumb",
            "data-ready": u !== null,
            "aria-hidden": "true",
            style: {
              "--thumb-x": `${u?.x ?? 0}px`,
              "--thumb-w": `${u?.w ?? 0}px`
            }
          }
        ),
        a.map((h) => {
          const b = h.id === n;
          return /* @__PURE__ */ i(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": b,
              "aria-label": h["aria-label"],
              tabIndex: b ? 0 : -1,
              className: "ohf-tab",
              onClick: () => r(h.id),
              children: [
                h.icon,
                /* @__PURE__ */ e("span", { className: "ohf-tab-label", children: h.label })
              ]
            },
            h.id
          );
        })
      ]
    }
  );
  return l ? /* @__PURE__ */ e("div", { className: d("ohf-tabs-plate", c), children: g }) : g;
}
function ua({ label: a, clock: n, ratio: r, className: s, style: l, ...c }) {
  return /* @__PURE__ */ i(
    "div",
    {
      className: d("ohf-skeleton", s),
      role: "status",
      style: r ? { ...l, aspectRatio: A(r, "4 / 3") } : l,
      ...c,
      children: [
        a !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-skeleton-label", children: a }),
        n !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-skeleton-clock", children: n })
      ]
    }
  );
}
function pa({ min: a, max: n, step: r = 1, value: s, onChange: l, className: c, "aria-label": t }) {
  const o = `${((s - a) / (n - a || 1) * 100).toFixed(1)}%`;
  return /* @__PURE__ */ e(
    "input",
    {
      type: "range",
      className: d("ohf-slider", c),
      min: a,
      max: n,
      step: r,
      value: s,
      "aria-label": t,
      style: { "--fill": o },
      onChange: (u) => l(Number(u.target.value))
    }
  );
}
function ma({ value: a, min: n, max: r, onChange: s, suffix: l, decrementLabel: c, incrementLabel: t, className: o }) {
  return /* @__PURE__ */ i("div", { className: d("ohf-batch", o), role: "group", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        className: "ohf-batch-step",
        "aria-label": c,
        disabled: a <= n,
        onClick: () => s(Math.max(n, a - 1)),
        children: /* @__PURE__ */ e(fe, {})
      }
    ),
    /* @__PURE__ */ i("span", { className: "ohf-batch-value", "aria-live": "polite", children: [
      a,
      l !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-batch-max", children: l })
    ] }),
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        className: "ohf-batch-step",
        "aria-label": t,
        disabled: a >= r,
        onClick: () => s(Math.min(r, a + 1)),
        children: /* @__PURE__ */ e(he, {})
      }
    )
  ] });
}
function va({ checked: a, onChange: n, disabled: r = !1, className: s, "aria-label": l, ...c }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": a,
      "aria-label": l,
      disabled: r,
      className: d("ohf-switch", s),
      onClick: () => n(!a),
      ...c,
      children: /* @__PURE__ */ e("span", { className: "ohf-switch-knob", "aria-hidden": "true" })
    }
  );
}
function O({ tone: a = "default", className: n, children: r, ...s }) {
  return /* @__PURE__ */ e("span", { className: d("ohf-tag", a !== "default" && `ohf-tag--${a}`, n), ...s, children: r });
}
function ba({ invalid: a = !1, className: n, ...r }) {
  return /* @__PURE__ */ e("textarea", { className: d("ohf-input", "ohf-input--area", n), "aria-invalid": a || void 0, ...r });
}
function Me({
  state: a,
  src: n,
  alt: r = "",
  size: s = 56,
  ratio: l = "4:5",
  flatColor: c = "#1d2a44",
  flatAccent: t = "#ffd54a",
  icon: o,
  className: u,
  style: p,
  ...m
}) {
  return /* @__PURE__ */ i(
    "div",
    {
      className: d("ohf-frame", `ohf-frame--${a}`, u),
      style: {
        ...p,
        width: s,
        aspectRatio: A(l, "4 / 5"),
        ...a === "flat" ? { background: c, color: t } : null
      },
      ...m,
      children: [
        a === "image" && n && /* @__PURE__ */ e("img", { className: "ohf-frame-img", src: n, alt: r }),
        a === "pending" && /* @__PURE__ */ i(y, { children: [
          /* @__PURE__ */ e("span", { className: "ohf-frame-lamp", "aria-hidden": "true" }),
          /* @__PURE__ */ e("span", { className: "ohf-frame-line ohf-frame-line--1", "aria-hidden": "true" }),
          /* @__PURE__ */ e("span", { className: "ohf-frame-line ohf-frame-line--2", "aria-hidden": "true" })
        ] }),
        a === "failed" && /* @__PURE__ */ e("span", { className: "ohf-frame-icon", children: o ?? /* @__PURE__ */ e(F, { size: 18 }) }),
        a === "flat" && /* @__PURE__ */ i(y, { children: [
          /* @__PURE__ */ e("span", { className: "ohf-frame-bar ohf-frame-bar--1", "aria-hidden": "true" }),
          /* @__PURE__ */ e("span", { className: "ohf-frame-bar ohf-frame-bar--2", "aria-hidden": "true" }),
          /* @__PURE__ */ e("span", { className: "ohf-frame-bar ohf-frame-bar--pill", "aria-hidden": "true" })
        ] })
      ]
    }
  );
}
function Na({ label: a, align: n, className: r, children: s, ...l }) {
  return /* @__PURE__ */ e("span", { className: d("ohf-tip", n && `ohf-tip--${n}`, r), "data-tip": a, ...l, children: s });
}
function ga({ text: a, actionLabel: n, onAction: r, durationMs: s, icon: l, className: c }) {
  return /* @__PURE__ */ i("div", { className: d("ohf-undo", c), role: "status", children: [
    /* @__PURE__ */ e("span", { className: "ohf-undo-drain", style: { animationDuration: `${s}ms` }, "aria-hidden": "true" }),
    /* @__PURE__ */ e("span", { className: "ohf-undo-text", children: a }),
    /* @__PURE__ */ i("button", { type: "button", className: "ohf-undo-act", onClick: r, children: [
      l ?? /* @__PURE__ */ e(me, {}),
      n
    ] })
  ] });
}
function xa({ status: a, actions: n, notice: r, className: s }) {
  return /* @__PURE__ */ i("div", { className: d("ohf-astrip", s), children: [
    r !== void 0 && /* @__PURE__ */ e("div", { className: "ohf-astrip-notice", children: r }),
    /* @__PURE__ */ i("div", { className: "ohf-astrip-row", children: [
      /* @__PURE__ */ e("div", { className: "ohf-astrip-status", children: a }),
      /* @__PURE__ */ e("span", { className: "ohf-astrip-spacer" }),
      n
    ] })
  ] });
}
function ya({ label: a, topic: n, pills: r, action: s, className: l }) {
  return /* @__PURE__ */ i("div", { className: d("ohf-brief", l), children: [
    /* @__PURE__ */ e("span", { className: "ohf-brief-label", children: a }),
    /* @__PURE__ */ e("span", { className: "ohf-brief-topic", children: n }),
    r,
    s
  ] });
}
function Ma({
  mode: a,
  index: n,
  total: r,
  onPrev: s,
  onNext: l,
  prevLabel: c,
  nextLabel: t,
  stage: o,
  templates: u,
  options: p,
  actions: m,
  hint: g,
  inspector: h,
  className: b
}) {
  return /* @__PURE__ */ i("aside", { className: d("ohf-canvas", b), children: [
    /* @__PURE__ */ i("div", { className: "ohf-canvas-head", children: [
      /* @__PURE__ */ e(E, { ...a, size: "sm", plate: !0 }),
      /* @__PURE__ */ e("span", { className: "ohf-canvas-spacer" }),
      /* @__PURE__ */ e(
        w,
        {
          ghost: !0,
          size: 30,
          icon: /* @__PURE__ */ e(C, {}),
          "aria-label": c,
          onClick: s,
          disabled: n <= 1
        }
      ),
      /* @__PURE__ */ i("span", { className: "ohf-canvas-pager", children: [
        n,
        " / ",
        r
      ] }),
      /* @__PURE__ */ e(
        w,
        {
          ghost: !0,
          size: 30,
          icon: /* @__PURE__ */ e(P, {}),
          "aria-label": t,
          onClick: l,
          disabled: n >= r
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "ohf-canvas-stage", children: o }),
    /* @__PURE__ */ i("div", { className: "ohf-canvas-foot", children: [
      u && /* @__PURE__ */ i("div", { className: "ohf-canvas-row", children: [
        /* @__PURE__ */ e("span", { className: "ohf-canvas-label", children: u.label }),
        u.chips
      ] }),
      p && /* @__PURE__ */ i("div", { className: "ohf-canvas-row", children: [
        /* @__PURE__ */ e("span", { className: "ohf-canvas-label", children: p.label }),
        p.pills
      ] }),
      m !== void 0 && /* @__PURE__ */ e("div", { className: "ohf-canvas-actions", children: m }),
      h,
      g !== void 0 && /* @__PURE__ */ e("div", { className: "ohf-canvas-hint", children: g })
    ] })
  ] });
}
function ka({ icon: a, name: n, description: r, pressed: s = !1, soon: l, className: c, type: t, disabled: o, ...u }) {
  return /* @__PURE__ */ i(
    "button",
    {
      type: t ?? "button",
      className: d("ohf-fcard", l !== void 0 && "ohf-fcard--soon", c),
      "aria-pressed": s,
      disabled: o || l !== void 0,
      ...u,
      children: [
        /* @__PURE__ */ i("span", { className: "ohf-fcard-head", children: [
          /* @__PURE__ */ e("span", { className: "ohf-fcard-icon", children: a }),
          /* @__PURE__ */ e("span", { className: "ohf-fcard-name", children: n }),
          /* @__PURE__ */ e("span", { className: "ohf-fcard-spacer" }),
          l !== void 0 ? /* @__PURE__ */ e(O, { tone: "muted", children: l }) : s ? /* @__PURE__ */ e("span", { className: "ohf-fcard-check", children: /* @__PURE__ */ e(I, { size: 15 }) }) : null
        ] }),
        /* @__PURE__ */ e("span", { className: "ohf-fcard-desc", children: r })
      ]
    }
  );
}
function wa({
  href: a,
  onClick: n,
  deck: r,
  cover: s,
  title: l,
  meta: c,
  status: t,
  statusTone: o = "done",
  className: u
}) {
  const p = /* @__PURE__ */ i(y, { children: [
    s && /* @__PURE__ */ e("div", { className: "ohf-pcard-cover", children: s }),
    /* @__PURE__ */ e("div", { className: "ohf-pcard-deck", children: r }),
    /* @__PURE__ */ i("div", { className: "ohf-pcard-body", children: [
      /* @__PURE__ */ e("div", { className: "ohf-pcard-title", children: l }),
      /* @__PURE__ */ i("div", { className: "ohf-pcard-meta", children: [
        /* @__PURE__ */ e("span", { children: c }),
        /* @__PURE__ */ e("span", { className: "ohf-pcard-spacer" }),
        t !== void 0 && /* @__PURE__ */ i(
          "span",
          {
            className: d(
              "ohf-pcard-status",
              `ohf-pcard-status--${o}`
            ),
            children: [
              o === "live" && /* @__PURE__ */ e("span", { className: "ohf-pcard-lamp", "aria-hidden": "true" }),
              o === "done" && /* @__PURE__ */ e(I, { size: 13 }),
              t
            ]
          }
        )
      ] })
    ] })
  ] }), m = d("ohf-pcard", u);
  return a !== void 0 ? /* @__PURE__ */ e("a", { className: m, href: a, children: p }) : /* @__PURE__ */ e("button", { type: "button", className: m, onClick: n, children: p });
}
function Ia({ back: a, title: n, tags: r, status: s, actions: l, className: c }) {
  return /* @__PURE__ */ i("div", { className: d("ohf-phead", c), children: [
    a.href ? /* @__PURE__ */ e("a", { className: "ohf-phead-back", href: a.href, "aria-label": a.label, children: /* @__PURE__ */ e(C, { size: 18 }) }) : /* @__PURE__ */ e(w, { ghost: !0, size: 30, icon: /* @__PURE__ */ e(C, { size: 18 }), "aria-label": a.label, onClick: a.onClick }),
    /* @__PURE__ */ e("h1", { className: "ohf-phead-title", children: n }),
    r,
    s !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-phead-status", children: s }),
    /* @__PURE__ */ e("span", { className: "ohf-phead-spacer" }),
    l
  ] });
}
function Ca({
  index: a,
  thumb: n,
  tag: r,
  title: s,
  sub: l,
  counter: c,
  prompt: t,
  promptIcon: o,
  status: u,
  statusTone: p = "default",
  statusAction: m,
  actions: g,
  selected: h = !1,
  editing: b = !1,
  dragging: N = !1,
  onSelect: v,
  className: x,
  ...M
}) {
  const S = c !== void 0 && c.value > c.max;
  return /* @__PURE__ */ i(
    "div",
    {
      className: d(
        "ohf-sb-row",
        h && "ohf-sb-row--selected",
        b && "ohf-sb-row--editing",
        N && "ohf-sb-row--dragging",
        x
      ),
      "aria-current": h ? "true" : void 0,
      ...M,
      children: [
        /* @__PURE__ */ i("div", { className: "ohf-sb-num", children: [
          /* @__PURE__ */ e("span", { className: "ohf-sb-grip", "aria-hidden": "true", children: /* @__PURE__ */ e(ve, { size: 14 }) }),
          /* @__PURE__ */ e("span", { children: a })
        ] }),
        /* @__PURE__ */ e(Me, { ...n }),
        /* @__PURE__ */ i("div", { className: "ohf-sb-text", children: [
          r !== void 0 && /* @__PURE__ */ e(O, { children: r }),
          v && !b ? /* @__PURE__ */ e("button", { type: "button", className: "ohf-sb-title ohf-sb-select", onClick: v, children: s }) : /* @__PURE__ */ e("div", { className: "ohf-sb-title", children: s }),
          (l !== void 0 || c) && /* @__PURE__ */ i("div", { className: "ohf-sb-sub", children: [
            /* @__PURE__ */ e("span", { className: "ohf-sb-sub-text", children: l }),
            c && /* @__PURE__ */ i("span", { className: d("ohf-sb-counter", S && "ohf-sb-counter--over"), children: [
              c.value,
              " / ",
              c.max
            ] })
          ] })
        ] }),
        /* @__PURE__ */ i("div", { className: "ohf-sb-side", children: [
          u !== void 0 ? /* @__PURE__ */ i("span", { className: d("ohf-sb-status", p !== "default" && `ohf-sb-status--${p}`), children: [
            p === "live" && /* @__PURE__ */ e("span", { className: "ohf-sb-lamp", "aria-hidden": "true" }),
            u
          ] }) : t !== void 0 ? /* @__PURE__ */ i("span", { className: "ohf-sb-prompt", children: [
            /* @__PURE__ */ e("span", { className: "ohf-sb-prompt-ic", children: o ?? /* @__PURE__ */ e(H, { size: 13 }) }),
            /* @__PURE__ */ e("span", { className: "ohf-sb-prompt-text", children: t })
          ] }) : null,
          /* @__PURE__ */ e("span", { className: "ohf-sb-status-action", children: m })
        ] }),
        /* @__PURE__ */ e("div", { className: "ohf-sb-actions", children: g })
      ]
    }
  );
}
function Sa({ preview: a, name: n, description: r, pressed: s = !1, className: l, type: c, ...t }) {
  return /* @__PURE__ */ i("button", { type: c ?? "button", className: d("ohf-scard", l), "aria-pressed": s, ...t, children: [
    /* @__PURE__ */ e("span", { className: "ohf-scard-preview", children: a }),
    /* @__PURE__ */ i("span", { className: "ohf-scard-row", children: [
      /* @__PURE__ */ e("span", { className: "ohf-scard-name", children: n }),
      /* @__PURE__ */ e("span", { className: "ohf-scard-spacer" }),
      s && /* @__PURE__ */ e("span", { className: "ohf-scard-check", children: /* @__PURE__ */ e(I, { size: 14 }) })
    ] }),
    /* @__PURE__ */ e("span", { className: "ohf-scard-desc", children: r })
  ] });
}
function $a({ brand: a, brandHref: n = "/", brandLabel: r, nav: s, credits: l, creditsUnit: c, topUp: t, avatar: o, className: u }) {
  return /* @__PURE__ */ i("header", { className: d("ohf-appbar", u), children: [
    /* @__PURE__ */ i("a", { className: "ohf-appbar-brand", href: n, "aria-label": r, children: [
      /* @__PURE__ */ e("span", { className: "ohf-appbar-mark", "aria-hidden": "true", children: /* @__PURE__ */ e("span", {}) }),
      /* @__PURE__ */ e("span", { className: "ohf-appbar-name", children: a })
    ] }),
    /* @__PURE__ */ e(E, { ...s, size: "sm", plate: !0 }),
    /* @__PURE__ */ e("span", { className: "ohf-appbar-spacer" }),
    l !== void 0 && /* @__PURE__ */ e(xe, { amount: l, unit: c }),
    t,
    o
  ] });
}
const k = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif', V = {
  basic: {
    bg: "#1d2a44",
    tx: "#ffffff",
    acc: "#ffd54a",
    accInk: "#1a1a1a",
    rule: "rgba(255, 255, 255, 0.22)",
    head: {
      family: k,
      weight: 800,
      letterSpacing: "-0.02em",
      lineHeight: 1.22
    },
    body: { family: k }
  },
  editorial: {
    bg: "#f3ece0",
    tx: "#2a2320",
    acc: "#b5482f",
    accInk: "#ffffff",
    rule: "rgba(42, 35, 32, 0.18)",
    head: {
      family: '"Noto Serif KR", serif',
      weight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.26
    },
    body: { family: k }
  },
  impact: {
    bg: "#0f0f10",
    tx: "#ffffff",
    acc: "#ff5a3c",
    accInk: "#1a1a1a",
    rule: "rgba(255, 255, 255, 0.22)",
    head: {
      family: `"Black Han Sans", ${k}`,
      weight: 400,
      letterSpacing: "0",
      lineHeight: 1.18
    },
    body: { family: k }
  },
  soft: {
    bg: "#e6efe6",
    tx: "#22332b",
    acc: "#3f7d5d",
    accInk: "#ffffff",
    rule: "rgba(34, 51, 43, 0.2)",
    head: {
      family: `"Gowun Dodum", ${k}`,
      weight: 400,
      letterSpacing: "-0.01em",
      lineHeight: 1.26
    },
    body: { family: `"Gowun Dodum", ${k}` }
  }
}, za = Object.keys(V);
function Aa({
  preset: a,
  ratio: n = "4:5",
  image: r,
  dim: s,
  composition: l = "full",
  imagePosition: c = "center top",
  edition: t,
  handle: o,
  page: u,
  showFooter: p = !0,
  position: m = "end",
  className: g,
  style: h,
  children: b,
  ...N
}) {
  const v = V[a], x = r ? l : "full", M = !!r && x === "full", S = {
    "--sl-bg": v.bg,
    "--sl-rule": M ? "rgba(255, 255, 255, 0.28)" : v.rule,
    "--sl-image-position": c,
    "--sl-tx": M ? "#ffffff" : v.tx,
    "--sl-acc": v.acc,
    "--sl-acc-ink": v.accInk,
    "--sl-head": v.head.family,
    "--sl-head-weight": v.head.weight,
    "--sl-head-ls": v.head.letterSpacing,
    "--sl-head-lh": v.head.lineHeight,
    "--sl-body": v.body.family,
    ...typeof s == "number" ? {
      "--sl-dim": Math.max(
        0,
        Math.min(1, Number.isFinite(s) ? s : 0.5)
      )
    } : null
  };
  return /* @__PURE__ */ i(
    "div",
    {
      className: d(
        "ohf-slide",
        `ohf-slide--${m}`,
        M && "ohf-slide--photo",
        `ohf-slide--${x}`,
        g
      ),
      "data-preset": a,
      "data-ratio": n,
      style: { ...S, aspectRatio: A(n, "4 / 5"), ...h },
      ...N,
      children: [
        r && /* @__PURE__ */ e("img", { className: "ohf-slide-img", src: r, alt: "" }),
        M && s !== void 0 && /* @__PURE__ */ e(
          "div",
          {
            className: d(
              "ohf-slide-dim",
              s === "grad" && "ohf-slide-dim--grad"
            ),
            "aria-hidden": "true"
          }
        ),
        t && /* @__PURE__ */ e("div", { className: "ohf-slide-edition", children: t }),
        /* @__PURE__ */ e("div", { className: "ohf-slide-body", children: b }),
        p && (o !== void 0 || u !== void 0) && /* @__PURE__ */ i("div", { className: "ohf-slide-foot", children: [
          /* @__PURE__ */ e("span", { children: o }),
          /* @__PURE__ */ e("span", { children: u })
        ] })
      ]
    }
  );
}
function Ba({
  kicker: a,
  title: n,
  sub: r,
  titleSize: s = "lg"
}) {
  return /* @__PURE__ */ i(y, { children: [
    a !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-slide-kicker", children: a }),
    /* @__PURE__ */ e(
      "h2",
      {
        className: d(
          "ohf-slide-title",
          s === "md" && "ohf-slide-title--md"
        ),
        children: n
      }
    ),
    r !== void 0 && /* @__PURE__ */ e("p", { className: "ohf-slide-sub", children: r })
  ] });
}
function Ha({ title: a, body: n }) {
  return /* @__PURE__ */ i(y, { children: [
    /* @__PURE__ */ e("h2", { className: "ohf-slide-h", children: a }),
    /* @__PURE__ */ e("p", { className: "ohf-slide-text", children: n })
  ] });
}
function Ra({ title: a, items: n, numbered: r = !0 }) {
  return /* @__PURE__ */ i(y, { children: [
    /* @__PURE__ */ e("h2", { className: "ohf-slide-h", children: a }),
    /* @__PURE__ */ e("ol", { className: "ohf-slide-list", children: n.map((s, l) => /* @__PURE__ */ i("li", { className: "ohf-slide-item", children: [
      r && /* @__PURE__ */ e("em", { className: "ohf-slide-num", children: String(l + 1).padStart(2, "0") }),
      /* @__PURE__ */ e("span", { className: "ohf-slide-item-label", children: s.label }),
      s.value !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-slide-item-value", children: s.value })
    ] }, l)) })
  ] });
}
function La({ quote: a, source: n }) {
  return /* @__PURE__ */ i(y, { children: [
    /* @__PURE__ */ e("span", { className: "ohf-slide-qmark", "aria-hidden": "true", children: "“" }),
    /* @__PURE__ */ e("blockquote", { className: "ohf-slide-quote", children: a }),
    n !== void 0 && /* @__PURE__ */ e("p", { className: "ohf-slide-src", children: n })
  ] });
}
function Fa({ title: a, sub: n, pill: r }) {
  return /* @__PURE__ */ i(y, { children: [
    /* @__PURE__ */ e("h2", { className: "ohf-slide-h", children: a }),
    n !== void 0 && /* @__PURE__ */ e("p", { className: "ohf-slide-sub", children: n }),
    r !== void 0 && /* @__PURE__ */ e("span", { className: "ohf-slide-pill", children: r })
  ] });
}
function Pa({ value: a, unit: n, title: r, detail: s }) {
  return /* @__PURE__ */ i(y, { children: [
    /* @__PURE__ */ i("div", { className: "ohf-slide-metric", children: [
      a,
      /* @__PURE__ */ e("span", { children: n })
    ] }),
    /* @__PURE__ */ e("h2", { className: "ohf-slide-h", children: r }),
    s && /* @__PURE__ */ e("p", { className: "ohf-slide-text", children: s })
  ] });
}
function Da({ title: a, columns: n }) {
  return /* @__PURE__ */ i(y, { children: [
    /* @__PURE__ */ e("h2", { className: "ohf-slide-h", children: a }),
    /* @__PURE__ */ e("div", { className: "ohf-slide-compare", children: n.map((r, s) => /* @__PURE__ */ i("div", { children: [
      /* @__PURE__ */ e("h3", { children: r.label }),
      /* @__PURE__ */ e("p", { children: r.body })
    ] }, s)) })
  ] });
}
function Ta({
  value: a,
  onValueChange: n,
  label: r,
  clearLabel: s,
  className: l,
  id: c,
  disabled: t,
  ...o
}) {
  const u = z();
  return /* @__PURE__ */ i("div", { className: d("ohf-search-field", l), children: [
    /* @__PURE__ */ e(de, {}),
    /* @__PURE__ */ e("label", { className: "ohf-sr-only", htmlFor: c ?? u, children: r }),
    /* @__PURE__ */ e(
      "input",
      {
        ...o,
        id: c ?? u,
        type: "search",
        value: a,
        disabled: t,
        onChange: (p) => n(p.target.value)
      }
    ),
    a && /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        "aria-label": s,
        disabled: t,
        onClick: () => n(""),
        children: /* @__PURE__ */ e(L, {})
      }
    )
  ] });
}
function Ea({
  tone: a = "neutral",
  className: n,
  children: r,
  ...s
}) {
  return /* @__PURE__ */ i(
    "span",
    {
      ...s,
      className: d("ohf-status", `ohf-status--${a}`, n),
      children: [
        /* @__PURE__ */ e("i", { "aria-hidden": "true" }),
        r
      ]
    }
  );
}
function Oa({
  value: a,
  max: n = 100,
  label: r,
  detail: s,
  tone: l = "default",
  className: c
}) {
  const t = Number.isFinite(n) && n > 0 ? n : 100, o = a === void 0 || !Number.isFinite(a) ? void 0 : Math.max(0, Math.min(t, a));
  return /* @__PURE__ */ i("div", { className: d("ohf-progress", `ohf-progress--${l}`, c), children: [
    /* @__PURE__ */ i("div", { className: "ohf-progress-label", children: [
      /* @__PURE__ */ e("span", { children: r }),
      s && /* @__PURE__ */ e("span", { children: s })
    ] }),
    /* @__PURE__ */ e(
      "div",
      {
        className: "ohf-progress-track",
        role: "progressbar",
        "aria-label": r,
        "aria-valuemin": 0,
        "aria-valuemax": t,
        "aria-valuenow": o,
        "data-indeterminate": o === void 0 || void 0,
        style: {
          "--progress": `${o === void 0 ? 35 : o / t * 100}%`
        },
        children: /* @__PURE__ */ e("i", {})
      }
    )
  ] });
}
function Va({
  icon: a,
  title: n,
  description: r,
  action: s,
  className: l
}) {
  const c = z();
  return /* @__PURE__ */ i("section", { className: d("ohf-empty-state", l), "aria-labelledby": c, children: [
    a && /* @__PURE__ */ e("span", { className: "ohf-empty-state-icon", "aria-hidden": "true", children: a }),
    /* @__PURE__ */ e("h3", { id: c, children: n }),
    /* @__PURE__ */ e("p", { children: r }),
    s && /* @__PURE__ */ e("div", { children: s })
  ] });
}
function Wa({
  page: a,
  total: n,
  onPageChange: r,
  label: s,
  previousLabel: l,
  nextLabel: c
}) {
  const t = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)), o = t ? Math.max(1, Math.min(t, Math.floor(Number.isFinite(a) ? a : 1))) : 0;
  return /* @__PURE__ */ i("nav", { className: "ohf-pagination", "aria-label": s, children: [
    /* @__PURE__ */ e(
      w,
      {
        ghost: !0,
        icon: /* @__PURE__ */ e(C, {}),
        "aria-label": l,
        disabled: o <= 1,
        onClick: () => r(o - 1)
      }
    ),
    /* @__PURE__ */ i("span", { "aria-live": "polite", children: [
      o,
      " ",
      /* @__PURE__ */ i("span", { children: [
        "/ ",
        t
      ] })
    ] }),
    /* @__PURE__ */ e(
      w,
      {
        ghost: !0,
        icon: /* @__PURE__ */ e(P, {}),
        "aria-label": c,
        disabled: o >= t,
        onClick: () => r(o + 1)
      }
    )
  ] });
}
function Za({
  title: a,
  description: n,
  children: r,
  defaultOpen: s = !0
}) {
  return /* @__PURE__ */ i("details", { className: "ohf-inspector", open: s, children: [
    /* @__PURE__ */ i("summary", { children: [
      a,
      /* @__PURE__ */ e(R, {})
    ] }),
    n && /* @__PURE__ */ e("p", { children: n }),
    /* @__PURE__ */ e("div", { className: "ohf-inspector-content", children: r })
  ] });
}
function ja({
  src: a,
  title: n,
  meta: r,
  selected: s = !1,
  className: l,
  ...c
}) {
  return /* @__PURE__ */ i(
    "button",
    {
      ...c,
      type: "button",
      "aria-pressed": s,
      className: d("ohf-asset-card", l),
      children: [
        /* @__PURE__ */ i("span", { className: "ohf-asset-card-image", children: [
          a ? /* @__PURE__ */ e("img", { src: a, alt: "", loading: "lazy" }) : /* @__PURE__ */ e(H, { size: 24 }),
          s && /* @__PURE__ */ e("span", { className: "ohf-asset-card-check", children: /* @__PURE__ */ e(I, {}) })
        ] }),
        /* @__PURE__ */ e("span", { className: "ohf-asset-card-title", children: n }),
        r && /* @__PURE__ */ e("span", { className: "ohf-asset-card-meta", children: r })
      ]
    }
  );
}
function qa({
  label: a,
  duration: n,
  thumbnail: r,
  selected: s = !1,
  className: l,
  ...c
}) {
  return /* @__PURE__ */ i(
    "button",
    {
      ...c,
      type: "button",
      "aria-pressed": s,
      className: d("ohf-timeline-clip", l),
      children: [
        r ? /* @__PURE__ */ e("img", { src: r, alt: "" }) : /* @__PURE__ */ e(be, {}),
        /* @__PURE__ */ i("span", { children: [
          a,
          /* @__PURE__ */ e("small", { children: n })
        ] })
      ]
    }
  );
}
export {
  xa as ActionStrip,
  aa as Alert,
  Re as ArrowRightIcon,
  Ze as ArrowUpIcon,
  ja as AssetCard,
  ze as AssetsIcon,
  $e as AudioIcon,
  na as Avatar,
  Ha as BodySlide,
  ya as BriefBar,
  ra as Button,
  Ma as CanvasPanel,
  R as CaretDownIcon,
  I as CheckIcon,
  C as ChevronLeftIcon,
  P as ChevronRightIcon,
  sa as Chip,
  Le as ClockIcon,
  L as CloseIcon,
  Da as CompareSlide,
  Ve as CopyIcon,
  Ba as CoverSlide,
  xe as CreditBadge,
  Fa as CtaSlide,
  ia as Dialog,
  Te as DownloadIcon,
  Va as EmptyState,
  la as Field,
  be as FilmIcon,
  ka as FormatCard,
  Fe as FormatIcon,
  ue as GemIcon,
  ve as GripIcon,
  je as HeartIcon,
  w as IconButton,
  H as ImageIcon,
  ca as Input,
  Za as InspectorSection,
  Ne as Kbd,
  Ae as KeyIcon,
  Ye as LayersIcon,
  Qe as LayoutIcon,
  Ra as ListSlide,
  ha as Menu,
  fa as MenuRow,
  Pa as MetricSlide,
  fe as MinusIcon,
  Ee as OpenOutIcon,
  ta as OptionList,
  Wa as Pagination,
  Ue as PaletteIcon,
  Je as PhoneIcon,
  oa as Pill,
  De as PlayBadgeIcon,
  Pe as PlayIcon,
  he as PlusIcon,
  da as Popover,
  Oa as Progress,
  wa as ProjectCard,
  Ia as ProjectHeader,
  La as QuoteSlide,
  He as RetryIcon,
  za as SLIDE_PRESETS,
  V as SLIDE_STYLES,
  Ta as SearchField,
  de as SearchIcon,
  E as Segment,
  Be as ShuffleIcon,
  ua as Skeleton,
  Aa as SlideFrame,
  pa as Slider,
  We as SlidersIcon,
  Ke as SparkleIcon,
  ge as Spinner,
  Ea as StatusBadge,
  ma as Stepper,
  Ca as StoryboardRow,
  Sa as StyleCard,
  va as Switch,
  O as Tag,
  Xe as TextIcon,
  ba as Textarea,
  Me as Thumb,
  qa as TimelineClip,
  Na as Tooltip,
  $a as TopBar,
  qe as TrashIcon,
  ga as UndoBar,
  me as UndoIcon,
  Oe as UploadIcon,
  _e as UserIcon,
  Se as VideoIcon,
  ea as WalletIcon,
  F as WarningIcon,
  Ge as WaveBadgeIcon,
  Ce as cssVar,
  d as cx,
  T as ratioBox,
  A as ratioToCss,
  Ie as tokens
};
//# sourceMappingURL=index.js.map
