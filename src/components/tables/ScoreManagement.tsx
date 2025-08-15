"use client";
import { useEffect, useState, FormEvent, useCallback } from "react";
import api from "../../lib/interceptor";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import FloatingAlert from "../ui/alert/FloatingAlert";
import { useModal } from "@/hooks/useModal";
import Cookies from "js-cookie";
import debounce from "lodash/debounce";

interface Classroom {
    classroomId: string;
    total: number;
    subjectId: number;
    subjectName: string;
}

interface ClassroomPagingResponse {
    items: Classroom[];
    nextCursor: number;
    hasNext: boolean;
}

interface ScoreResponse {
    scoreDetailId: number;
    score: number;
    studentId: number;
    classroomId: string;
    typeofscore: string;
}

interface ScorePagingResponse {
    items: ScoreResponse[];
    nextCursor: number;
    hasNext: boolean;
}

interface ScoreCreateRequest {
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

interface Alert {
    id: string;
    type: "success" | "error";
    title: string;
    message: string;
}

interface ScoreTableProps {
    filteredScores: ScoreResponse[];
    handleSave: (scoreDetailId: number, updatedData: Partial<ScoreCreateRequest>) => Promise<void>;
    confirmDelete: (id: number) => void;
}

interface ScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    classroom: Classroom;
    addAlert: (type: "success" | "error", title: string, message: string) => void;
}

