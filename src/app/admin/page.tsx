import { redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { AdminDashboardPage } from "@/editors/admin-reports-page";
export const metadata = {title:"관리자",robots:{index:false,follow:false}};
export default async function Page() {
  const user=await currentUser();
  if (!user) redirect("/login");
  if (!user.admin) redirect("/projects");
  return <AdminDashboardPage/>;
}
