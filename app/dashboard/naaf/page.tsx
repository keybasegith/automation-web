import { redirect } from "next/navigation";

/** The NAAF now opens beside its CRQ in the new-account workspace. */
export default function NaafPage() {
  redirect("/dashboard/new-account");
}
