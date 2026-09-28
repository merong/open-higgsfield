import { redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { AccountShell } from "@/shell/account-shell";
export default async function Layout({children}:{children:React.ReactNode}) {
  const user=await currentUser();
  if(!user) redirect("/login");
  return <AccountShell user={user}>{children}</AccountShell>;
}
