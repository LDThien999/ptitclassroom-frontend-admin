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
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Classroom interface matching ClassroomSubjectResponse
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

export default function LineChart() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
    const [allScores, setAllScores] = useState<ScoreResponse[]>([]);
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
                setSelectedClassroomId(classroomsData[0].id.toString());
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

    // Calculate average scores for each score type and overall average
    const averageScores = useMemo(() => {
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

        const regularScores = allScores.filter((s) => s.typeofscore === "REGULAR");
        const midtermScores = allScores.filter((s) => s.typeofscore === "MIDTERM");
        const finalScores = allScores.filter((s) => s.typeofscore === "FINAL");

        const avgRegular = regularScores.length > 0 ? regularScores.reduce((sum, s) => sum + s.score, 0) / regularScores.length : 0;
        const avgMidterm = midtermScores.length > 0 ? midtermScores.reduce((sum, s) => sum + s.score, 0) / midtermScores.length : 0;
        const avgFinal = finalScores.length > 0 ? finalScores.reduce((sum, s) => sum + s.score, 0) / finalScores.length : 0;

        const avgScores: number[] = [];
        studentScores.forEach((groups) => {
            const avgReg = groups.regular.length > 0 ? groups.regular.reduce((a, b) => a + b, 0) / groups.regular.length : 0;
            const avgMid = groups.midterm.length > 0 ? groups.midterm.reduce((a, b) => a + b, 0) / groups.midterm.length : 0;
            const avgFin = groups.final.length > 0 ? groups.final.reduce((a, b) => a + b, 0) / groups.final.length : 0;
            const avg = avgReg * 0.1 + avgMid * 0.3 + avgFin * 0.6;
            avgScores.push(avg);
        });
        const avgOverall = avgScores.length > 0 ? avgScores.reduce((sum, s) => sum + s, 0) / avgScores.length : 0;

        return {
            regular: avgRegular,
            midterm: avgMidterm,
            final: avgFinal,
            average: avgOverall,
        };
    }, [allScores]);

    // Chart data for line chart
    const series = useMemo(() => [
        {
            name: "Average Score",
            data: [
                averageScores.regular,
                averageScores.midterm,
                averageScores.final,
                averageScores.average,
            ],
        },
    ], [averageScores]);

    // Get selected classroom for description
    const selectedClassroom = useMemo(() => {
        return classrooms.find((c) => c.id.toString() === selectedClassroomId);
    }, [classrooms, selectedClassroomId]);

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
            type: "line",
            height: 330,
            toolbar: {
                show: false,
            },
        },
        stroke: {
            curve: "smooth",
            width: 2,
        },
        markers: {
            size: 5,
        },
        xaxis: {
            categories: ["Regular", "Midterm", "Final", "Average"],
            axisBorder: { show: false },
            axisTicks: { show: false },
            title: { text: "Score Type" },
        },
        yaxis: {
            min: 0,
            max: 10,
            title: { text: "Average Score" },
            labels: {
                formatter: (val) => val.toFixed(1),
            },
        },
        grid: {
            yaxis: { lines: { show: true } },
        },
        tooltip: {
            y: {
                formatter: (val: number) => `${val.toFixed(2)}`,
            },
        },
        legend: {
            show: true,
            position: "top",
            horizontalAlign: "left",
            fontFamily: "Outfit",
        },
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
                            Score Trend
                        </h3>
                        <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
                            Average scores across different score types for the selected classroom
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
                                {c.name} - {c.subject.name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="text-center text-gray-800 dark:text-white/90">Loading...</div>
                ) : selectedClassroomId ? (
                    <div className="relative">
                        <div className="max-h-[330px]">
                            <ReactApexChart
                                options={options}
                                series={series}
                                type="line"
                                height={330}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-800 dark:text-white/90">
                        Please select a classroom to view the score trend.
                    </div>
                )}

                <div className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
                    <p>
                        {selectedClassroom
                            ? `Average scores for ${selectedClassroom.name} - ${selectedClassroom.subject.name}`
                            : "No data available for the selected classroom."}
                    </p>
                </div>
            </div>
        </div>
    );
}