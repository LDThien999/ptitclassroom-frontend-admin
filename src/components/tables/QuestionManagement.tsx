"use client";
import { useEffect, useState, FormEvent, useCallback } from "react";
import api from "../../lib/interceptor";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import FloatingAlert from "../ui/alert/FloatingAlert";
import { useModal } from "@/hooks/useModal";
import debounce from "lodash/debounce";

interface Subject {
    subjectId: number;
    subjectName: string;
    total: number;
}

interface Question {
    id: number;
    content: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    level: "EASY" | "MEDIUM" | "HARD";
    createdAt?: string;
    updatedAt?: string;
    username: string;
    subjectId: number;
}

interface SubjectPagingResponse {
    items: Subject[];
    nextCursor: number;
    hasNext: boolean;
}

interface QuestionPagingResponse {
    items: Question[];
    nextCursor: number;
    hasNext: boolean;
}

interface QuestionCreateRequest {
    content: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    level: "EASY" | "MEDIUM" | "HARD";
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

interface QuestionTableProps {
    filteredQuestions: Question[];
    handleSave: (questionId: number, updatedData: Partial<QuestionCreateRequest>) => Promise<void>;
    confirmDelete: (id: number) => void;
    openEditModal: (question: Question) => void;
}

interface QuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjectId: number;
    addAlert: (type: "success" | "error", title: string, message: string) => void;
}

