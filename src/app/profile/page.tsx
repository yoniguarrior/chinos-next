import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileContent } from "@/components/profile/profile-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.profile.title") };
}

export default async function ProfilePage() {
  return (
    <div className="main-content">
      <ProfileContent />
    </div>
  );
}
