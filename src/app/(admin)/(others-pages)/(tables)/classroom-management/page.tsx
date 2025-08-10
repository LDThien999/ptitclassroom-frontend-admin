import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ClassroomManagement from "@/components/tables/ClassroomManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "",
  description:
    "",
  // other metadata
};

export default function ClassroomManagementTable() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management" />
      <div className="space-y-6">
        <ComponentCard title="User Management Table">
          <ClassroomManagement />
        </ComponentCard>
      </div>
    </div>
  );
}
