import type { Metadata, Viewport } from "next";
import { Open_Sans, Raleway } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Juego de Los Chinos",
    template: "%s | Juego de Los Chinos",
  },
  description: "Clásico juego de Los Chinos para jugar online",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg" }, { url: "/favicon.ico" }],
    apple: "/pwa-192x192.png",
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#b91c1c" },
    ],
  },
  other: {
    "msapplication-TileColor": "#b91c1c",
  },
};

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${openSans.variable} ${raleway.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            <main className="flex flex-col">
              <SiteHeader />
              <div className="container-auto flex-1">{children}</div>
              <SiteFooter />
              <div id="modal-container" />
            </main>
            <Toaster />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
