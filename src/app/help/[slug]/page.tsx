import { notFound } from "next/navigation";
import { GUIDES,guideFor } from "@/help/guides";
import { HelpArticle } from "@/help/help-article";
export const dynamicParams=false;
export function generateStaticParams(){return GUIDES.map(g=>({slug:g.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const guide=guideFor((await params).slug);return guide?{title:`${guide.title} · 도움말`,description:guide.description}:{};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const guide=guideFor((await params).slug);if(!guide)notFound();return <HelpArticle key={guide.slug} guide={guide}/>;}
