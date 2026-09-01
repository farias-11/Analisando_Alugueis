import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: personal } = await supabase
    .from("personals")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  redirect(personal ? "/dashboard" : "/home");
}
