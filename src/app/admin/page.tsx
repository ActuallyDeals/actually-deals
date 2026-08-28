import type { Metadata } from "next";

import { AdminStudio } from "@/components/admin/AdminStudio";

export const metadata: Metadata = {
  title: "Admin desk",
  description: "Paste a product URL, generate the deal package, and publish.",
};

export default function AdminPage() {
  return <AdminStudio />;
}
