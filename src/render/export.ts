import { ensureProjectTypography, embeddedTypographyCss, typographyPackage } from "./typography-fonts";
import { toCanvas } from "html-to-image";
import { zipSync, strToU8 } from "fflate";
import type { Project } from "@/projects/types";
import { DIMENSIONS } from "@/projects/formats";
import { landingHtml } from "./landing";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const filename = (name: string) =>
  name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 90) || "project";
export async function blobBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}
export function zip(files: Record<string, Uint8Array>) {
  return new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], {
    type: "application/zip",
  });
}
async function fontCss() {
  const response = await fetch("/fonts/PretendardVariable.woff2");
  if (!response.ok) throw new Error("글꼴을 불러오지 못했습니다.");
  const blob = await response.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return `@font-face{font-family:'Pretendard Variable';src:url(${data}) format('woff2');font-weight:100 900}`;
}
export async function rasterize(
  nodes: HTMLElement[],
  project: Project,
  onProgress: (value: number) => void,
  signal: AbortSignal,
  review = false,
) {
  await ensureProjectTypography(project);
  const fontEmbedCSS = project.typography ? await embeddedTypographyCss(project.typography) : await fontCss();
  const [width, height] = DIMENSIONS[project.ratio];
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < nodes.length; i++) {
    signal.throwIfAborted();
    const slide = nodes[i].querySelector<HTMLElement>(".ohf-slide")!,
      body = slide.querySelector<HTMLElement>(".ohf-slide-body")!,
      footer = slide.querySelector<HTMLElement>(".ohf-slide-foot");
    const limit =
      footer?.getBoundingClientRect().top ??
      slide.getBoundingClientRect().bottom;
    if (
      !review && Array.from(body.children).some(
        (child) => child.getBoundingClientRect().bottom > limit + 1,
      )
    )
      throw new Error(
        `${i + 1}번째 장의 문구가 출력 영역을 벗어납니다. 확정 문구를 유지하고 설명 중심 배치·사진 비율·여백을 먼저 조정해 주세요.`,
      );
    for (const img of Array.from(slide.querySelectorAll("img"))) {
      if (!img.complete) await img.decode();
      if (!img.naturalWidth)
        throw new Error(
          `${i + 1}번째 장의 이미지가 열리지 않습니다. 다시 업로드해 주세요.`,
        );
    }
    const canvas = await toCanvas(nodes[i], {
      pixelRatio: 1,
      width,
      height,
      fontEmbedCSS,
      cacheBust: false,
    });
    canvases.push(canvas);
    onProgress((i + 1) / nodes.length);
  }
  return canvases;
}
export async function exportCards(
  nodes: HTMLElement[],
  project: Project,
  onProgress: (value: number) => void,
  signal: AbortSignal,
  single = false,
  review = false,
) {
  const canvases = await rasterize(nodes, project, onProgress, signal, review);
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < canvases.length; i++) {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvases[i].toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG를 만들지 못했습니다."))),
        "image/png",
      ),
    );
    signal.throwIfAborted();
    if (single) {
      return { blob, name: `${filename(project.title)}.png` };
    }
    files[`${String(i + 1).padStart(2, "0")}.png`] = await blobBytes(blob);
  }
  files["caption.txt"] = strToU8(project.caption);
  files["project.json"] = strToU8(JSON.stringify(project, null, 2));
  return { blob: zip(files), name: `${filename(project.title)}.zip` };
}
export async function exportLanding(
  project: Project,
  progress: (value: number) => void,
  signal: AbortSignal,
) {
  const urls = [
    ...new Set(
      project.slots.flatMap((s) =>
        s.media?.kind === "image" ? [s.media.url] : [],
      ),
    ),
  ];
  const files: Record<string, Uint8Array> = {},
    mapping: Record<string, string> = {};
  for (let i = 0; i < urls.length; i++) {
    signal.throwIfAborted();
    const response = await fetch(urls[i]);
    if (!response.ok)
      throw new Error(
        "이미지를 다운로드하지 못했습니다. 파일을 업로드해 다시 시도해 주세요.",
      );
    const blob = await response.blob();
    const ext = blob.type.includes("png")
      ? "png"
      : blob.type.includes("webp")
        ? "webp"
        : "jpg";
    const path = `assets/image-${i + 1}.${ext}`;
    files[path] = await blobBytes(blob);
    mapping[urls[i]] = path;
    progress((i + 1) / (urls.length + 1));
  }
  if(project.typography) {
    await ensureProjectTypography(project);
    const packaged=await typographyPackage(project.typography,signal);
    Object.assign(files,packaged.files);
    files["index.html"]=strToU8(landingHtml(project,mapping,"",false,packaged.paths));
  } else {
  const font = await fetch("/fonts/PretendardVariable.woff2");
  if (!font.ok) throw new Error("글꼴을 불러오지 못했습니다.");
  files["assets/font.woff2"] = new Uint8Array(await font.arrayBuffer());
  const license = await fetch("/fonts/OFL-Pretendard.txt");
  if (!license.ok) throw new Error("글꼴 라이선스를 불러오지 못했습니다.");
  files["assets/OFL-Pretendard.txt"] = new Uint8Array(
    await license.arrayBuffer(),
  );
  files["index.html"] = strToU8(
    landingHtml(project, mapping, "assets/font.woff2"),
  );
  }
  files["project.json"] = strToU8(JSON.stringify(project, null, 2));
  signal.throwIfAborted();
  progress(1);
  return { blob: zip(files), name: `${filename(project.title)}-website.zip` };
}
export function subtitles(project: Project) {
  let at = 0;
  const time = (s: number) =>
    new Date(s * 1000).toISOString().slice(11, 23).replace(".", ",");
  return project.slots
    .map((slot, i) => {
      const start = at;
      at += slot.duration;
      return `${i + 1}\n${time(start)} --> ${time(at)}\n${slot.title}\n${slot.body}\n`;
    })
    .join("\n");
}
