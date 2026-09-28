import type { ReactNode } from "react";
import { HelpShell } from "@/help/help-shell";
import "@/help/help.css";
export const metadata={title:"도움말",description:"OpenHiggsfield 기능별 화면 안내와 제작 워크플로우"};
export default function Layout({children}:{children:ReactNode}){return <HelpShell>{children}</HelpShell>;}
