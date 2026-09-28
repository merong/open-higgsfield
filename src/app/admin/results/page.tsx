import { redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { LibraryPage } from "@/editors/library-page";
export const metadata = { title:"전체 생성 결과", robots:{index:false,follow:false} };
export default async function Page({searchParams}:{searchParams:Promise<{userId?:string}>}) {
  const user=await currentUser();
  if (!user) redirect("/login");
  if (!user.admin) redirect("/projects");
  const userId=(await searchParams).userId || "";
  return <LibraryPage key={userId} admin initialUserId={userId}/>;
}
