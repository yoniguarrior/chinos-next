import type { Metadata } from "next";
import { RoomContent } from "@/components/game/room-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomname: string }>;
}): Promise<Metadata> {
  const { roomname } = await params;
  return { title: decodeURIComponent(roomname) };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomname: string }>;
}) {
  const { roomname } = await params;

  return <RoomContent roomName={decodeURIComponent(roomname)} />;
}
