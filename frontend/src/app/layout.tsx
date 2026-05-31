import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rush Tracker",
  description: "Kappa Sigma recruitment intake and prospect operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
