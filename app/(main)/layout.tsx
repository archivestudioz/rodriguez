import { Sidebar } from "@/components/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main style={{ marginLeft: "var(--sidebar-width)" }} className="min-h-screen">
        {children}
      </main>
    </>
  );
}
