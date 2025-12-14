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

interface Teacher {
    fullName: string;
}

interface ClassroomResponse {
    id: number;
    name: string;
    meetLink: string;
    isPublic: boolean;
    classCode: string;
    postNum?: number;
    studentNum?: number;
    isDeleted?: boolean;
    teacherUsername: string;
    teacherName?: string;
    subjectId: number;
    subjectName: string;
    createdAt: string;
}

interface ClassroomCreateRequest {
    name: string;
    subjectId: number;
    meetLink: string;
    isPublic: boolean;
    teacherUsername: string;
}

interface ClassroomUpdateRequest {
    name: string;
    meetLink: string;
    isPublic: boolean;
}

interface ApiResponse<T> {
    result: T;
    message?: string;
    code: number;
}

interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

interface Alert {
    id: string;
    type: "success" | "error";
    title: string;
    message: string;
}

interface ClassroomTableProps {
    classrooms: ClassroomResponse[];
    handleEdit: (id: number) => void;
    confirmDelete: (id: number) => void;
}

const ClassroomTable: React.FC<ClassroomTableProps> = ({ classrooms, handleEdit, confirmDelete }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Subject</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Meet Link</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Public</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Teacher Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Class Code</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Created At</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {classrooms.map((classroom) => (
                        <tr key={classroom.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.name}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.subjectName}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                <a href={classroom.meetLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    Link
                                </a>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.isPublic ? "Yes" : "No"}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.teacherName || classroom.teacherUsername}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">{classroom.classCode}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                {new Date(classroom.createdAt).toLocaleDateString()}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-800 dark:text-white">
                                <button
                                    onClick={() => handleEdit(classroom.id)}
                                    className="mr-2 text-blue-500 hover:text-blue-700"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => confirmDelete(classroom.id)}
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

export default function ClassroomManagement() {
    const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([]);
    const [filteredClassrooms, setFilteredClassrooms] = useState<ClassroomResponse[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState<ClassroomResponse | null>(null);
    const [formData, setFormData] = useState<ClassroomCreateRequest | null>(null);
    const [filterTeacherName, setFilterTeacherName] = useState<string>("");
    const [filterClassroomName, setFilterClassroomName] = useState<string>("");
    const [searchClassroomName, setSearchClassroomName] = useState<string>("");
    const { isOpen, openModal, closeModal } = useModal();
    const [confirmDeleteClassroomId, setConfirmDeleteClassroomId] = useState<number | null>(null);

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
            const response = await api.get<ApiResponse<Page<Subject>>>("/classrooms/subjects", {
                params: {
                    page: 0,
                    size: 1000 // Adjust size as needed to fetch all subjects
                }
            });
            setSubjects(response.data.result.content || []);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch subjects");
        }
    };

    // Fetch classrooms
    const fetchClassrooms = async () => {
        try {
            setLoading(true);
            const response = await api.get<ApiResponse<ClassroomResponse[]>>("/classrooms/");
            const classroomsData = response.data.result || [];
            setClassrooms(classroomsData);
            setFilteredClassrooms(classroomsData);
            const teacherProfiles = Array.from(
                new Map(
                    classroomsData
                        .filter((c) => c.teacherName)
                        .map((c) => [c.teacherName, { fullName: c.teacherName! }])
                ).values()
            );
            setTeachers(teacherProfiles);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch classrooms");
            setClassrooms([]);
            setFilteredClassrooms([]);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters
    useEffect(() => {
        let filtered = classrooms;
        if (filterTeacherName) {
            filtered = filtered.filter((c) => c.teacherName === filterTeacherName);
        }
        if (filterClassroomName) {
            filtered = filtered.filter((c) => c.name === filterClassroomName);
        }
        if (searchClassroomName) {
            filtered = filtered.filter((c) =>
                c.name.toLowerCase().includes(searchClassroomName.toLowerCase())
            );
        }
        setFilteredClassrooms(filtered);
    }, [classrooms, filterTeacherName, filterClassroomName, searchClassroomName]);

    // Load subjects and classrooms on mount
    useEffect(() => {
        fetchSubjects();
        fetchClassrooms();
    }, []);

    // Handle edit classroom
    const handleEdit = (id: number) => {
        const classroom = classrooms.find((c) => c.id === id);
        if (classroom) {
            setSelectedClassroom(classroom);
            setFormData({
                name: classroom.name,
                subjectId: classroom.subjectId,
                meetLink: classroom.meetLink,
                isPublic: classroom.isPublic,
                teacherUsername: classroom.teacherUsername,
            });
            openModal();
        }
    };

    // Handle create classroom
    const handleCreate = () => {
        setSelectedClassroom(null);
        setFormData({
            name: "",
            subjectId: 0,
            meetLink: "",
            isPublic: false,
            teacherUsername: "",
        });
        openModal();
    };

    // Handle form input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => {
            if (!prev) return prev;
            if (name === "subjectId") {
                return { ...prev, subjectId: parseInt(value) || 0 };
            }
            return { ...prev, [name]: type === "checkbox" ? checked : value };
        });
    };

    // Handle filter changes
    const handleFilterTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterTeacherName(e.target.value);
    };

    const handleFilterClassroomNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterClassroomName(e.target.value);
    };

    const handleSearchClassroomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchClassroomName(e.target.value);
    };

    // Handle form submission
    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData) {
            addAlert("error", "Error", "Form data is missing");
            return;
        }

        const form = e.currentTarget;
        if (!form.checkValidity() || formData.subjectId === 0) {
            form.reportValidity();
            addAlert("error", "Error", "Please fill in all required fields, including a valid subject");
            return;
        }

        try {
            if (selectedClassroom) {
                // Update classroom (only send updatable fields)
                const updateData: ClassroomUpdateRequest = {
                    name: formData.name,
                    meetLink: formData.meetLink,
                    isPublic: formData.isPublic,
                };
                await api.put(`/classrooms/${selectedClassroom.id}`, updateData);
                setClassrooms(
                    classrooms.map((c) =>
                        c.id === selectedClassroom.id ? { ...c, ...updateData } : c
                    )
                );
                addAlert("success", "Success", "Classroom updated successfully");
            } else {
                // Create classroom
                const response = await api.post<ApiResponse<ClassroomResponse>>("/classrooms/create", formData);
                if (response.status !== 200) {
                    addAlert("error", "Error", response.data.message || "Failed to create classroom");
                    return;
                }
                const newClassroom = response.data.result;
                setClassrooms([...classrooms, newClassroom]);
                addAlert("success", "Success", "Classroom created successfully");
            }
            closeModal();
            // Re-apply filters
            let filtered = classrooms;
            if (filterTeacherName) {
                filtered = filtered.filter((c) => c.teacherName === filterTeacherName);
            }
            if (filterClassroomName) {
                filtered = filtered.filter((c) => c.name === filterClassroomName);
            }
            if (searchClassroomName) {
                filtered = filtered.filter((c) =>
                    c.name.toLowerCase().includes(searchClassroomName.toLowerCase())
                );
            }
            setFilteredClassrooms(filtered);
            // Update teachers list, only include valid teacherName
            const teacherProfiles = Array.from(
                new Map(
                    classrooms
                        .filter((c) => c.teacherName)
                        .map((c) => [c.teacherName, { fullName: c.teacherName! }])
                ).values()
            );
            setTeachers(teacherProfiles);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to save classroom");
        }
    };

    // Confirm delete
    const confirmDelete = (id: number) => {
        setConfirmDeleteClassroomId(id);
    };

    // Handle confirm delete
    const handleConfirmDelete = async () => {
        if (confirmDeleteClassroomId === null) return;

        try {
            const response = await api.delete(`/classrooms/${confirmDeleteClassroomId}`);
            if (response.data.code !== 0) {
                addAlert("error", "Error", "Failed to delete classroom");
                return;
            }
            setClassrooms(classrooms.filter((c) => c.id !== confirmDeleteClassroomId));
            setFilteredClassrooms(filteredClassrooms.filter((c) => c.id !== confirmDeleteClassroomId));
            setConfirmDeleteClassroomId(null);
            addAlert("success", "Success", "Classroom deleted successfully");
            // Update teachers list, only include valid teacherName
            const teacherProfiles = Array.from(
                new Map(
                    classrooms
                        .filter((c) => c.teacherName)
                        .map((c) => [c.teacherName, { fullName: c.teacherName! }])
                ).values()
            );
            setTeachers(teacherProfiles);
        } catch (err) {
            addAlert("error", "Error", err instanceof Error ? err.message : "Failed to delete classroom");
        }
    };

    // Handle cancel delete
    const handleCancelDelete = () => {
        setConfirmDeleteClassroomId(null);
    };

    // Get unique classroom names for combobox
    const uniqueClassroomNames = Array.from(new Set(classrooms.map((c) => c.name)));

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

            {/* Filters and Create Button */}
            <div className="flex gap-4 mb-4 items-center">
                <select
                    value={filterTeacherName}
                    onChange={handleFilterTeacherChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                >
                    <option value="">All Teachers</option>
                    {teachers.map((teacher) => (
                        <option key={teacher.fullName} value={teacher.fullName}>
                            {teacher.fullName}
                        </option>
                    ))}
                </select>
                <select
                    value={filterClassroomName}
                    onChange={handleFilterClassroomNameChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                >
                    <option value="">All Classrooms</option>
                    {uniqueClassroomNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Search by Classroom Name"
                    value={searchClassroomName}
                    onChange={handleSearchClassroomNameChange}
                    className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
                />
                <Button
                    size="sm"
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                    Create Classroom
                </Button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <ClassroomTable
                        classrooms={filteredClassrooms}
                        handleEdit={handleEdit}
                        confirmDelete={confirmDelete}
                    />
                    {filteredClassrooms.length === 0 && (
                        <div className="text-center text-sm text-gray-800 dark:text-white mt-4">
                            No classrooms found
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Alert */}
            {confirmDeleteClassroomId !== null && (
                <FloatingAlert
                    type="warning"
                    title="Confirm Delete"
                    message={
                        <>
                            Are you sure you want to delete this classroom? This action cannot be undone.
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
                        {selectedClassroom ? "Edit Classroom" : "Create Classroom"}
                    </h4>
                    <form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Classroom Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                            <select
                                name="subjectId"
                                value={formData.subjectId}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                                disabled={!!selectedClassroom}
                            >
                                <option value="0" disabled>Select a subject</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meet Link</label>
                            <input
                                type="url"
                                name="meetLink"
                                value={formData.meetLink}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    name="isPublic"
                                    checked={formData.isPublic}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                Public Classroom
                            </label>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teacher Username</label>
                            <input
                                type="text"
                                name="teacherUsername"
                                value={formData.teacherUsername}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                                required
                                disabled={!!selectedClassroom}
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