"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import api from "../../lib/interceptor"; // Adjust path to your interceptor
import FloatingAlert from "../ui/alert/FloatingAlert"; // Adjust path to your alert component
import { Dropdown } from "../ui/dropdown/Dropdown"; // Adjust path to your dropdown component
import { DropdownItem } from "../ui/dropdown/DropdownItem"; // Adjust path to your dropdown item component
import { MoreDotIcon } from "@/icons"; // Adjust path to your icon component

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Updated Classroom interface to match ClassroomSubjectResponse
interface Classroom {
  id: number;
  name: string;
  subject: {
    id: number;
    name: string;
  };
  meetLink: string;
  isPublic: boolean;
  teacherUsername: string;
  classCode: string;
  createdAt: string;
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

export default function ScoreAboveFiveChart() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [allScores, setAllScores] = useState<ScoreResponse[]>([]);
  const [selectedScoreType, setSelectedScoreType] = useState<string>("REGULAR");
  const [threshold, setThreshold] = useState<number>(5); // Default threshold is 5
  const [loading, setLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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
        setSelectedClassroomId(classroomsData[0].id.toString()); // Use id as value for selectedClassroomId
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

  // Calculate percentage and counts of students scoring above threshold for a specific score type
  const getAboveThresholdData = useMemo(() => (scores: ScoreResponse[], type: string) => {
    const filteredScores = scores.filter((s) => s.typeofscore === type);
    if (filteredScores.length === 0) return { percentage: 0, aboveThreshold: 0, total: 0 };
    const aboveThreshold = filteredScores.filter((s) => s.score > threshold).length;
    const total = filteredScores.length;
    const percentage = Number(((aboveThreshold / total) * 100).toFixed(2));
    return { percentage, aboveThreshold, total };
  }, [threshold]);

  // Calculate percentage and counts of students with average scores above threshold
  const averageAboveThresholdData = useMemo(() => {
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
    if (avgScores.length === 0) return { percentage: 0, aboveThreshold: 0, total: 0 };
    const aboveThreshold = avgScores.filter((score) => score > threshold).length;
    const total = avgScores.length;
    const percentage = Number(((aboveThreshold / total) * 100).toFixed(2));
    return { percentage, aboveThreshold, total };
  }, [allScores, threshold]);

  // Select data based on score type
  const series = useMemo(() => {
    if (selectedScoreType === "AVERAGE") {
      return [averageAboveThresholdData.percentage];
    }
    return [getAboveThresholdData(allScores, selectedScoreType).percentage];
  }, [allScores, selectedScoreType, averageAboveThresholdData, getAboveThresholdData]);

  // Get counts for description
  const studentCounts = useMemo(() => {
    if (selectedScoreType === "AVERAGE") {
      return {
        aboveThreshold: averageAboveThresholdData.aboveThreshold,
        total: averageAboveThresholdData.total,
      };
    }
    return {
      aboveThreshold: getAboveThresholdData(allScores, selectedScoreType).aboveThreshold,
      total: getAboveThresholdData(allScores, selectedScoreType).total,
    };
  }, [allScores, selectedScoreType, averageAboveThresholdData, getAboveThresholdData]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroomId) {
      fetchAllScores(selectedClassroomId);
    }
  }, [selectedClassroomId]);

  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "80%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: [`Students Above ${threshold}`],
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
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

      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Students Scoring Above {threshold}
            </h3>
            <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
              Percentage of students with scores above {threshold} for the selected exam
            </p>
          </div>
          <div className="relative inline-block">
            <button onClick={toggleDropdown} className="dropdown-toggle">
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
            </button>
            <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
              <DropdownItem
                tag="a"
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                View Details
              </DropdownItem>
              <DropdownItem
                tag="a"
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Reset
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
          >
            <option value="">Select Classroom</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.name} - {c.subject.name} {/* Display class name and subject name */}
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
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            placeholder="Threshold"
            className="rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700 w-17 text-center"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-800 dark:text-white/90">Loading...</div>
        ) : selectedClassroomId ? (
          <div className="relative">
            <div className="max-h-[330px]">
              <ReactApexChart
                options={options}
                series={series}
                type="radialBar"
                height={330}
              />
            </div>
            <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
              {series[0] > 50 ? "Excellent" : "Needs Improvement"}
            </span>
          </div>
        ) : (
          <div className="text-center text-gray-800 dark:text-white/90">
            Please select a classroom to view the percentage of students scoring above {threshold}.
          </div>
        )}

        <div className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          <p>
            {series[0] > 0
              ? `${series[0]}% of students scored above ${threshold} in the selected exam. Keep up the good work!`
              : "No data available for the selected classroom and score type."}
          </p>
          {series[0] > 0 && (
            <p className="mt-2">
              {studentCounts.aboveThreshold}/{studentCounts.total} students scored above {threshold}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}