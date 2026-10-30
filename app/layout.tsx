import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { HauntedBackground } from "@/components/atmosphere/haunted-background";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { DemoConsole } from "@/components/shell/demo-console";
import { AwakeningBanner, AwakeningController } from "@/components/sleeper/awakening";

// Fonts are vendored in app/fonts (SIL Open Font License), so the app never
// depends on an external font service at build or run time.
const display = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-wght-normal.woff2", style: "normal", weight: "300 700" },
    { path: "./fonts/cormorant-garamond-latin-wght-italic.woff2", style: "italic", weight: "300 700" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Iowan Old Style", "Georgia", "serif"],
});

const gothic = localFont({
  src: "./fonts/cinzel-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-cinzel",
  display: "swap",
  fallback: ["Trajan Pro", "Georgia", "serif"],
});

const sans = localFont({
  src: "./fonts/inter-tight-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter-tight",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const mono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
  fallback: ["ui-monospace", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "The Royal Dispatch — The Crown Still Hears You",
    template: "%s · The Royal Dispatch",
  },
  description:
    "The kingdom has fallen silent. Send word to the Crown: report magical disasters, track village conditions, read royal dispatches and follow restoration across the cursed Kingdom of Valmora.",
  applicationName: "The Royal Dispatch",
  openGraph: {
    title: "The Royal Dispatch",
    description: "Kingdom Incident Response & Restoration Network — a Spookathon project.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gothic.variable} ${display.variable} ${sans.variable} ${mono.variable}`} data-awakened="false">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="fixed left-4 top-2 z-[110] -translate-y-24 rounded-xs bg-ivory px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-canvas transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <HauntedBackground />
        <AppProviders>
          <SiteHeader />
          <AwakeningBanner />
          <main id="main" className="relative z-10 flex-1 overflow-x-clip">
            {children}
          </main>
          <SiteFooter />
          <DemoConsole />
          <AwakeningController />
        </AppProviders>
      </body>
    </html>
  );
}
