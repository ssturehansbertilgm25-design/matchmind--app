import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.role === ROLE.COACH ? "/coach" : "/player");
}
