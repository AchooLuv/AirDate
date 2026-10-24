import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { addDays, todayKey } from "@/lib/date";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const today = todayKey();
  const dates = Array.from({ length: 15 }, (_, index) => addDays(today, index - 1));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...dates
      .filter((date) => date !== today)
      .map((date) => ({
        url: `${SITE_URL}/date/${date}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
  ];
}
