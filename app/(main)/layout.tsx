import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

// Main layout: all pages that need the sidebar
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
      <BottomNav />
    </div>
  );
}