const QuestionTable: React.FC<QuestionTableProps> = ({ filteredQuestions, handleSave, confirmDelete, openEditModal }) => {
    const [sortColumn, setSortColumn] = useState<keyof Question | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [sortedQuestions, setSortedQuestions] = useState<Question[]>(filteredQuestions);

    useEffect(() => {
        setSortedQuestions(filteredQuestions);
    }, [filteredQuestions]);

    const handleSort = (column: keyof Question) => {
        const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
        setSortColumn(column);
        setSortDirection(newDirection);
        const sorted = sortData(filteredQuestions, column, newDirection);
        setSortedQuestions(sorted);
    };

    const sortData = (data: Question[], column: keyof Question, direction: "asc" | "desc") => {
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

    return (
        <div className="overflow-x-auto">
            <div className="relative">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
                        <tr>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[100px] cursor-pointer"
                                onClick={() => handleSort("id")}
                            >
                                ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[300px] cursor-pointer"
                                onClick={() => handleSort("content")}
                            >
                                Content {sortColumn === "content" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[150px] cursor-pointer"
                                onClick={() => handleSort("level")}
                            >
                                Difficulty {sortColumn === "level" && (sortDirection === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white w-[200px]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedQuestions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white text-center">
                                    No questions found
                                </td>
                            </tr>
                        ) : (
                            sortedQuestions.map((question) => (
                                <tr key={question.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        {question.id}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        {question.content}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        {question.level}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-800 dark:text-white">
                                        <button
                                            onClick={() => openEditModal(question)}
                                            className="mr-2 text-blue-500 hover:text-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(question.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Delete
                                        </button>
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

const QuestionModal: React.FC<QuestionModalProps> = ({ isOpen, onClose, subjectId, addAlert }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
    const [cursor, setCursor] = useState<number>(0);
    const [hasNext, setHasNext] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [formData, setFormData] = useState<QuestionCreateRequest | null>(null);
    const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
    const [confirmDeleteQuestionId, setConfirmDeleteQuestionId] = useState<number | null>(null);
    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const pageSize = 20;
    const levels = ["EASY", "MEDIUM", "HARD"];
    const currentUser = "admin";

    const fetchQuestions = async (newCursor: number) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                cursor: newCursor.toString(),
                page: "0",
                size: pageSize.toString(),
                subjectId: subjectId.toString(),
            });
            const response = await api.get<ApiResponse<QuestionPagingResponse>>(
                `/questions/get-list-question?${queryParams.toString()}`
            );
            const { items, nextCursor, hasNext } = response.data.result || { items: [], nextCursor: 0, hasNext: false };
            if (Array.isArray(items)) {
                setQuestions(items);
                setFilteredQuestions(items);
                setCursor(nextCursor);
                setHasNext(hasNext);
            } else {
                setQuestions([]);
                setFilteredQuestions([]);
                setHasNext(false);
                addAlert("error", "Error", "Invalid question data from server");
            }
        } catch (err) {
            setQuestions([]);
            setFilteredQuestions([]);
            setHasNext(false);
            addAlert("error", "Error", err instanceof Error ? err.message : "Unable to load question list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchQuestions(0);
        }
    }, [isOpen, subjectId]);

    const handleNextPage = () => {
        if (hasNext) {
            fetchQuestions(cursor);
        }
    };

    const handlePrevPage = () => {
        if (cursor > 0) {
            fetchQuestions(cursor - pageSize);
        }
    };

    const handleCreate = () => {
        setFormData({
            content: "",
            optionA: "",
            optionB: "",
            optionC: "",
            optionD: "",
            correctAnswer: "",
            explanation: "",
            level: "EASY",
            username: currentUser,
            subjectId,
        });
        setEditingQuestionId(null);
        openFormModal();
    };

    const handleEdit = (question: Question) => {
        setFormData({
            content: question.content,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            level: question.level,
            username: question.username,
            subjectId: question.subjectId,
        });
        setEditingQuestionId(question.id);
        openFormModal();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [name]: value,
            };
        });
    };

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData) {
            addAlert("error", "Error", "Form data is missing");
            return;
        }

        const form = e.currentTarget;
        if (!form.checkValidity()) {
            form.reportValidity();
            addAlert("error", "Error", "Please fill in all required fields");
            return;
        }

        try {
            if (editingQuestionId === null) {
                const response = await api.post<ApiResponse<Question>>("/questions/create", formData);
                if (response.data.code !== 0) {
                    addAlert("error", "Error", response.data.message || "Unable to create question");
                    return;
                }
                setQuestions([...questions, response.data.result]);
                setFilteredQuestions([...filteredQuestions, response.data.result]);
                addAlert("success", "Success", "Question created successfully");
            } else {
                const response = await api.put<ApiResponse<Question>>(`/questions/${editingQuestionId}`, formData);
                if (response.data.code !== 0) {
                    addAlert("error", "Error", response.data.message || "Unable to update question");
                    return;
                }
                setQuestions(
                    questions.map((q) =>
                        q.id === editingQuestionId ? { ...q, ...response.data.result } : q
                    )
                );
                setFilteredQuestions(
                    filteredQuestions.map((q) =>
                        q.id === editingQuestionId ? { ...q, ...response.data.result } : q
                    )
                );
                addAlert("success", "Success", "Question updated successfully");
            }
            closeFormModal();
            setFormData(null);
            fetchQuestions(0);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Unable to save question");
        }
    };

    const confirmDelete = (id: number) => {
        setConfirmDeleteQuestionId(id);
    };

    const handleConfirmDelete = async () => {
        if (confirmDeleteQuestionId === null) return;

        try {
            const response = await api.delete(`/questions/${confirmDeleteQuestionId}`);
            if (response.status !== 200) {
                addAlert("error", "Error", "Unable to delete question");
                return;
            }
            setQuestions(questions.filter((q) => q.id !== confirmDeleteQuestionId));
            setFilteredQuestions(filteredQuestions.filter((q) => q.id !== confirmDeleteQuestionId));
            setConfirmDeleteQuestionId(null);
            addAlert("success", "Success", "Question deleted successfully");
            fetchQuestions(0);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Unable to delete question");
        }
    };

    const handleCancelDelete = () => {
        setConfirmDeleteQuestionId(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-[80vw] max-w-[1200px] max-h-[90vh] p-5 overflow-y-auto"
        >
            <div className="top-0 bg-white dark:bg-gray-900 z-10 pb-4">
                <h4 className="font-semibold text-gray-800 text-title-sm dark:text-white/90">
                    Questions for Subject {subjectId}
                </h4>
            </div>
            <div className="flex justify-end mb-4">
                <Button
                    size="sm"
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                    Create New Question
                </Button>
            </div>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <QuestionTable
                        filteredQuestions={filteredQuestions}
                        handleSave={async (id, data) => {
                            await api.put(`/questions/${id}`, data);
                            fetchQuestions(0);
                        }}
                        confirmDelete={confirmDelete}
                        openEditModal={handleEdit}
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
            {confirmDeleteQuestionId !== null && (
                <FloatingAlert
                    type="warning"
                    title="Confirm Deletion"
                    message={
                        <>
                            Are you sure you want to delete this question? This action cannot be undone.
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={handleCancelDelete}
                                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded-md"
                                >
                                    Delete
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
                        {editingQuestionId ? "Edit Question" : "Create New Question"}
                    </h4>
                    <form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                            <textarea
                                name="content"
                                value={formData.content}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                                rows={4}
                            />
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Option A</label>
                                <input
                                    type="text"
                                    name="optionA"
                                    value={formData.optionA}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Option B</label>
                                <input
                                    type="text"
                                    name="optionB"
                                    value={formData.optionB}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Option C</label>
                                <input
                                    type="text"
                                    name="optionC"
                                    value={formData.optionC}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Option D</label>
                                <input
                                    type="text"
                                    name="optionD"
                                    value={formData.optionD}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Explanation</label>
                            <textarea
                                name="explanation"
                                value={formData.explanation}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                                rows={4}
                            />
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correct Answer</label>
                                <select
                                    name="correctAnswer"
                                    value={formData.correctAnswer}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                    required
                                >
                                    <option value="">Select Answer</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                                <select
                                    name="level"
                                    value={formData.level}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                    required
                                >
                                    {levels.map((level) => (
                                        <option key={level} value={level}>
                                            {level}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created By</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            />
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

export default function QuestionManagement() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [cursor, setCursor] = useState<number>(0);
    const [hasNext, setHasNext] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const { isOpen, openModal, closeModal } = useModal();
    const pageSize = 15;

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

    const debouncedFetchSubjects = useCallback(
        debounce((newCursor: number, subjectId: number | null) => {
            fetchSubjects(newCursor, subjectId);
        }, 300),
        []
    );

    const fetchSubjects = async (newCursor: number, subjectId: number | null = null) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                cursor: newCursor.toString(),
                page: "0",
                size: pageSize.toString(),
            });
            if (subjectId !== null) {
                queryParams.append("subjectId", subjectId.toString());
            }
            const response = await api.get<ApiResponse<Subject[]>>(
                `/questions/get-subjects?${queryParams.toString()}`
            );
            const subjectsData = response.data.result || [];
            if (Array.isArray(subjectsData)) {
                setSubjects(subjectsData);
                setCursor(newCursor + pageSize);
                setHasNext(subjectsData.length === pageSize);
            } else {
                setSubjects([]);
                setHasNext(false);
                addAlert("error", "Error", "Invalid subject data from server");
            }
        } catch (err) {
            setSubjects([]);
            setHasNext(false);
            addAlert("error", "Error", err instanceof Error ? err.message : "Unable to load subject list");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();
        const subjectId = value === "" ? null : parseInt(value);
        setFilterSubjectId(subjectId);
        debouncedFetchSubjects(0, subjectId);
    };

    useEffect(() => {
        fetchSubjects(0, filterSubjectId);
    }, []);

    const handleNextPage = () => {
        if (hasNext) {
            fetchSubjects(cursor, filterSubjectId);
        }
    };

    const handlePrevPage = () => {
        if (cursor > 0) {
            fetchSubjects(cursor - pageSize, filterSubjectId);
        }
    };

    const handleSelectSubject = (subjectId: number) => {
        setSelectedSubjectId(subjectId);
        openModal();
    };

    return (
        <div className="relative">
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

            <div className="mb-4">
                <input
                    type="number"
                    placeholder="Filter by Subject ID"
                    value={filterSubjectId ?? ""}
                    onChange={handleFilterChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                />
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800">
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">
                                        Subject ID
                                    </th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">
                                        Subject Name
                                    </th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">
                                        Number of Questions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white text-center">
                                            No subjects found
                                        </td>
                                    </tr>
                                ) : (
                                    subjects.map((subject) => (
                                        <tr
                                            key={subject.subjectId}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => handleSelectSubject(subject.subjectId)}
                                        >
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                                {subject.subjectId}
                                            </td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                                {subject.subjectName}
                                            </td>
                                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                                {subject.total}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

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

            {selectedSubjectId !== null && (
                <QuestionModal
                    isOpen={isOpen}
                    onClose={closeModal}
                    subjectId={selectedSubjectId}
                    addAlert={addAlert}
                />
            )}
        </div>
    );
}