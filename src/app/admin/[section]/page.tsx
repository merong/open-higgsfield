import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { AdminCollectionPage } from "@/editors/admin-reports-page";
import { AdminPage } from "@/editors/admin-page";
import { SettingsPage } from "@/editors/settings-page";
export default async function Page({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<{userId?:string;filter?:string}>}) {
  const user=await currentUser();
  if(!user) redirect("/login");
  if(!user.admin) redirect("/account");
  const {section}=await params,query=await searchParams;
  if(section==="settings")return <SettingsPage/>;
  if(section==="credits")return <AdminPage key={query.userId || "all"} initialUserId={query.userId || ""}/>;
  if(section==="users" || section==="projects" || section==="activity")return <AdminCollectionPage key={`${section}:${query.userId}:${query.filter}`} section={section} initialUserId={query.userId || ""} initialFilter={query.filter || ""}/>;
  notFound();
}
