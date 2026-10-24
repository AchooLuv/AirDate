import { HomeContent } from "@/components/home-content";
import { todayKey } from "@/lib/date";

// ISR keeps the server-rendered page on the CDN while the date rolls forward.
export const revalidate = 300;

export default async function Home() {
  return <HomeContent date={todayKey()} />;
}
