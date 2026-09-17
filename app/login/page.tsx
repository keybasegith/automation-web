import { redirect } from "next/navigation";

/** Existing login bookmarks now open the workspace directly. */
export default function LoginPage() {
  redirect("/dashboard");
}
