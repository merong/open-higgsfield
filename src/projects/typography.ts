import catalog from "./font-catalog.json";
import type { Project } from "./types";

export type FontRole = "title" | "body" | "accent";
export type FontChoice = { font: string; weight: number };
export type Typography = { version: 1; preset: string; title: FontChoice; body: FontChoice; accent: FontChoice; confirmed: boolean };
export type TypographyRecommendation = { presetId: string; reason: string; caution: string };
export const FONT_CATALOG = catalog.fonts;
export const fontById = (id: string) => FONT_CATALOG.find(f => f.id === id)!;
export const roleLabels: Record<FontRole, string> = { title: "한글 제목", body: "한글 본문", accent: "영문 제목·숫자" };
export const displayOnly = (id: string) => ["black-han-sans", "do-hyeon", "bebas-neue"].includes(id);
export const fontWeights = (id: string) => [...new Set(fontById(id).faces.flatMap(f => f.weights))].filter(w => w >= 400).sort((a,b) => a-b);
const choice = (font: string, weight: number): FontChoice => ({ font, weight });
export const TYPOGRAPHY_PRESETS = [
  { id: "clear", name: "명료한 정보", description: "관리법·설명·비교를 정확하고 편안하게", title: choice("pretendard",800), body: choice("pretendard",400), accent: choice("inter",600) },
  { id: "technical", name: "기술과 전문성", description: "AI·개발·B2B의 정보 위계를 또렷하게", title: choice("ibm-plex-sans-kr",600), body: choice("suit",400), accent: choice("space-grotesk",600) },
  { id: "statement", name: "강한 메시지", description: "짧은 표지와 핵심 숫자에 시선 집중", title: choice("black-han-sans",400), body: choice("pretendard",500), accent: choice("bebas-neue",400) },
  { id: "premium", name: "정제된 브랜드", description: "상품의 디테일과 브랜드 스토리를 차분하게", title: choice("noto-serif-kr",600), body: choice("pretendard",400), accent: choice("playfair-display",600) },
  { id: "natural", name: "자연과 감성", description: "식물·공간·라이프스타일의 여유를 살려서", title: choice("gowun-batang",700), body: choice("suit",400), accent: choice("cormorant-garamond",600) },
  { id: "friendly", name: "밝고 친근함", description: "짧은 안내와 생활 이야기를 경쾌하게", title: choice("do-hyeon",400), body: choice("noto-sans-kr",400), accent: choice("poppins",600) },
] as const;
export function typographyPreset(id = "clear", confirmed = false): Typography {
  const p = TYPOGRAPHY_PRESETS.find(p => p.id === id) || TYPOGRAPHY_PRESETS[0];
  return { version: 1, preset: p.id, title: { ...p.title }, body: { ...p.body }, accent: { ...p.accent }, confirmed };
}
export function defaultTypography(project: Pick<Project, "preset">) {
  return typographyPreset(({basic:"clear",editorial:"premium",impact:"statement",soft:"natural"} as const)[project.preset]);
}
export function typographyFaces(t: Typography) {
  const choices = [t.title,t.body,t.accent,choice("pretendard",400),choice("inter",400)];
  const selected = choices.map(c => { const font = fontById(c.font); return { font, face: font.faces.find(f => f.weights.includes(c.weight))! }; });
  return selected.filter((v,i,a) => a.findIndex(other => other.face.path === v.face.path) === i);
}
// Separate CSS faces for each selected weight keep mixed-language headings from
// borrowing the Korean title weight for their Latin accent font.
export const typographyFamily = (c: FontChoice) => `${fontById(c.font).family} ${c.weight}`;
export function typographyBindings(t: Typography) {
  return [t.title,t.body,t.accent,choice("pretendard",400),choice("inter",400)]
    .filter((v,i,a)=>a.findIndex(c=>c.font===v.font&&c.weight===v.weight)===i)
    .map(c=>({choice:c,family:typographyFamily(c),font:fontById(c.font),face:fontById(c.font).faces.find(f=>f.weights.includes(c.weight))!}));
}
const family = (c: FontChoice) => `'${typographyFamily(c)}'`;
export function typographyStyle(t: Typography): Record<string, string | number> {
  return {
    "--ty-title": `${family(t.accent)},${family(t.title)},${family(t.body)},${family(choice("pretendard",400))},sans-serif`,
    "--ty-body": `${family(choice("inter",400))},${family(t.body)},${family(choice("pretendard",400))},sans-serif`,
    "--ty-accent": `${family(t.accent)},${family(t.body)},${family(choice("pretendard",400))},sans-serif`,
    "--ty-title-weight": t.title.weight, "--ty-body-weight": t.body.weight, "--ty-accent-weight": t.accent.weight,
    "--ty-title-leading": displayOnly(t.title.font) ? 1.25 : 1.3,
    "--ty-title-tracking": displayOnly(t.title.font) ? "-.015em" : "-.025em",
  };
}
export function fontFaceCss(t: Typography, paths: Record<string,string> = {}) {
  return typographyBindings(t).map(({choice:c,family,face}) => `@font-face{font-family:'${family}';src:url('${paths[face.path] || face.path}') format('${face.format}');font-weight:${c.weight};font-style:normal;font-display:swap}`).join("\n");
}
export const typographyCss = (t: Typography) => Object.entries(typographyStyle(t)).map(([key,v]) => `${key}:${v}`).join(";");
export const pageTypographyCss = (t: Typography) => `:root{${typographyCss(t)}}body{font-family:var(--ty-body);font-weight:var(--ty-body-weight);font-synthesis:none}h1,h2,h3,blockquote,.product-page h1{font-family:var(--ty-title);font-weight:var(--ty-title-weight);line-height:var(--ty-title-leading);letter-spacing:var(--ty-title-tracking);font-synthesis:none}.eyebrow,.number,.product-price{font-family:var(--ty-accent);font-weight:var(--ty-accent-weight);font-variant-numeric:tabular-nums}strong,summary,.button{font-weight:var(--ty-body-weight);font-synthesis:none}p,.product-tagline{line-height:1.75}`;

