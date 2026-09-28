import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { AccountPage, ACCOUNT_SECTIONS } from "@/editors/account-page";
import { ProjectsPage } from "@/editors/projects-page";
export const metadata={title:"마이페이지",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{section:string}>}){
  const user=await currentUser();if(!user)redirect("/login");
  const {section}=await params;
  if(section==="projects")return <ProjectsPage account/>;
  if(!["activity","credits","profile","notifications","billing"].includes(section))notFound();
  return <AccountPage section={section as keyof typeof ACCOUNT_SECTIONS} user={user}/>;
}
