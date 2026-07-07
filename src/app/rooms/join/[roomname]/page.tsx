import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinRoomContent } from "@/components/rooms/join-room-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.rooms.title") };
}

export default async function JoinRoomPage({
  params,
}: {
  params: Promise<{ roomname: string }>;
}) {
  const { roomname } = await params;

  return (
    <div className="main-content">
      <JoinRoomContent roomName={decodeURIComponent(roomname)} />
    </div>
  );
}
