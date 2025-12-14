import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TeacherManagement from "@/components/tables/TeacherManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  // other metadata
};

export default function TeacherManagementTable() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management" />
      <div className="space-y-6">
        <ComponentCard title="Teacher Management Table">
          <TeacherManagement />
        </ComponentCard>
      </div>
    </div>
  );
}
