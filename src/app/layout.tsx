import type { Metadata, Viewport } from "next";
import { DM_Mono, Open_Sans, Raleway } from "next/font/google";
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
  weight: ["400", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Juego de Los Chinos",
    template: "%s | Juego de Los Chinos",
  },
  description: "Clásico juego de Los Chinos para jugar online",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/pwa-192x192.png",
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#e0a23f" },
    ],
  },
  other: {
    "msapplication-TileColor": "#161513",
  },
};

export const viewport: Viewport = {
  themeColor: "#161513",
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
      suppressHydrationWarning
      className={`${openSans.variable} ${raleway.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            <main className="flex flex-col">
              <SiteHeader />
              <div className="container-auto flex-1">{children}</div>
              <SiteFooter />
            </main>
            <div id="modal-container" />
            <Toaster />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
