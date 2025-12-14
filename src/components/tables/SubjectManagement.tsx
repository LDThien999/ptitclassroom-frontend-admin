"use client";
import { useEffect, useState, FormEvent } from "react";
import api from "../../lib/interceptor";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import FloatingAlert from "../ui/alert/FloatingAlert";
import { useModal } from "@/hooks/useModal";
import Cookies from "js-cookie";

interface Subject {
    id: number;
    name: string;
}

interface SubjectCreateRequest {
    name: string;
}

interface SubjectUpdateRequest {
    name: string;
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

interface SubjectTableProps {
    subjects: Subject[];
    handleEdit: (id: number) => void;
    confirmDelete: (id: number) => void;
}

const SubjectTable: React.FC<SubjectTableProps> = ({ subjects, handleEdit, confirmDelete }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">ID</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((subject) => (
                        <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{subject.id}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{subject.name}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                <button
                                    onClick={() => handleEdit(subject.id)}
                                    className="mr-2 text-blue-500 hover:text-blue-700"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => confirmDelete(subject.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function SubjectManagement() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState<SubjectCreateRequest | null>(null);
    const [searchSubjectName, setSearchSubjectName] = useState<string>("");
    const { isOpen, openModal, closeModal } = useModal();
    const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<number | null>(null);

    // Alert management
    const addAlert = (type: "success" | "error", title: string, message: string) => {
        const id = Math.random().toString(36).substring(2);
        setAlerts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => removeAlert(id), 5000);
    };

    const removeAlert = (id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    };

    // Fetch subjects
    const fetchSubjects = async () => {
        try {
            setLoading(true);
            console.log("token", Cookies.get("token"));
            const response = await api.get<ApiResponse<Subject[]>>("/classrooms/subjects");
            const subjectsData = response.data.result || [];
            console.log("Subjects Data:", subjectsData);
            setSubjects(subjectsData);
            setFilteredSubjects(subjectsData);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch subjects");
            setSubjects([]);
            setFilteredSubjects([]);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters
    useEffect(() => {
        let filtered = subjects;
        if (searchSubjectName) {
            filtered = filtered.filter((s) =>
                s.name.toLowerCase().includes(searchSubjectName.toLowerCase())
            );
        }
        setFilteredSubjects(filtered);
    }, [subjects, searchSubjectName]);

    // Load subjects on mount
    useEffect(() => {
        fetchSubjects();
    }, []);

    // Handle edit subject
    const handleEdit = (id: number) => {
        const subject = subjects.find((s) => s.id === id);
        if (subject) {
            setSelectedSubject(subject);
            setFormData({ name: subject.name });
            openModal();
        }
    };

    // Handle create subject
    const handleCreate = () => {
        setSelectedSubject(null);
        setFormData({ name: "" });
        openModal();
    };

    // Handle form input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => (prev ? { ...prev, [name]: value } : { name: value }));
    };

    // Handle search input change
    const handleSearchSubjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchSubjectName(e.target.value);
    };

    // Handle form submission
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
            if (selectedSubject) {
                // Update subject
                await api.put(`/classrooms/subjects/${selectedSubject.id}`, formData);
                setSubjects(
                    subjects.map((s) =>
                        s.id === selectedSubject.id ? { ...s, ...formData } : s
                    )
                );
                addAlert("success", "Success", "Subject updated successfully");
            } else {
                // Create subject
                const response = await api.post<ApiResponse<Subject>>("/classrooms/subjects/create", formData);
                if (response.status !== 200) {
                    addAlert("error", "Error", response.data.message || "Failed to create subject");
                    return;
                }
                setSubjects([...subjects, { ...response.data.result, id: Math.max(...subjects.map((s) => s.id), 0) + 1 }]);
                addAlert("success", "Success", "Subject created successfully");
            }
            closeModal();
            // Re-apply filters
            let filtered = subjects;
            if (searchSubjectName) {
                filtered = filtered.filter((s) =>
                    s.name.toLowerCase().includes(searchSubjectName.toLowerCase())
                );
            }
            setFilteredSubjects(filtered);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to save subject");
        }
    };

    // Confirm delete
    const confirmDelete = (id: number) => {
        setConfirmDeleteSubjectId(id);
    };

    // Handle confirm delete
    const handleConfirmDelete = async () => {
        if (confirmDeleteSubjectId === null) return;

        try {
            const response = await api.delete(`/classrooms/subjects/${confirmDeleteSubjectId}`);
            if (response.data.code !== 0) {
                addAlert("error", "Error", response.data.message || "Failed to delete subject");
                return;
            }
            setSubjects(subjects.filter((s) => s.id !== confirmDeleteSubjectId));
            setFilteredSubjects(filteredSubjects.filter((s) => s.id !== confirmDeleteSubjectId));
            setConfirmDeleteSubjectId(null);
            addAlert("success", "Success", "Subject deleted successfully");
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to delete subject");
        }
    };

    // Handle cancel delete
    const handleCancelDelete = () => {
        setConfirmDeleteSubjectId(null);
    };

    return (
        <div className="relative">
            {/* Success and Error Alerts */}
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

            {/* Search and Create Button */}
            <div className="flex gap-4 mb-4 items-center">
                <input
                    type="text"
                    placeholder="Search by Subject Name"
                    value={searchSubjectName}
                    onChange={handleSearchSubjectNameChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                />
                <Button
                    size="sm"
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                    Create Subject
                </Button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <SubjectTable
                        subjects={filteredSubjects}
                        handleEdit={handleEdit}
                        confirmDelete={confirmDelete}
                    />
                    {filteredSubjects.length === 0 && (
                        <div className="text-center text-sm text-gray-800 dark:text-white mt-4">
                            No subjects found
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Alert */}
            {confirmDeleteSubjectId !== null && (
                <FloatingAlert
                    type="warning"
                    title="Confirm Delete"
                    message={
                        <>
                            Are you sure you want to delete this subject? This action cannot be undone.
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

            {isOpen && formData && (
                <Modal
                    isOpen={isOpen}
                    onClose={closeModal}
                    className="max-w-[600px] p-5 lg:p-10"
                >
                    <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
                        {selectedSubject ? "Edit Subject" : "Create Subject"}
                    </h4>
                    <form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="flex items-center justify-end w-full gap-3 mt-8">
                            <Button type="button" size="sm" variant="outline" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm">
                                Save
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}