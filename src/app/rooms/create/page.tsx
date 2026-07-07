import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateRoomContent } from "@/components/rooms/create-room-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("room.create_data") };
}

export default function CreateRoomPage() {
  return (
    <div className="main-content">
      <CreateRoomContent />
    </div>
  );
}
