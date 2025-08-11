"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import api from "../../lib/interceptor";
import FloatingAlert from "../ui/alert/FloatingAlert";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Classroom {
  classroomId: string;
  total: number;
  subjectId: number;
  subjectName: string;
}

interface ScoreResponse {
  scoreDetailId: number;
  score: number;
  studentId: number;
  classroomId: string;
  typeofscore: string;
}

interface ApiResponse<T> {
  result: T;
  message?: string;
  code: number;
}

interface ScorePagingResponse {
  items: ScoreResponse[];
  nextCursor: number;
  hasNext: boolean;
}

interface Alert {
  id: string;
  type: "success" | "error";
  title: string;
  message: string;
}

export default function ScoreStatisticsChart() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [allScores, setAllScores] = useState<ScoreResponse[]>([]);
  const [selectedScoreType, setSelectedScoreType] = useState<string>("REGULAR");
  const [loading, setLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const pageSize = 20;

  // Manage alerts
  const addAlert = (type: "success" | "error", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2);
    setAlerts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeAlert(id), 5000);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  // Fetch classrooms
  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<Classroom[]>>(
        `/score/get-classroom?cursor=0&page=0&size=100`
      );
      const classroomsData = response.data.result || [];
      setClassrooms(classroomsData);
      if (classroomsData.length > 0) {
        setSelectedClassroomId(classroomsData[0].classroomId);
      }
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all scores for a classroom
  const fetchAllScores = async (classId: string) => {
    try {
      setLoading(true);
      let cursor = 0;
      let all: ScoreResponse[] = [];
      while (true) {
        const queryParams = new URLSearchParams({
          cursor: cursor.toString(),
          page: "0",
          size: pageSize.toString(),
          classroomId: classId,
        });
        const response = await api.get<ApiResponse<ScorePagingResponse>>(
          `/score/get-list-score?${queryParams.toString()}`
        );
        const { items, nextCursor, hasNext } = response.data.result || { items: [], nextCursor: 0, hasNext: false };
        all = [...all, ...items];
        cursor = nextCursor;
        if (!hasNext) break;
      }
      setAllScores(all);
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to load scores");
      setAllScores([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized bin data for a specific score type
  const getBinData = useMemo(() => (scores: ScoreResponse[], type: string) => {
    const bins = Array(11).fill(0); // 11 bins for 0 to 10
    scores
      .filter((s) => s.typeofscore === type)
      .forEach((score) => {
        const bin = Math.min(10, Math.round(score.score)); // Round score to nearest integer
        bins[bin]++;
      });
    return bins;
  }, []);

  // Memoized bin data for average scores
  const averageData = useMemo(() => {
    const studentScores = new Map<number, { regular: number[]; midterm: number[]; final: number[] }>();
    allScores.forEach((score) => {
      if (!studentScores.has(score.studentId)) {
        studentScores.set(score.studentId, { regular: [], midterm: [], final: [] });
      }
      const group = studentScores.get(score.studentId)!;
      if (score.typeofscore === "REGULAR") group.regular.push(score.score);
      else if (score.typeofscore === "MIDTERM") group.midterm.push(score.score);
      else if (score.typeofscore === "FINAL") group.final.push(score.score);
    });
    const avgScores: number[] = [];
    studentScores.forEach((groups) => {
      const avgReg = groups.regular.length > 0 ? groups.regular.reduce((a, b) => a + b, 0) / groups.regular.length : 0;
      const avgMid = groups.midterm.length > 0 ? groups.midterm.reduce((a, b) => a + b, 0) / groups.midterm.length : 0;
      const avgFin = groups.final.length > 0 ? groups.final.reduce((a, b) => a + b, 0) / groups.final.length : 0;
      const avg = avgReg * 0.1 + avgMid * 0.3 + avgFin * 0.6;
      avgScores.push(avg);
    });
    const bins = Array(11).fill(0); // 11 bins for 0 to 10
    avgScores.forEach((score) => {
      const bin = Math.min(10, Math.round(score)); // Round score to nearest integer
      bins[bin]++;
    });
    return bins;
  }, [allScores]);

  // Select data based on score type
  const chartData = useMemo(() => {
    if (selectedScoreType === "AVERAGE") {
      return [{ name: "Students", data: averageData }];
    }
    return [{ name: "Students", data: getBinData(allScores, selectedScoreType) }];
  }, [allScores, selectedScoreType, averageData, getBinData]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroomId) {
      fetchAllScores(selectedClassroomId);
    }
  }, [selectedClassroomId]);

  const chartOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "30%", // Adjusted for 11 bars
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 1, // Smaller gap for 11 bars
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: "Number of Students",
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val} students`,
      },
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
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

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Score Distribution
        </h3>
        <div className="flex gap-4">
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
          >
            <option value="">Select Classroom</option>
            {classrooms.map((c) => (
              <option key={c.classroomId} value={c.classroomId}>
                {c.classroomId} - {c.subjectName}
              </option>
            ))}
          </select>
          <select
            value={selectedScoreType}
            onChange={(e) => setSelectedScoreType(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
          >
            <option value="REGULAR">Regular Scores</option>
            <option value="MIDTERM">Midterm Scores</option>
            <option value="FINAL">Final Scores</option>
            <option value="AVERAGE">Average Scores</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : selectedClassroomId ? (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
            <ReactApexChart
              options={chartOptions}
              series={chartData}
              type="bar"
              height={180}
            />
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-800 dark:text-white/90">Please select a classroom to view score distribution.</div>
      )}
    </div>
  );
}