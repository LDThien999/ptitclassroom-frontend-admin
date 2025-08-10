import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserManagement from "@/components/tables/UserManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Basic Table | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Basic Table  page for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};

export default function UserManagementTable() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management" />
      <div className="space-y-6">
        <ComponentCard title="User Management Table">
          <UserManagement />
        </ComponentCard>
      </div>
    </div>
  );
}
