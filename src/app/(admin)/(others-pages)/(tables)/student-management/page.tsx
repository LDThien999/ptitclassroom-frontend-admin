import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentManagement from "@/components/tables/StudentManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  // other metadata
};

export default function StudentManagementTable() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management" />
      <div className="space-y-6">
        <ComponentCard title="Student Management Table">
          <StudentManagement />
        </ComponentCard>
      </div>
    </div>
  );
}
