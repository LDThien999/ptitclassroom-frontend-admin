import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestionManagement from "@/components/tables/QuestionManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
    title: "",
    description:
        "",
    // other metadata
};

export default function QuestionManagementTable() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Management" />
            <div className="space-y-6">
                <ComponentCard title="Question Management Table">
                    <QuestionManagement />
                </ComponentCard>
            </div>
        </div>
    );
}
