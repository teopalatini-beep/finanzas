import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Cuánto puedo gastar sin romper el mes",
  appleWebApp: { capable: true, title: "Finanzas", statusBarStyle: "default" },
};

const THEMES = ["day", "dark"] as const;
const THEME_COLOR = { day: "#f4f6f5", dark: "#060e1f" } as const;

// Color de la barra del navegador: el del tema elegido, o el del teléfono si todavía no elegiste.
export async function generateViewport(): Promise<Viewport> {
  const saved = (await cookies()).get("theme")?.value;
  const theme = THEMES.find((t) => t === saved);
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: theme
      ? THEME_COLOR[theme]
      : [
          { media: "(prefers-color-scheme: light)", color: THEME_COLOR.day },
          { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
        ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get("theme")?.value;
  const theme = THEMES.find((t) => t === saved);

  return (
    <html lang="es-AR" data-theme={theme} className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
