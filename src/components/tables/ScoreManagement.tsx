"use client";
import { useEffect, useState } from "react";
import api from "../../lib/interceptor";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import FloatingAlert from "../ui/alert/FloatingAlert";
import { useModal } from "@/hooks/useModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Subject {
    id: number;
    name: string;
}

interface ClassroomResponse {
    id: number;
    name: string;
    subject: Subject;
    meetLink: string;
    isPublic: boolean;
    teacherUsername: string;
    classCode: string;
    createdAt: string;
}

interface UserProfileResponse {
    id: string;
    userId: number;
    username: string;
    fullName: string;
    email: string;
    dob: string;
    avatar?: string;
}

enum TYPEOFSCORE {
    REGULAR = "REGULAR",
    MIDTERM = "MIDTERM",
    FINAL = "FINAL",
    AVERAGE = "AVERAGE",
}

interface ScoreResponse {
    scoreDetailId: number;
    score: number | null;
    studentUsername: string;
    classroomId: number;
    typeofscore: TYPEOFSCORE;
}

interface ScorePagingResponse {
    items: ScoreResponse[];
    nextCursor: number;
    hasNext: boolean;
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

interface SubjectScore {
    subject: Subject;
    regular1: number | null;
    regular2: number | null;
    midterm: number | null;
    final: number | null;
    average: number | null;
}

interface UserTableProps {
    users: UserProfileResponse[];
    onRowClick: (username: string) => void;
}

const ModifiedUserTable: React.FC<UserTableProps> = ({ users, onRowClick }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Student ID</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Full Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Username</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Email</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Date of Birth</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr
                            key={user.userId}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => onRowClick(user.username)}
                        >
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{user.userId}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{user.fullName}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{user.username}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{user.email}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                {new Date(user.dob).toLocaleDateString("vi-VN")}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function ScoreManagement() {
    const [students, setStudents] = useState<UserProfileResponse[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<UserProfileResponse[]>([]);
    const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([]);
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [scores, setScores] = useState<SubjectScore[]>([]);
    const [allScores, setAllScores] = useState<ScoreResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<UserProfileResponse | null>(null);
    const { isOpen, openModal, closeModal } = useModal();
    const { isOpen: isPreviewOpen, openModal: openPreviewModal, closeModal: closePreviewModal } = useModal();
    const pageSize = 15;

    // Alert management
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
            const queryParams = new URLSearchParams({
                classroomId: "-999",
                cursor: "0",
                page: "0",
                size: pageSize.toString(),
            });
            const response = await api.get<ApiResponse<ClassroomResponse[]>>(
                `/score/get-classroom?${queryParams.toString()}`
            );
            const classroomsData = response.data.result || [];
            setClassrooms(classroomsData);
            const uniqueSubjects = Array.from(
                new Map(classroomsData.map((c) => [c.subject.id, c.subject])).values()
            );
            setSubjects(uniqueSubjects);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to load classrooms");
        } finally {
            setLoading(false);
        }
    };

