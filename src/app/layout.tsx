import type { Metadata } from "next";

import { ThemeProvider } from "@/components/ui/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Veriload",
  description: "Automated BoL reconciliation and invoice matching for logistics back-offices."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent FOUC — applies dark class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("veriload-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d)}catch(e){}})()`,
          }}
        />
        {/* Google Fonts — Inter (UI) and JetBrains Mono (code/data)
            On Vercel, replace these <link> tags with next/font/google imports
            for automatic self-hosting and font optimization:

            import { Inter, JetBrains_Mono } from "next/font/google";
            const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
            const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
            <html className={`${inter.variable} ${jetbrainsMono.variable}`}> */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
