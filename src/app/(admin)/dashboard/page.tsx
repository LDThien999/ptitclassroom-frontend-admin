import type { Metadata } from "next";
import EcommerceMetrics from "@/components/analysis/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/analysis/MonthlyTarget";
import MonthlySalesChart from "@/components/analysis/MonthlySalesChart";
import StatisticsChart from "@/components/analysis/StatisticsChart";
import RecentOrders from "@/components/analysis/RecentOrders";
import DemographicCard from "@/components/analysis/DemographicCard";
import LineChart from "@/components/analysis/LineChart";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

export default function Ecommerce() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />

        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12">
        <LineChart /> {/* Thay StatisticsChart bằng LineChart */}
      </div>

      {/* <div className="col-span-12">
        <StatisticsChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div> */}
    </div>
  );
}
