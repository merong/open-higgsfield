import type { HelpIcon as IconName } from "./guides";
export function IconDrawing({name}:{name:IconName}) {
  switch(name){
    case "image":return <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>;
    case "video":return <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4Z"/></>;
    case "cards":return <><path d="M7 3h12a2 2 0 0 1 2 2v12M3 7h12a2 2 0 0 1 2 2v12H5a2 2 0 0 1-2-2Z"/><path d="M6 11h8M6 15h8M6 18h5"/></>;
    case "page":return <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M7 5.5h.1M10 5.5h.1M7 12h5M7 16h10"/></>;
    case "library":return <><path d="M3 7h7l2 3h9v10H3ZM3 7V4h7l2 3h7v3"/><path d="M8 14h8M8 17h5"/></>;
    case "credit":return <><path d="m3 9 4-5h10l4 5-9 12ZM3 9h18M7 4l5 17 5-17"/></>;
    case "user":return <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>;
    case "admin":return <><path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z"/><path d="m8 12 3 3 5-6"/></>;
    case "key":return <><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9M15 15l3-3M18 18l3-3"/></>;
    case "check":return <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>;
    case "edit":return <><path d="m4 15 11-11 5 5L9 20l-6 1ZM12 7l5 5M4 15l5 5"/></>;
    case "download":return <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>;
    case "search":return <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>;
    default:return <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/></>;
  }
}
export function HelpIcon({name,size=24}:{name:IconName;size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><IconDrawing name={name}/></svg>;}
