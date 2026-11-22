import { HomeContent } from "@/components/home-content";
import { todayKey } from "@/lib/date";

// ISR keeps the server-rendered page on the CDN while the date rolls forward.
export const revalidate = 86_400;

export default async function Home() {
  return <HomeContent date={todayKey()} />;
}