export function fontSupports(id: string, weight: number, code: number) {
  const face = fontById(id)?.faces.find(f => f.weights.includes(weight));
  return !!face?.coverage.some(([a,b]) => a <= code && code <= b);
}
export function typographyCoverage(t: Typography, role: FontRole, value: string) {
  const selected = t[role], fallback = [t.body,choice("pretendard",400)], latin = role === "body" ? choice("inter",400) : t.accent;
  const chain = [latin,selected,...fallback];
  const characters = [...new Set([...value].filter(c => !/[\s\u200b-\u200f\ufe0e\ufe0f]/u.test(c)))];
  const missing = characters.filter(c => !chain.some(f => fontSupports(f.font,f.weight,c.codePointAt(0)!)));
  const substituted = characters.filter(c => /[\uac00-\ud7af]/u.test(c) && !fontSupports(selected.font,selected.weight,c.codePointAt(0)!) && !missing.includes(c));
  return { missing, substituted };
}
export function projectTypographyTexts(p: Project): {role: FontRole; value:string}[] {
  return [
    { role:"title", value:p.slots.map(s=>s.title).join("\n") + (p.product?.name || "") },
    { role:"body", value:p.slots.map(s=>[s.body,s.cta].join("\n")).join("\n") + p.title + p.brand + Object.values(p.product || {}).filter(v=>typeof v==="string").join("\n") },
    { role:"accent", value:p.slots.map(s=>s.kicker).join("\n") + (p.product?.price || "") + "0123456789%₩· /" },
  ];
}
export const typographyPrompt = `타이포그래피도 콘텐츠 전달의 일부입니다. 아래 조합 중 정확히 3개를 서로 다르게 추천하세요. typographyRecommendations는 presetId, reason(사용자 주제·대상·문구 길이와 제목/본문 역할을 연결한 160자 이내 이유), caution(모바일 가독성·너무 긴 제목·얇은 획·지원 글자 등 120자 이내 주의점)입니다. 첫 조합이 가장 적합한 제안입니다. 단순히 식물이라는 이유로 감성 명조를 고르지 말고 관리법/정보는 명료함, 브랜드 이야기는 분위기, 짧은 표지는 강조를 우선하세요. 본문에는 제목용 디스플레이를 쓰지 않습니다. 사용자 확정 typography는 바꾸지 않으며 원문 축약/자동 폰트 축소를 제안하지 마세요. 실제 픽셀 검수를 했다고 주장하지 마세요. 조합: ${TYPOGRAPHY_PRESETS.map(p=>`${p.id}=${p.name}(${p.title.font} ${p.title.weight}/${p.body.font} ${p.body.weight}/${p.accent.font} ${p.accent.weight}):${p.description}`).join("; ")}`;
export const typographyRecommendationsSchema = { type:"array", items:{type:"object",additionalProperties:false,required:["presetId","reason","caution"],properties:{presetId:{type:"string",enum:TYPOGRAPHY_PRESETS.map(p=>p.id)},reason:{type:"string"},caution:{type:"string"}}} };
