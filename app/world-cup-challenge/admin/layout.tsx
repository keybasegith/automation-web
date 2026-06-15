import { Guard } from "@/components/world-cup/Guard";
import { AdminSidebar } from "@/components/world-cup/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard requireAdmin>
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6">{children}</div>
      </div>
    </Guard>
  );
}
