// Home route: sends everyone to the dashboard (middleware sends signed-out users to /login first).
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
