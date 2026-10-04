import type { Metadata, Viewport } from "next";
import { Andika, Noto_Serif_Display, Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Every face below includes the Twi letters ɛ ɔ Ɛ Ɔ (checked against the font files).
const ui = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-ui", display: "swap" });
const display = Noto_Serif_Display({ subsets: ["latin", "latin-ext"], variable: "--font-display-face", display: "swap" });
const read = Andika({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-read-face", display: "swap" });
const code = Source_Code_Pro({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  title: "Ɔhwɛfo",
  description: "A Ghana-aware safety layer for the SecureAI Guard. Team Neuralynx, SecureAI Hackathon 2026.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ui.variable} ${display.variable} ${read.variable} ${code.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
