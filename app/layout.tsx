import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rodriguez — Ledger of Provision",
  description:
    "Sales, cost, and profit-margin ledger for the bodega. Import register sales, know your daily bread.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
