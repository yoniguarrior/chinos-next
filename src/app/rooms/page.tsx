import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RoomsContent } from "@/components/rooms/rooms-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.rooms.title") };
}

export default function RoomsPage() {
  return (
    <div className="main-content">
      <RoomsContent />
    </div>
  );
}