    // Fetch students for a classroom
    const fetchStudents = async (classroomId: string) => {
        if (!classroomId) {
            setStudents([]);
            setFilteredStudents([]);
            return;
        }

        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                classroomId,
            });
            const response = await api.get<ApiResponse<UserProfileResponse[]>>(
                `/score/get-list-student?${queryParams.toString()}`
            );
            const studentsData = response.data.result || [];
            setStudents(studentsData);
            setFilteredStudents(studentsData);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch students");
            setStudents([]);
            setFilteredStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch scores for a student
    const fetchScores = async (studentUsername: string) => {
        try {
            const response = await api.get<ApiResponse<ScoreResponse[]>>(
                `/score/get-student-score?studentUsername=${encodeURIComponent(studentUsername)}`
            );
            const scoreItems = response.data.result || [];
            const uniqueClassroomIds = Array.from(new Set(scoreItems.map((s) => s.classroomId)));
            const subjectScores: SubjectScore[] = uniqueClassroomIds
                .map((classroomId) => {
                    const classroom = classrooms.find((c) => c.id === classroomId);
                    if (!classroom) return null;
                    const subject = classroom.subject;
                    const subjectScores = scoreItems.filter((s) => s.classroomId === classroomId);
                    const regularScores = subjectScores
                        .filter((s) => s.typeofscore === TYPEOFSCORE.REGULAR)
                        .sort((a, b) => a.scoreDetailId - b.scoreDetailId)
                        .slice(0, 2);
                    const midtermScore = subjectScores.find((s) => s.typeofscore === TYPEOFSCORE.MIDTERM)?.score || null;
                    const finalScore = subjectScores.find((s) => s.typeofscore === TYPEOFSCORE.FINAL)?.score || null;
                    const average =
                        regularScores[0]?.score != null &&
                            regularScores[1]?.score != null &&
                            midtermScore != null &&
                            finalScore != null
                            ? parseFloat((regularScores[0].score * 0.1 + regularScores[1].score * 0.1 + midtermScore * 0.3 + finalScore * 0.5).toFixed(2))
                            : null;
                    return {
                        subject,
                        regular1: regularScores[0]?.score || null,
                        regular2: regularScores[1]?.score || null,
                        midterm: midtermScore,
                        final: finalScore,
                        average,
                    };
                })
                .filter((s): s is SubjectScore => s !== null);
            setScores(subjectScores);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch scores");
        }
    };

    // Fetch all scores for a classroom
    const fetchAllScores = async (classroomId: string) => {
        try {
            setLoading(true);
            let cursor = 0;
            let all: ScoreResponse[] = [];
            while (true) {
                const queryParams = new URLSearchParams({
                    classroomId,
                    studentUsername: "",
                    cursor: cursor.toString(),
                    page: "0",
                    size: pageSize.toString(),
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

    // Handle classroom filter change
    const handleClassroomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const classroomId = e.target.value;
        setSelectedClassroomId(classroomId);
        setFilteredStudents([]);
        setScores([]);
        setAllScores([]);
        if (classroomId) {
            fetchStudents(classroomId);
            fetchAllScores(classroomId);
        } else {
            setStudents([]);
        }
    };

    // Handle fullName filter change
    const handleFilterFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFilteredStudents(
            students.filter((s) => s.fullName.toLowerCase().includes(value.toLowerCase()))
        );
    };

    // Handle row click to show scores
    const handleRowClick = (username: string) => {
        const student = students.find((s) => s.username === username);
        if (student && student.username) {
            setSelectedStudent(student);
            fetchScores(student.username);
            openModal();
        } else {
            addAlert("error", "Error", "Student username is undefined");
        }
    };

    // Handle export scores
    const handleExportScores = () => {
        if (!selectedClassroomId) {
            addAlert("error", "Error", "Please select a classroom first");
            return;
        }
        openPreviewModal();
    };

    // Generate PDF for all scores
    const generateAllScoresPDF = () => {
        if (!selectedClassroomId) return;

        const classroom = classrooms.find((c) => c.id === parseInt(selectedClassroomId));
        const doc = new jsPDF();

        // Set Times New Roman font with UTF-8 encoding
        doc.setFont("times", "normal");

        // Title
        doc.setFontSize(18);
        doc.text("Classroom Score Report", 14, 20);

        // Classroom Information
        doc.setFontSize(12);
        doc.text(`Classroom: ${(classroom?.name || "Unknown").normalize("NFC")}`, 14, 30);
        doc.text(`Subject: ${(classroom?.subject.name || "Unknown").normalize("NFC")}`, 14, 38);

        // Prepare data for table
        const scoreData = students
            .map((student) => {
                const studentScores = allScores.filter((s) => s.studentUsername === student.username);
                const regularScores = studentScores
                    .filter((s) => s.typeofscore === TYPEOFSCORE.REGULAR)
                    .sort((a, b) => a.scoreDetailId - b.scoreDetailId)
                    .slice(0, 2);
                const midtermScore = studentScores.find((s) => s.typeofscore === TYPEOFSCORE.MIDTERM)?.score || null;
                const finalScore = studentScores.find((s) => s.typeofscore === TYPEOFSCORE.FINAL)?.score || null;
                const average =
                    regularScores[0]?.score != null &&
                        regularScores[1]?.score != null &&
                        midtermScore != null &&
                        finalScore != null
                        ? parseFloat((regularScores[0].score * 0.1 + regularScores[1].score * 0.1 + midtermScore * 0.3 + finalScore * 0.5).toFixed(2))
                        : null;
                return {
                    studentId: student.userId,
                    fullName: student.fullName,
                    regular1: regularScores[0]?.score || null,
                    regular2: regularScores[1]?.score || null,
                    midterm: midtermScore,
                    final: finalScore,
                    average,
                };
            })
            .filter((data) => data.average !== null); // Only include students with complete scores

        // Score Table
        autoTable(doc, {
            startY: 50,
            head: [["Student ID", "Full Name", "Regular 1 (10%)", "Regular 2 (10%)", "Midterm (30%)", "Final (50%)", "Average"]],
            body: scoreData.length === 0
                ? [[{ content: "No scores available", colSpan: 7, styles: { halign: "center" } }]]
                : scoreData.map((data) => [
                    data.studentId.toString(),
                    data.fullName.normalize("NFC"),
                    data.regular1 !== null ? data.regular1.toString() : "-",
                    data.regular2 !== null ? data.regular2.toString() : "-",
                    data.midterm !== null ? data.midterm.toString() : "-",
                    data.final !== null ? data.final.toString() : "-",
                    data.average !== null ? data.average.toString() : "-",
                ]),
            styles: {
                font: "times",
                fontSize: 9,
                textColor: [0, 0, 0],
                cellPadding: 3,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                halign: "center",
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center",
                fontSize: 10,
            },
            columnStyles: {
                0: { cellWidth: 20 }, // Student ID
                1: { cellWidth: 40, halign: "left" }, // Full Name (wider, left-aligned)
                2: { cellWidth: 20 }, // Regular 1
                3: { cellWidth: 20 }, // Regular 2
                4: { cellWidth: 20 }, // Midterm
                5: { cellWidth: 20 }, // Final
                6: { cellWidth: 20 }, // Average
            },
            margin: { top: 50, left: 14, right: 14 },
            theme: "grid",
            didParseCell: (data) => {
                if (data.cell.text && data.cell.text.length > 0) {
                    data.cell.text = data.cell.text.map((text) => text.normalize("NFC"));
                }
            },
        });

        doc.save(`${(classroom?.name || "Classroom").replace(/[^a-zA-Z0-9]/g, "_")}_Scores.pdf`);
    };

    // Handle print PDF for individual student
    const handlePrintPDF = () => {
        if (!selectedStudent || !selectedClassroomId) return;

        const classroom = classrooms.find((c) => c.id === parseInt(selectedClassroomId));
        const doc = new jsPDF();

        doc.setFont("times", "normal");
        doc.setFontSize(18);
        doc.text("Student Score Report", 14, 20);
        doc.setFontSize(12);
        doc.text(`Full Name: ${selectedStudent.fullName.normalize("NFC")}`, 14, 30);
        doc.text(`Student ID: ${selectedStudent.userId}`, 14, 38);
        doc.text(`Username: ${selectedStudent.username}`, 14, 46);
        doc.text(`Email: ${selectedStudent.email}`, 14, 54);
        doc.text(`Date of Birth: ${new Date(selectedStudent.dob).toLocaleDateString("vi-VN")}`, 14, 62);
        doc.text(`Classroom: ${(classroom?.name || "Unknown").normalize("NFC")}`, 14, 70);

        autoTable(doc, {
            startY: 80,
            head: [["No.", "Subject", "Subject Code", "Regular 1 (10%)", "Regular 2 (10%)", "Midterm (30%)", "Final (50%)", "Average"]],
            body: scores.length === 0
                ? [[{ content: "No scores available", colSpan: 8, styles: { halign: "center" } }]]
                : scores.map((s, index) => [
                    index + 1,
                    s.subject.name.normalize("NFC"),
                    s.subject.id.toString(),
                    s.regular1 !== null ? s.regular1.toString() : "-",
                    s.regular2 !== null ? s.regular2.toString() : "-",
                    s.midterm !== null ? s.midterm.toString() : "-",
                    s.final !== null ? s.final.toString() : "-",
                    s.average !== null ? s.average.toString() : "-",
                ]),
            styles: {
                font: "times",
                fontSize: 9,
                textColor: [0, 0, 0],
                cellPadding: 3,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                halign: "center",
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center",
                fontSize: 10,
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 40, halign: "left" },
                2: { cellWidth: 15 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 20 },
            },
            margin: { top: 80, left: 14, right: 14 },
            theme: "grid",
            didParseCell: (data) => {
                if (data.cell.text && data.cell.text.length > 0) {
                    data.cell.text = data.cell.text.map((text) => text.normalize("NFC"));
                }
            },
        });

        doc.save(`${selectedStudent.fullName.replace(/[^a-zA-Z0-9]/g, "_")}_Scores.pdf`);
    };

    // Fetch classrooms on mount
    useEffect(() => {
        fetchClassrooms();
    }, []);

    return (
        <div className="relative">
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

            {/* Filters */}
            <div className="flex gap-4 mb-4 items-center">
                <div className="w-full max-w-xs">
                    <input
                        type="text"
                        placeholder="Filter by Full Name"
                        onChange={handleFilterFullNameChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                    />
                </div>
                <div className="w-full max-w-xs">
                    <select
                        value={selectedClassroomId}
                        onChange={handleClassroomChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                    >
                        <option value="">Select Classroom</option>
                        {classrooms.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <Button
                    size="sm"
                    onClick={handleExportScores}
                    className="ml-4 bg-blue-500 hover:bg-blue-600"
                    disabled={!selectedClassroomId}
                >
                    Export Scores
                </Button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : selectedClassroomId ? (
                filteredStudents.length === 0 ? (
                    <div className="text-center text-sm text-gray-800 dark:text-white">No students found</div>
                ) : (
                    <ModifiedUserTable users={filteredStudents} onRowClick={handleRowClick} />
                )
            ) : (
                <div className="text-center text-sm text-gray-800 dark:text-white">Please select a classroom</div>
            )}

            {/* Modal for individual student scores */}
            {isOpen && selectedStudent && (
                <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[800px] p-5 lg:p-10">
                    <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
                        Score Table
                    </h4>
                    <div className="mb-4">
                        <p>
                            <strong>Full Name:</strong> {selectedStudent.fullName}
                        </p>
                        <p>
                            <strong>Student ID:</strong> {selectedStudent.userId}
                        </p>
                        <p>
                            <strong>Username:</strong> {selectedStudent.username}
                        </p>
                        <p>
                            <strong>Email:</strong> {selectedStudent.email}
                        </p>
                        <p>
                            <strong>Date of Birth:</strong> {new Date(selectedStudent.dob).toLocaleDateString("vi-VN")}
                        </p>
                        <p>
                            <strong>Classroom:</strong>{" "}
                            {classrooms.find((c) => c.id === parseInt(selectedClassroomId))?.name || "Unknown"}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800">
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">No.</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Subject</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Subject Code</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Regular 1 (10%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Regular 2 (10%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Midterm (30%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Final (50%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Average</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scores.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white text-center">
                                            No scores available
                                        </td>
                                    </tr>
                                ) : (
                                    scores.map((score, index) => (
                                        <tr key={score.subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{index + 1}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{score.subject.name}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{score.subject.id}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{score.regular1 !== null ? score.regular1 : "-"}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{score.regular2 !== null ? score.regular2 : "-"}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{score.midterm !== null ? score.midterm : "-"}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{score.final !== null ? score.final : "-"}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                                {score.average !== null ? score.average : "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-end w-full gap-3 mt-8">
                        <Button size="sm" variant="outline" onClick={closeModal}>
                            Close
                        </Button>
                        <Button size="sm" onClick={handlePrintPDF} className="bg-green-500 hover:bg-green-600">
                            Print PDF
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Modal for previewing all scores */}
            {isPreviewOpen && selectedClassroomId && (
                <Modal isOpen={isPreviewOpen} onClose={closePreviewModal} className="max-w-[1000px] p-5 lg:p-10">
                    <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
                        Classroom Score Report Preview
                    </h4>
                    <div className="mb-4">
                        <p>
                            <strong>Classroom:</strong>{" "}
                            {classrooms.find((c) => c.id === parseInt(selectedClassroomId))?.name || "Unknown"}
                        </p>
                        <p>
                            <strong>Subject:</strong>{" "}
                            {classrooms.find((c) => c.id === parseInt(selectedClassroomId))?.subject.name || "Unknown"}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800">
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Student ID</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Full Name</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Regular 1 (10%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Regular 2 (10%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Midterm (30%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Final (50%)</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Average</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length === 0 || allScores.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white text-center">
                                            No scores available
                                        </td>
                                    </tr>
                                ) : (
                                    students
                                        .map((student) => {
                                            const studentScores = allScores.filter((s) => s.studentUsername === student.username);
                                            const regularScores = studentScores
                                                .filter((s) => s.typeofscore === TYPEOFSCORE.REGULAR)
                                                .sort((a, b) => a.scoreDetailId - b.scoreDetailId)
                                                .slice(0, 2);
                                            const midtermScore = studentScores.find((s) => s.typeofscore === TYPEOFSCORE.MIDTERM)?.score || null;
                                            const finalScore = studentScores.find((s) => s.typeofscore === TYPEOFSCORE.FINAL)?.score || null;
                                            const average =
                                                regularScores[0]?.score != null &&
                                                    regularScores[1]?.score != null &&
                                                    midtermScore != null &&
                                                    finalScore != null
                                                    ? parseFloat((regularScores[0].score * 0.1 + regularScores[1].score * 0.1 + midtermScore * 0.3 + finalScore * 0.5).toFixed(2))
                                                    : null;
                                            return {
                                                studentId: student.userId,
                                                fullName: student.fullName,
                                                regular1: regularScores[0]?.score || null,
                                                regular2: regularScores[1]?.score || null,
                                                midterm: midtermScore,
                                                final: finalScore,
                                                average,
                                            };
                                        })
                                        .filter((data) => data.average !== null)
                                        .map((data, index) => (
                                            <tr key={data.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.studentId}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.fullName}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.regular1 !== null ? data.regular1 : "-"}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.regular2 !== null ? data.regular2 : "-"}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.midterm !== null ? data.midterm : "-"}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.final !== null ? data.final : "-"}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{data.average !== null ? data.average : "-"}</td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-end w-full gap-3 mt-8">
                        <Button size="sm" variant="outline" onClick={closePreviewModal}>
                            Close
                        </Button>
                        <Button size="sm" onClick={generateAllScoresPDF} className="bg-green-500 hover:bg-green-600">
                            Print PDF
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}