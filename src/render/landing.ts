import { fontFaceCss, pageTypographyCss } from "@/projects/typography";
import { productCss, productSummary, productSpecs } from "./product-detail";
import { imagePlan, imagePlaceholder, IMAGE_SIZES } from "@/projects/landing-images";
import { SLIDE_STYLES } from "@openhiggsfield/design";
import type { Project } from "@/projects/types";
import { safeLink } from "@/projects/formats";
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function landingHtml(
  project: Project,
  assets: Record<string, string> = {},
  font = "/fonts/PretendardVariable.woff2",
  placeholders = false,
  fontPaths: Record<string,string> = {},
) {
  const s = SLIDE_STYLES[project.preset],
    e = escapeHtml;
  const product = project.format === "product-detail", info = project.product;
  const sections = project.slots
    .map((slot, i) => {
      const plan = imagePlan(slot), [width, height] = IMAGE_SIZES[plan.ratio];
      const title = e(slot.title), body = slot.body.split("\n").filter(Boolean);
      const img = plan.enabled && slot.media?.kind === "image"
        ? `<img src="${e(assets[slot.media.url] || slot.media.url)}" alt="${e(plan.description)}" width="${width}" height="${height}" style="aspect-ratio:${width}/${height};height:auto;object-position:center ${Math.max(0, Math.min(100, slot.crop))}%" loading="${i === 0 ? "eager" : "lazy"}">`
        : placeholders && plan.enabled ? `<figure class="image-placeholder" style="aspect-ratio:${width}/${height}"><img src="${e(imagePlaceholder(plan))}" alt="${e(slot.prompt || plan.description)}" width="${width}" height="${height}"><figcaption><small>IMAGE PLAN · ${width} × ${height} · ${plan.ratio}</small><strong>${e(plan.description)}</strong><details><summary>생성 프롬프트</summary><p>${e(slot.prompt || plan.description)}</p></details></figcaption></figure>` : "";
      const cta =
        slot.href && safeLink(slot.href)
          ? `<a class="button" href="${e(safeLink(slot.href))}" rel="noopener noreferrer">${e(slot.cta || "자세히 알아보기")} ↗</a>`
          : "";
      if (product && slot.kind === "hero")
        return `<section id="section-${i + 1}" class="hero"><div><span class="eyebrow">${e([project.brand, info?.category].filter(Boolean).join(" / "))}</span><h1>${e(info?.name || slot.title)}</h1>${info?.name && info.name !== slot.title ? `<p class="product-tagline">${title}</p>` : ""}<p>${e(slot.body)}</p>${productSummary(info, e)}${cta}</div>${img}</section>`;
      if (product && slot.kind === "specs")
        return `<section id="section-${i + 1}" class="specs"><span class="eyebrow">${e(slot.kicker)}</span><h2>${title}</h2>${productSpecs(info?.specs || slot.body, e)}${img}</section>`;
      if (product && slot.kind === "shipping")
        return `<section id="section-${i + 1}" class="shipping"><h2>${title}</h2>${info?.shipping || info?.returns ? `<div class="product-policies"><article><h3>배송 안내</h3><p>${e(info?.shipping || "배송 정보 확인이 필요합니다.")}</p></article><article><h3>교환·반품 안내</h3><p>${e(info?.returns || "교환·반품 정보 확인이 필요합니다.")}</p></article></div>` : `<p>${e(slot.body)}</p>`}${img}</section>`;
      if (product && slot.kind === "usage")
        return `<section id="section-${i + 1}" class="usage">${img}<div><span class="eyebrow">${e(slot.kicker)}</span><h2>${title}</h2><p>${e(info?.usage || slot.body)}</p></div></section>`;
      if (slot.kind === "hero")
        return `<section id="section-${i + 1}" class="hero"><div><span class="eyebrow">${e(slot.kicker || project.brand)}</span><h1>${title}</h1><p>${e(slot.body)}</p>${cta}</div>${img}</section>`;
      if (slot.kind === "features")
        return `<section id="section-${i + 1}"><span class="eyebrow">${e(slot.kicker)}</span><h2>${title}</h2><div class="features">${body.map((line, j) => {
          const [heading, ...detail] = line.split("|");
          const copy = detail.length ? `<h3>${e(heading)}</h3><p>${e(detail.join("|"))}</p>` : line.length > 80 ? `<p>${e(line)}</p>` : `<h3>${e(line)}</h3>`;
          return `<article><span class="number">${String(j + 1).padStart(2, "0")}</span>${copy}</article>`;
        }).join("")}</div>${img}</section>`;
      if (slot.kind === "faq")
        return `<section id="section-${i + 1}" class="faq"><h2>${title}</h2>${body
          .map((line) => {
            const [q, ...a] = line.split("|");
            return `<details><summary>${e(q)}</summary><p>${e(a.join("|") || "답변을 입력해 주세요.")}</p></details>`;
          })
          .join("")}${img}</section>`;
      if (slot.kind === "testimonial")
        return `<section id="section-${i + 1}" class="quote"><blockquote>${title}</blockquote><p>${e(slot.body)}</p>${img}</section>`;
      return `<section id="section-${i + 1}" class="${slot.kind === "cta" ? "cta" : "story"}">${img}<div><span class="eyebrow">${e(slot.kicker)}</span><h2>${title}</h2><p>${e(slot.body)}</p>${cta}</div></section>`;
    })
    .join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(project.title)}</title><meta name="description" content="${e(project.brief.topic)}"><style>
 ${project.typography ? "" : `@font-face{font-family:Pretendard;src:url('${e(font)}') format('woff2');font-weight:100 900;font-display:swap}`}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${s.bg};color:${s.tx};font-family:Pretendard,system-ui,sans-serif;line-height:1.7}a{color:inherit}header,main,footer{max-width:1180px;margin:auto;padding:0 48px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-top:28px;padding-bottom:28px;border-bottom:1px solid ${s.rule}}header a{text-decoration:none}header strong{letter-spacing:-.04em;font-size:20px}section{padding:76px 0;border-bottom:1px solid ${s.rule};scroll-margin-top:20px}.hero,.story{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:64px}.story:has(img){grid-template-columns:1fr 1fr}.story:not(:has(img)){display:block;max-width:820px}.hero:not(:has(img)){display:block;max-width:900px}.hero{min-height:660px}h1,h2,blockquote{font-family:${project.preset === "editorial" ? "Georgia,'Noto Serif KR',serif" : "Pretendard,system-ui,sans-serif"};letter-spacing:-.045em;line-height:1.2;word-break:keep-all;overflow-wrap:anywhere}h1{font-size:clamp(36px,5.5vw,72px);margin:18px 0 26px}h2{font-size:clamp(28px,3.5vw,44px);margin:12px 0 28px}h3{font-size:20px;margin:18px 0;word-break:keep-all}p{font-size:17px;white-space:pre-line;overflow-wrap:anywhere;opacity:.85}img{display:block;width:100%;max-height:680px;object-fit:cover;border-radius:${project.preset === "soft" ? "32px" : "2px"}}.hero img{aspect-ratio:4/5}.eyebrow,.number{font-size:12px;letter-spacing:.1em;text-transform:uppercase}.button{display:inline-block;margin-top:24px;background:${s.acc};color:${s.accInk};padding:14px 25px;border-radius:40px;text-decoration:none;font-weight:700}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:30px}.features article{border-top:2px solid ${s.acc};padding-top:24px}.features+img{margin-top:40px;max-height:440px}.quote{max-width:860px;text-align:center;margin:auto;padding:100px 0}blockquote{font-size:clamp(28px,4vw,50px);margin:0}.cta{padding:100px 0;text-align:center}.cta img{max-height:400px;margin-bottom:40px}details{padding:22px 0;border-bottom:1px solid ${s.rule}}summary{cursor:pointer;font-weight:600;font-size:18px}footer{padding-top:35px;padding-bottom:35px;display:flex;justify-content:space-between;font-size:12px}a:focus-visible,summary:focus-visible{outline:3px solid ${s.acc};outline-offset:5px}@media(max-width:700px){header,main,footer{padding-left:24px;padding-right:24px}.hero,.story,.story:has(img){grid-template-columns:1fr;gap:32px}.hero{min-height:auto}.hero img{max-height:460px}.features{grid-template-columns:1fr}section{padding:48px 0}.quote,.cta{padding:60px 0}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
 .image-placeholder{position:relative;margin:0;min-width:0;overflow:hidden;border:1px dashed ${s.rule};border-radius:2px;background:${s.bg};color:${s.tx}}.image-placeholder>img{height:100%;max-height:none;opacity:.3;position:absolute;inset:0}.image-placeholder figcaption{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:safe center;padding:clamp(16px,2vw,28px);overflow:auto}.image-placeholder small{font:11px system-ui;letter-spacing:.08em}.image-placeholder strong{font-size:clamp(16px,1.6vw,20px);line-height:1.5;margin:20px 0;word-break:keep-all}.image-placeholder details{padding:8px 0;border:0}.image-placeholder summary{font-size:12px}.image-placeholder p{font-size:12px;max-height:150px;overflow:auto}.features+.image-placeholder,.faq>.image-placeholder{margin-top:40px}.cta>.image-placeholder{max-width:720px;margin:0 auto 40px}.hero>img{aspect-ratio:auto}.hero:has(.image-placeholder){grid-template-columns:1.1fr 1fr}@media(max-width:700px){.hero:has(.image-placeholder){grid-template-columns:1fr}.image-placeholder figcaption{padding:18px}}
 ${product ? productCss : ""}
 ${project.typography ? fontFaceCss(project.typography,fontPaths) + pageTypographyCss(project.typography) : ""}
 </style></head><body${product ? ` class="product-page" style="--product-rule:${s.rule}"` : ""}><header><strong>${e(project.brand || (product && info?.name) || project.title)}</strong><a href="#section-${project.slots.length}">${product ? "구매 안내" : "더 알아보기"} ↗</a></header><main>${sections}</main><footer><span>${e(project.brand || (product && info?.name) || project.title)}</span><span>© ${new Date(project.createdAt).getFullYear()}</span></footer></body></html>`;
}
