import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HOME_FOR_ROLE } from "@/lib/constants";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(HOME_FOR_ROLE[user.role] ?? "/login");
}
