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
    classroomId: string;
    addAlert: (type: "success" | "error", title: string, message: string) => void;
}

const ScoreTable: React.FC<ScoreTableProps> = ({ filteredScores, handleSave, confirmDelete }) => {
    const [editingScoreId, setEditingScoreId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<ScoreCreateRequest>>({});
    const [sortColumn, setSortColumn] = useState<keyof ScoreResponse | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const scoreTypes = ["REGULAR", "MIDTERM", "FINAL"];

    // Handle sorting
    const handleSort = (column: keyof ScoreResponse) => {
        const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
        setSortColumn(column);
        setSortDirection(newDirection);
        const sorted = sortData(filteredScores, column, newDirection);
        handleSaveSort(sorted);
    };

    // Sort data function
    const sortData = (data: ScoreResponse[], column: keyof ScoreResponse | null, direction: "asc" | "desc") => {
        if (!column) return data;
        return [...data].sort((a, b) => {
            const valueA = a[column];
            const valueB = b[column];
            if (typeof valueA === "number" && typeof valueB === "number") {
                return direction === "asc" ? valueA - valueB : valueB - valueA;
            }
            const strA = String(valueA).toLowerCase();
            const strB = String(valueB).toLowerCase();
            return direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strB);
        });
    };

    // Placeholder for saving sorted data
    const handleSaveSort = (sortedData: ScoreResponse[]) => {
        // No-op for now, as sorting is local
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
                                Điểm {sortColumn === "score" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px] cursor-pointer"
                                onClick={() => handleSort("studentId")}
                            >
                                Mã học sinh {sortColumn === "studentId" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px] cursor-pointer"
                                onClick={() => handleSort("typeofscore")}
                            >
                                Loại điểm {sortColumn === "typeofscore" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px]">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredScores.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white text-center">
                                    Không tìm thấy điểm nào
                                </td>
                            </tr>
                        ) : (
                            filteredScores.map((score) => (
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
                                        {editingScoreId === score.scoreDetailId ? (
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
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(score.scoreDetailId)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    Xóa
                                                </button>
                                            </>
                                        )}
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

const ScoreModal: React.FC<ScoreModalProps> = ({ isOpen, onClose, classroomId, addAlert }) => {
    const [scores, setScores] = useState<ScoreResponse[]>([]);
    const [filteredScores, setFilteredScores] = useState<ScoreResponse[]>([]);
    const [cursor, setCursor] = useState<number>(0);
    const [hasNext, setHasNext] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [filterStudentId, setFilterStudentId] = useState<number | string>("");
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
        [classroomId]
    );

    // Fetch scores with optional studentId filter
    const fetchScores = async (newCursor: number, studentId: number = -999) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                cursor: newCursor.toString(),
                page: "0",
                size: pageSize.toString(),
                classroomId,
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
                setFilteredScores(items);
                setCursor(nextCursor);
                setHasNext(hasNext);
            } else {
                setScores([]);
                setFilteredScores([]);
                setHasNext(false);
                addAlert("error", "Lỗi", "Dữ liệu điểm không hợp lệ từ server");
            }
        } catch (err) {
            setScores([]);
            setFilteredScores([]);
            setHasNext(false);
            addAlert("error", "Lỗi", err instanceof Error ? err.message : "Không thể tải danh sách điểm");
        } finally {
            setLoading(false);
        }
    };

    // Handle student ID filter
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFilterStudentId(value);
        const studentId = value.trim() === "" ? -999 : parseInt(value);
        if (!isNaN(studentId)) {
            debouncedFetchScores(0, studentId);
        }
    };

    // Load scores when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchScores(0, filterStudentId === "" ? -999 : parseInt(String(filterStudentId)));
        }
    }, [isOpen, classroomId]);

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
            classroomId,
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
            addAlert("error", "Lỗi", "Dữ liệu form không tồn tại");
            return;
        }

        const form = e.currentTarget;
        if (!form.checkValidity() || isNaN(formData.studentId) || formData.studentId <= 0) {
            form.reportValidity();
            addAlert("error", "Lỗi", "Vui lòng điền đầy đủ các trường bắt buộc và mã học sinh hợp lệ");
            return;
        }

        try {
            const response = await api.post<ApiResponse<ScoreResponse>>("/score/create", formData);
            if (response.data.code !== 0) {
                addAlert("error", "Lỗi", response.data.message || "Không thể tạo điểm");
                return;
            }
            setScores([...scores, { ...response.data.result, scoreDetailId: Math.max(...scores.map((s) => s.scoreDetailId), 0) + 1 }]);
            setFilteredScores([...scores, { ...response.data.result, scoreDetailId: Math.max(...scores.map((s) => s.scoreDetailId), 0) + 1 }]);
            addAlert("success", "Thành công", "Tạo điểm thành công");
            closeFormModal();
            const studentId = filterStudentId === "" ? -999 : parseInt(String(filterStudentId));
            if (!isNaN(studentId)) {
                fetchScores(cursor, studentId);
            }
        } catch (err) {
            addAlert("error", "Lỗi", err instanceof Error ? err.message : "Không thể lưu điểm");
        }
    };

    // Handle save edited score
    const handleSave = async (scoreDetailId: number, updatedData: Partial<ScoreCreateRequest>) => {
        try {
            await api.put(`/score/update`, { ...updatedData, scoreDetailId });
            setScores(
                scores.map((s) =>
                    s.scoreDetailId === scoreDetailId ? { ...s, ...updatedData } : s
                )
            );
            setFilteredScores(
                filteredScores.map((s) =>
                    s.scoreDetailId === scoreDetailId ? { ...s, ...updatedData } : s
                )
            );
            addAlert("success", "Thành công", "Cập nhật điểm thành công");
            const studentId = filterStudentId === "" ? -999 : parseInt(String(filterStudentId));
            if (!isNaN(studentId)) {
                fetchScores(cursor, studentId);
            }
        } catch (err) {
            addAlert("error", "Lỗi", err instanceof Error ? err.message : "Không thể lưu điểm");
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
                addAlert("error", "Lỗi", "Không thể xóa điểm");
                return;
            }
            setScores(scores.filter((s) => s.scoreDetailId !== confirmDeleteScoreId));
            setFilteredScores(filteredScores.filter((s) => s.scoreDetailId !== confirmDeleteScoreId));
            setConfirmDeleteScoreId(null);
            addAlert("success", "Thành công", "Xóa điểm thành công");
            const studentId = filterStudentId === "" ? -999 : parseInt(String(filterStudentId));
            if (!isNaN(studentId)) {
                fetchScores(cursor, studentId);
            }
        } catch (err) {
            addAlert("error", "Lỗi", err instanceof Error ? err.message : "Không thể xóa điểm");
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
                    Classroom: {classroomId}
                </h4>
            </div>
            <div className="flex justify-end mb-4">
                <Button
                    size="sm"
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                    Tạo điểm mới
                </Button>
            </div>
            <div className="mb-4">
                <input
                    type="number"
                    placeholder="Lọc theo mã học sinh"
                    value={filterStudentId}
                    onChange={handleFilterChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                />
            </div>
            {loading ? (
                <div>Đang tải...</div>
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
            {confirmDeleteScoreId !== null && (
                <FloatingAlert
                    type="warning"
                    title="Xác nhận xóa"
                    message={
                        <>
                            Bạn có chắc chắn muốn xóa điểm này? Hành động này không thể hoàn tác.
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
                        Tạo điểm mới
                    </h4>
                    <form onSubmit={handleSaveNew}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Điểm</label>
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mã học sinh</label>
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Loại điểm</label>
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
                                Hủy
                            </Button>
                            <Button type="submit" size="sm">
                                Lưu
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
    const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
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
                setClassrooms([]);
                setHasNext(false);
                addAlert("error", "Lỗi", "Dữ liệu lớp học không hợp lệ từ server");
            }
        } catch (err) {
            setClassrooms([]);
            setHasNext(false);
            addAlert("error", "Lỗi", err instanceof Error ? err.message : "Không thể tải danh sách lớp học");
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
    const handleSelectClassroom = (classroomId: string) => {
        setSelectedClassroomId(classroomId);
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
                    placeholder="Lọc theo mã lớp học"
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
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Mã lớp học</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Số lượng học sinh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classrooms.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white text-center">
                                            Không tìm thấy lớp học nào
                                        </td>
                                    </tr>
                                ) : (
                                    classrooms.map((classroom) => (
                                        <tr
                                            key={classroom.classroomId}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => handleSelectClassroom(classroom.classroomId)}
                                        >
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.classroomId}</td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.total}</td>
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
            {selectedClassroomId && (
                <ScoreModal
                    isOpen={isOpen}
                    onClose={closeModal}
                    classroomId={selectedClassroomId}
                    addAlert={addAlert}
                />
            )}
        </div>
    );
}