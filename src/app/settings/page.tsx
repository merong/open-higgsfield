import { redirect } from "next/navigation";
import { currentUser } from "@/service/session";
export default async function Page(){
  const user=await currentUser();
  if(!user) redirect("/login");
  if(!user.admin) redirect("/account");
  redirect("/admin/settings");
}
