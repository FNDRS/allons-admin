import { redirect } from "next/navigation";

export default function RootIndex() {
  // Middleware already gates auth; if we reach this we're authenticated.
  redirect("/overview");
}
