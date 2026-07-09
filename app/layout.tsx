import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

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
      <body>
        <Sidebar />
        <main style={{ marginLeft: "var(--sidebar-width)" }} className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
