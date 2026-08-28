import type { Metadata } from "next";

import { AdminStudio } from "@/components/admin/AdminStudio";

export const metadata: Metadata = {
  title: "Staff desk",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminStudio />;
}
