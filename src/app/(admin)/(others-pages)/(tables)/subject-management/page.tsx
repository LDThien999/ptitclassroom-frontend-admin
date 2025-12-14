import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SubjectManagement from "@/components/tables/SubjectManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "",
  description:
    "",
  // other metadata
};

export default function SubjectManagementTable() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management" />
      <div className="space-y-6">
        <ComponentCard title="Subject Management Table">
          <SubjectManagement />
        </ComponentCard>
      </div>
    </div>
  );
}
