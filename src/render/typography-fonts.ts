import { fontFaceCss, typographyBindings, typographyFamily, typographyFaces, projectTypographyTexts, typographyCoverage, type Typography } from "@/projects/typography";
import type { Project } from "@/projects/types";

const bytesCache = new Map<string,Promise<Uint8Array>>();
const loaded = new Map<string,Promise<FontFace>>();
export function fontBytes(path:string, hash:string):Promise<Uint8Array> {
  const key=`${path}:${hash}`;
  if(!bytesCache.has(key))bytesCache.set(key,(async()=>{
    const response=await fetch(path);if(!response.ok)throw new Error("글꼴 파일을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
    const bytes=new Uint8Array(await response.arrayBuffer());
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    if(Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,"0")).join("")!==hash)throw new Error("글꼴 파일의 버전이 맞지 않아요. 페이지를 새로고침해 주세요.");
    return bytes;
  })().catch(e=>{bytesCache.delete(key);throw e;}));
  return bytesCache.get(key)!;
}
export async function loadTypography(t:Typography) {
  await Promise.all(typographyBindings(t).map(({choice:c,family,face})=>{
    const key=`${family}:${face.path}:${face.sha256}`;
    if(!loaded.has(key))loaded.set(key,(async()=>{
      const bytes=await fontBytes(face.path,face.sha256);
      const actual=new FontFace(family,bytes as Uint8Array<ArrayBuffer>,{weight:String(c.weight),style:"normal"});
      await actual.load();document.fonts.add(actual);return actual;
    })().catch(e=>{loaded.delete(key);throw e;}));
    return loaded.get(key)!;
  }));
}
export async function ensureProjectTypography(project:Project) {
  if(!project.typography){await document.fonts.load("400 16px 'Pretendard Variable'","카드뉴스");await document.fonts.ready;return;}
  await loadTypography(project.typography);
  for(const {role,value} of projectTypographyTexts(project)) {
    const missing=typographyCoverage(project.typography,role,value).missing;
    if(missing.length)throw new Error(`글꼴이 지원하지 않는 문자: ${missing.slice(0,12).join(" ")}. 기호를 확인한 뒤 다시 출력해 주세요.`);
    const c=project.typography[role];
    await document.fonts.load(`${c.weight} 24px '${typographyFamily(c)}'`,value || "Aa 한글");
  }
  await document.fonts.ready;
}
const dataUrl=(bytes:Uint8Array)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("글꼴을 출력에 포함하지 못했어요."));reader.readAsDataURL(new Blob([bytes as Uint8Array<ArrayBuffer>]));});
export async function embeddedTypographyCss(t:Typography) {
  const mapping:Record<string,string>={};
  for(const {face} of typographyFaces(t))mapping[face.path]=await dataUrl(await fontBytes(face.path,face.sha256));
  return fontFaceCss(t,mapping);
}
export async function typographyPackage(t:Typography,signal:AbortSignal) {
  const files:Record<string,Uint8Array>={},paths:Record<string,string>={},manifest=[];
  for(const {font,face} of typographyFaces(t)) {
    signal.throwIfAborted();const path=`assets/fonts/${font.id}-${face.variable?"variable":face.weights[0]}.${face.format==="woff2"?"woff2":face.format==="woff"?"woff":"ttf"}`;
    files[path]=await fontBytes(face.path,face.sha256);paths[face.path]=path;
    const licensePath=`assets/fonts/${font.id}-OFL.txt`;
    if(!files[licensePath])files[licensePath]=await fontBytes(font.licensePath,font.licenseSha256);
    manifest.push({id:font.id,name:font.name,path,sha256:face.sha256,revision:font.revision,source:face.source,license:font.license,licensePath,version:face.version,weights:face.weights});
  }
  files['assets/fonts/manifest.json']=new TextEncoder().encode(JSON.stringify({typography:t,files:manifest},null,2));
  return {files,paths};
}
