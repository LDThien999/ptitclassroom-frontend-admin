import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Logs from "@/components/tables/logsmanagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
    title: "",
    description:
        "",
    // other metadata
};

export default function LogsManagementTable() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Management" />
            <div className="space-y-6">
                <ComponentCard title="Logs Management">
                    <Logs />
                </ComponentCard>
            </div>
        </div>
    );
}
