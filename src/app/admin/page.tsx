import type { Metadata } from "next";

import { AdminStudio } from "@/components/admin/AdminStudio";

export const metadata: Metadata = {
  title: "Post a Deal",
  description: "Paste a product link to fill the title, photo, and price.",
};

export default function AdminPage() {
  return <AdminStudio />;
}
