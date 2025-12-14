"use client";
import React, { useState, useEffect } from "react";
import Badge from "../ui/badge/Badge";
import { GroupIcon, BoxIconLine } from "@/icons";
import api from "../../lib/interceptor";
import FloatingAlert from "../ui/alert/FloatingAlert";

interface UserProfileResponse {
  id: string;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  dob: string;
  avatar: string;
}

interface QuestionResponse {
  id: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  level: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  subjectId: number;
}

interface ApiResponse<T> {
  result: T;
  message?: string;
  code: number;
}

interface Alert {
  id: string;
  type: "success" | "error";
  title: string;
  message: string;
}

export default function MetricsDashboard() {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Manage alerts
  const addAlert = (type: "success" | "error", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2);
    setAlerts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeAlert(id), 5000);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  // Fetch users and questions
  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Fetch users
      const userResponse = await api.get<ApiResponse<UserProfileResponse[]>>("/profile/users");
      const users = userResponse.data.result || [];
      setTotalUsers(users.length);

      // Fetch questions
      const questionResponse = await api.get<ApiResponse<QuestionResponse[]>>("/questions/");
      const questions = questionResponse.data.result || [];
      setTotalQuestions(questions.length);
      console.log("Total Questions:", questions.length);
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Alerts */}
      {alerts.map((alert, index) => (
        <FloatingAlert
          key={alert.id}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => removeAlert(alert.id)}
          position="top-right"
          className={`top-${5 + index * 15}`}
        />
      ))}

      {/* Total Users Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Users
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "Loading..." : totalUsers.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      {/* Total Questions Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Questions
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "Loading..." : totalQuestions.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}