import { redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { AdminShell } from "@/shell/admin-shell";
export const metadata={title:"관리자 · OpenHiggsfield",robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}) {
  const user=await currentUser();
  if(!user) redirect("/login");
  if(!user.admin) redirect("/account");
  return <AdminShell user={user}>{children}</AdminShell>;
}
