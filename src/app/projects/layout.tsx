import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser } from "@/service/session";
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: ReactNode }) {
  if (!(await currentUser())) redirect("/login");
  return children;
}
