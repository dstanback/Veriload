import type { Metadata } from "next";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