const ScoreTable: React.FC<ScoreTableProps> = ({ filteredScores, handleSave, confirmDelete }) => {
    const [editingScoreId, setEditingScoreId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<ScoreCreateRequest>>({});
    const [sortColumn, setSortColumn] = useState<keyof ScoreResponse | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [sortedScores, setSortedScores] = useState<ScoreResponse[]>(filteredScores);
    const scoreTypes = ["REGULAR", "MIDTERM", "FINAL"];

    useEffect(() => {
        setSortedScores(filteredScores);
    }, [filteredScores]);

    // Handle sorting
    const handleSort = (column: keyof ScoreResponse) => {
        const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
        setSortColumn(column);
        setSortDirection(newDirection);
        const sorted = sortData(filteredScores, column, newDirection);
        setSortedScores(sorted);
    };

    // Sort data function
    const sortData = (data: ScoreResponse[], column: keyof ScoreResponse, direction: "asc" | "desc") => {
        return [...data].sort((a, b) => {
            const valueA = a[column];
            const valueB = b[column];
            if (typeof valueA === "number" && typeof valueB === "number") {
                return direction === "asc" ? valueA - valueB : valueB - valueA;
            }
            const strA = String(valueA).toLowerCase();
            const strB = String(valueB).toLowerCase();
            return direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });
    };

    // Start editing a score
    const handleEditStart = (score: ScoreResponse) => {
        setEditingScoreId(score.scoreDetailId);
        setEditFormData({
            score: score.score,
            typeofscore: score.typeofscore,
        });
    };

    // Handle input changes during editing
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditFormData((prev) => ({
            ...prev,
            [name]: name === "score" ? parseFloat(value) : name === "studentId" ? parseInt(value) : value,
        }));
    };

    // Save edited score
    const handleEditSave = async (scoreDetailId: number) => {
        if (editFormData.score === undefined || editFormData.typeofscore === undefined) {
            return;
        }
        await handleSave(scoreDetailId, editFormData);
        setEditingScoreId(null);
        setEditFormData({});
    };

    // Cancel editing
    const handleEditCancel = () => {
        setEditingScoreId(null);
        setEditFormData({});
    };

    return (
        <div className="overflow-x-auto">
            <div className="relative">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
                        <tr>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[150px] cursor-pointer"
                                onClick={() => handleSort("score")}
                            >
                                Score {sortColumn === "score" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px] cursor-pointer"
                                onClick={() => handleSort("studentId")}
                            >
                                Student ID {sortColumn === "studentId" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px] cursor-pointer"
                                onClick={() => handleSort("typeofscore")}
                            >
                                Type Of Score {sortColumn === "typeofscore" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px]">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedScores.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white text-center">
                                    Can not find any scores!
                                </td>
                            </tr>
                        ) : (
                            sortedScores.map((score) => (
                                <tr key={score.scoreDetailId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        {editingScoreId === score.scoreDetailId ? (
                                            <input
                                                type="number"
                                                name="score"
                                                value={editFormData.score ?? score.score}
                                                onChange={handleEditChange}
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                className="w-20 rounded-md border border-gray-300 dark:border-gray-600 p-1 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                                required
                                            />
                                        ) : (
                                            score.score
                                        )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">{score.studentId}</td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        {editingScoreId === score.scoreDetailId ? (
                                            <select
                                                name="typeofscore"
                                                value={editFormData.typeofscore ?? score.typeofscore}
                                                onChange={handleEditChange}
                                                className="w-32 rounded-md border border-gray-300 dark:border-gray-600 p-1 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                                required
                                            >
                                                {scoreTypes.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            score.typeofscore
                                        )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        {score.typeofscore !== "AVERAGE" ? (
                                            editingScoreId === score.scoreDetailId ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEditSave(score.scoreDetailId)}
                                                        className="mr-2 text-green-500 hover:text-green-700"
                                                    >
                                                        Lưu
                                                    </button>
                                                    <button
                                                        onClick={handleEditCancel}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        Hủy
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditStart(score)}
                                                        className="mr-2 text-blue-500 hover:text-blue-700"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(score.scoreDetailId)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )
                                        ) : null}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ScoreModal: React.FC<ScoreModalProps> = ({ isOpen, onClose, classroom, addAlert }) => {
    const [scores, setScores] = useState<ScoreResponse[]>([]);
    const [filteredScores, setFilteredScores] = useState<ScoreResponse[]>([]);
    const [cursor, setCursor] = useState<number>(0);
    const [hasNext, setHasNext] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [filterStudentId, setFilterStudentId] = useState<number | string>("");
    const [filterScoreType, setFilterScoreType] = useState<string>("ALL");
    const [formData, setFormData] = useState<ScoreCreateRequest | null>(null);
    const [confirmDeleteScoreId, setConfirmDeleteScoreId] = useState<number | null>(null);
    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const pageSize = 20;
    const scoreTypes = ["REGULAR", "MIDTERM", "FINAL"];

    // Debounced fetchScores function
    const debouncedFetchScores = useCallback(
        debounce((newCursor: number, studentId: number) => {
            fetchScores(newCursor, studentId);
        }, 300),
        [classroom.classroomId]
    );

    // Cancel debounce on unmount
    useEffect(() => {
        return () => {
            debouncedFetchScores.cancel();
        };
    }, [debouncedFetchScores]);

    // Fetch scores with optional studentId filter
    const fetchScores = async (newCursor: number, studentId: number = -999) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                cursor: newCursor.toString(),
                page: "0",
                size: pageSize.toString(),
                classroomId: classroom.classroomId,
            });
            if (studentId !== -999) {
                queryParams.append("studentId", studentId.toString());
            }
            const response = await api.get<ApiResponse<ScorePagingResponse>>(
                `/score/get-list-score?${queryParams.toString()}`
            );
            const { items, nextCursor, hasNext } = response.data.result || { items: [], nextCursor: 0, hasNext: false };
            if (Array.isArray(items)) {
                setScores(items);
                setCursor(nextCursor);
                setHasNext(hasNext);
            } else {
                console.error("Invalid data format from server:", response.data);
                setScores([]);
                setHasNext(false);
                addAlert("error", "Error", "Data is not valid from server");
            }
        } catch (err) {
            console.error("Error fetching scores:", err);
            setScores([]);
            setHasNext(false);
            addAlert("error", "Error", err instanceof Error ? err.message : "Can not get list scores");
        } finally {
            setLoading(false);
        }
    };

    // Calculate averages
    const calculateAverages = (): ScoreResponse[] => {
        const studentScores = new Map<number, { regular: number[]; midterm: number[]; final: number[] }>();
        scores.forEach((score) => {
            if (!studentScores.has(score.studentId)) {
                studentScores.set(score.studentId, { regular: [], midterm: [], final: [] });
            }
            const group = studentScores.get(score.studentId)!;
            if (score.typeofscore === "REGULAR") group.regular.push(score.score);
            else if (score.typeofscore === "MIDTERM") group.midterm.push(score.score);
            else if (score.typeofscore === "FINAL") group.final.push(score.score);
        });

        const averages: ScoreResponse[] = [];
        let fakeId = -1;
        studentScores.forEach((groups, studentId) => {
            const avgReg = groups.regular.length > 0 ? groups.regular.reduce((a, b) => a + b, 0) / groups.regular.length : 0;
            const avgMid = groups.midterm.length > 0 ? groups.midterm.reduce((a, b) => a + b, 0) / groups.midterm.length : 0;
            const avgFin = groups.final.length > 0 ? groups.final.reduce((a, b) => a + b, 0) / groups.final.length : 0;
            const avg = avgReg * 0.1 + avgMid * 0.3 + avgFin * 0.6;
            if (avg > 0) {
                averages.push({
                    scoreDetailId: fakeId--,
                    score: Number(avg.toFixed(2)),
                    studentId,
                    classroomId: classroom.classroomId,
                    typeofscore: "AVERAGE",
                });
            }
        });
        return averages;
    };

    // Update filtered scores based on filters
    useEffect(() => {
        let temp = scores;
        if (filterScoreType === "AVERAGE") {
            const averages = calculateAverages();
            setFilteredScores(averages);
        } else {
            if (filterScoreType !== "ALL") {
                temp = temp.filter((s) => s.typeofscore === filterScoreType);
            }
            setFilteredScores(temp);
        }
    }, [scores, filterScoreType]);

    // Handle student ID filter
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFilterStudentId(value);
        const studentId = value.trim() === "" ? -999 : parseInt(value);
        if (!isNaN(studentId)) {
            debouncedFetchScores(0, studentId);
        }
    };

    // Handle score type filter
    const handleScoreTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterScoreType(e.target.value);
    };

    // Load scores when modal opens
    useEffect(() => {
        if (isOpen) {
            const studentId = filterStudentId === "" ? -999 : parseInt(String(filterStudentId));
            if (!isNaN(studentId)) {
                fetchScores(0, studentId);
            }
        }
    }, [isOpen, classroom.classroomId]);

    // Handle pagination
    const handleNextPage = () => {
        if (hasNext) {
            const studentId = filterStudentId === "" ? -999 : parseInt(String(filterStudentId));
            if (!isNaN(studentId)) {
                fetchScores(cursor, studentId);
            }
        }
    };

    const handlePrevPage = () => {
        if (cursor > 0) {
            const studentId = filterStudentId === "" ? -999 : parseInt(String(filterStudentId));
            if (!isNaN(studentId)) {
                fetchScores(cursor - pageSize, studentId);
            }
        }
    };

    // Handle create new score
    const handleCreate = () => {
        setFormData({
            score: 0,
            studentId: 0,
            classroomId: classroom.classroomId,
            typeofscore: "REGULAR",
        });
        openFormModal();
    };

    // Handle input changes for create form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [name]: name === "score" ? parseFloat(value) : name === "studentId" ? parseInt(value) : value,
            };
        });
    };

    // Handle save new score
    const handleSaveNew = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData) {
            addAlert("error", "Error", "Dữ liệu form không tồn tại");
            return;
        }

        const form = e.currentTarget;
        if (!form.checkValidity() || isNaN(formData.studentId) || formData.studentId <= 0) {
            form.reportValidity();
            addAlert("error", "Error", "Please fill in all required fields correctly");
            return;
        }

        try {
            const response = await api.post<ApiResponse<ScoreResponse>>("/score/create", formData);
            if (response.data.code !== 0) {
                addAlert("error", "Error", response.data.message || "Can not create score");
                return;
            }
            addAlert("success", "Thành công", "Create score successfully");
            closeFormModal();
            setFilterStudentId(""); // Reset filter
            setFilterScoreType("ALL"); // Reset filter
            fetchScores(0, -999); // Reload all scores
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Can not create score");
        }
    };

    // Handle save edited score
    const handleSave = async (scoreDetailId: number, updatedData: Partial<ScoreCreateRequest>) => {
        try {
            const response = await api.put(`/score/update`, { ...updatedData, scoreDetailId });
            if (response.data.code !== 0) {
                addAlert("error", "Error", response.data.message || "Can not update score");
                return;
            }
            setScores(
                scores.map((s) =>
                    s.scoreDetailId === scoreDetailId ? { ...s, ...updatedData } : s
                )
            );
            addAlert("success", "Success", "Update score successfully");
            setFilterStudentId(""); // Reset filter
            setFilterScoreType("ALL"); // Reset filter
            fetchScores(0, -999); // Reload all scores
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Can not update score");
        }
    };

    // Confirm delete
    const confirmDelete = (id: number) => {
        setConfirmDeleteScoreId(id);
    };

    // Handle delete
    const handleConfirmDelete = async () => {
        if (confirmDeleteScoreId === null) return;

        try {
            const response = await api.delete(`/score/delete?scoreDetailId=${confirmDeleteScoreId}`);
            if (response.data.code !== 0) {
                addAlert("error", "Error", "Could not delete score: " + response.data.message);
                return;
            }
            setScores(scores.filter((s) => s.scoreDetailId !== confirmDeleteScoreId));
            setConfirmDeleteScoreId(null);
            addAlert("success", "Success", "Delete score successfully");
            setFilterStudentId(""); // Reset filter
            setFilterScoreType("ALL"); // Reset filter
            fetchScores(0, -999); // Reload all scores
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Không thể xóa điểm");
        }
    };

    // Cancel delete
    const handleCancelDelete = () => {
        setConfirmDeleteScoreId(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-[80vw] max-w-[1200px] max-h-[90vh] p-5 overflow-y-auto"
        >
            <div className="top-0 bg-white dark:bg-gray-900 z-10 pb-4">
                <h4 className="font-semibold text-gray-800 text-title-sm dark:text-white/90">
                    ClassroomID: {classroom.classroomId} - Subject {classroom.subjectId}: {classroom.subjectName}
                </h4>
            </div>
            <div className="flex justify-end mb-4">
                <Button
                    size="sm"
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                    New Score Record
                </Button>
            </div>
            <div className="mb-4 flex gap-4">
                <input
                    type="number"
                    placeholder="Filter by Student ID"
                    value={filterStudentId}
                    onChange={handleFilterChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                />
                <select
                    value={filterScoreType}
                    onChange={handleScoreTypeFilterChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                >
                    <option value="ALL">All</option>
                    <option value="REGULAR">REGULAR</option>
                    <option value="MIDTERM">MIDTERM</option>
                    <option value="FINAL">FINAL</option>
                    <option value="AVERAGE">AVERAGE</option>
                </select>
            </div>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <ScoreTable
                        filteredScores={filteredScores}
                        handleSave={handleSave}
                        confirmDelete={confirmDelete}
                    />
                    <div className="flex justify-between mt-4">
                        <Button
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={cursor === 0}
                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 transition-colors disabled:bg-gray-300"
                        >
                            Previous Page
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleNextPage}
                            disabled={!hasNext}
                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                        >
                            Next Page
                        </Button>
                    </div>
                </>
            )}
            {confirmDeleteScoreId !== null && (
                <FloatingAlert
                    type="warning"
                    title="Xác nhận xóa"
                    message={
                        <>
                            Are you sure you want to delete this score? This action cannot be undone.
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={handleCancelDelete}
                                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded-md"
                                >
                                    Xóa
                                </button>
                            </div>
                        </>
                    }
                    onClose={handleCancelDelete}
                    duration={0}
                    position="center"
                    showOverlay={true}
                    onOverlayClick={handleCancelDelete}
                    overlayOpacity={0.5}
                />
            )}
            {isFormOpen && formData && (
                <Modal
                    isOpen={isFormOpen}
                    onClose={closeFormModal}
                    className="w-[95vw] max-w-[600px] p-5"
                >
                    <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
                        New Score Record
                    </h4>
                    <form onSubmit={handleSaveNew}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Score</label>
                            <input
                                type="number"
                                name="score"
                                value={formData.score}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.1"
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                            <input
                                type="number"
                                name="studentId"
                                value={formData.studentId}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type Of Score</label>
                            <select
                                name="typeofscore"
                                value={formData.typeofscore}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            >
                                {scoreTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-end w-full gap-3 mt-8">
                            <Button type="button" size="sm" variant="outline" onClick={closeFormModal}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm">
                                Save
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </Modal>
    );
};

export default function ScoreManagement() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [cursor, setCursor] = useState<number>(0);
    const [hasNext, setHasNext] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [filterClassroomId, setFilterClassroomId] = useState<string>("");
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
    const { isOpen, openModal, closeModal } = useModal();
    const pageSize = 15;

    // Manage alerts
    const addAlert = (type: "success" | "error", title: string, message: string) => {
        const id = Math.random().toString(36).substring(2);
        setAlerts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            removeAlert(id);
        }, 5000);
    };

    const removeAlert = (id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    };

    // Debounced fetchClassrooms function
    const debouncedFetchClassrooms = useCallback(
        debounce((newCursor: number, classroomId: string) => {
            fetchClassrooms(newCursor, classroomId);
        }, 300),
        []
    );

    // Cancel debounce on unmount
    useEffect(() => {
        return () => {
            debouncedFetchClassrooms.cancel();
        };
    }, [debouncedFetchClassrooms]);

    // Fetch classrooms with pagination and optional classroomId filter
    const fetchClassrooms = async (newCursor: number, classroomId: string = "") => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                cursor: newCursor.toString(),
                page: "0",
                size: pageSize.toString(),
                classroomId,
            });
            const response = await api.get<ApiResponse<Classroom[]>>(
                `/score/get-classroom?${queryParams.toString()}`
            );
            const classroomsData = response.data.result || [];
            if (Array.isArray(classroomsData)) {
                setClassrooms(classroomsData);
                setCursor(newCursor + pageSize);
                setHasNext(classroomsData.length === pageSize);
            } else {
                console.error("Invalid classroom data format:", response.data);
                setClassrooms([]);
                setHasNext(false);
                addAlert("error", "Error", "Dữ liệu lớp học không hợp lệ từ server");
            }
        } catch (err) {
            console.error("Error fetching classrooms:", err);
            setClassrooms([]);
            setHasNext(false);
            addAlert("error", "Error", err instanceof Error ? err.message : "Không thể tải danh sách lớp học");
        } finally {
            setLoading(false);
        }
    };

    // Handle classroom ID filter
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFilterClassroomId(value);
        debouncedFetchClassrooms(0, value.trim());
    };

    // Load classrooms on mount
    useEffect(() => {
        fetchClassrooms(0, filterClassroomId);
    }, []);

    // Handle pagination
    const handleNextPage = () => {
        if (hasNext) {
            fetchClassrooms(cursor, filterClassroomId);
        }
    };

    const handlePrevPage = () => {
        if (cursor > 0) {
            fetchClassrooms(cursor - pageSize, filterClassroomId);
        }
    };

    // Handle classroom selection
    const handleSelectClassroom = (classroom: Classroom) => {
        setSelectedClassroom(classroom);
        openModal();
    };

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

            {/* Classroom filter */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Filter by Classroom ID"
                    value={filterClassroomId}
                    onChange={handleFilterChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                />
            </div>

            {/* Classrooms table */}
            {loading ? (
                <div>Đang tải...</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800">
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Classroom ID</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Number Of Members</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Subject ID</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Subject Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classrooms.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white text-center">
                                            Không tìm thấy lớp học nào
                                        </td>
                                    </tr>
                                ) : (
                                    classrooms.map((classroom) => (
                                        <tr
                                            key={classroom.classroomId}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => handleSelectClassroom(classroom)}
                                        >
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.classroomId}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.total}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.subjectId}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.subjectName}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination controls */}
                    <div className="flex justify-between mt-4">
                        <Button
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={cursor === 0}
                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 transition-colors disabled:bg-gray-300"
                        >
                            Trang trước
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleNextPage}
                            disabled={!hasNext}
                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                        >
                            Trang sau
                        </Button>
                    </div>
                </>
            )}

            {/* Score modal */}
            {selectedClassroom && (
                <ScoreModal
                    isOpen={isOpen}
                    onClose={closeModal}
                    classroom={selectedClassroom}
                    addAlert={addAlert}
                />
            )}
        </div>
    );
}