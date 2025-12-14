"use client";
import { useEffect, useState, FormEvent } from "react";
import api from "../../lib/interceptor";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import FloatingAlert from "../ui/alert/FloatingAlert";
import { useModal } from "@/hooks/useModal";
import UserTable from "./users/UserTable";
import Image from "next/image";

interface UserProfileResponse {
  id: string;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  dob: string;
  avatar?: string;
}

interface ClassroomResponse {
  id: number;
  name: string;
  subject: any;
  meetLink: string;
  isPublic: boolean;
  teacherUsername: string;
  classCode: string;
  createdAt: string;
}

interface PageResponse<T> {
  content: T[];
  number: number;
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
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

export default function StudentManagement() {
  const [students, setStudents] = useState<UserProfileResponse[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<UserProfileResponse[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<UserProfileResponse | null>(null);
  const [formData, setFormData] = useState<UserProfileResponse | null>(null);
  const [filterUsername, setFilterUsername] = useState<string>("");
  const { isOpen, openModal, closeModal } = useModal();
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);
  const pageSize = 20;

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
      const response = await api.get<ApiResponse<ClassroomResponse[]>>("/classrooms/");
      const classroomsData = response.data.result || [];
      setClassrooms(classroomsData);
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch students for a classroom
  const fetchStudents = async (classroomId: string, page: number) => {
    if (!classroomId) {
      setStudents([]);
      setFilteredStudents([]);
      setHasNext(false);
      setPage(0);
      return;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });

      const response = await api.get<ApiResponse<PageResponse<UserProfileResponse>>>(
        `/classrooms/${classroomId}/students-of-class?${queryParams.toString()}`
      );

      const result = response.data.result;
      setStudents(result.content || []);
      setFilteredStudents(result.content || []);
      setHasNext(!result.last);
      setPage(result.number || page);
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch students");
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle username filter change
  const handleFilterUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterUsername(value);
    setFilteredStudents(
      students.filter((s) =>
        s.username.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  // Handle classroom filter change
  const handleClassroomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassroomId(e.target.value);
    setPage(0);
    setFilterUsername("");
    setFilteredStudents([]);
    fetchStudents(e.target.value, 0);
  };

  // Handle search button click
  const handleSearch = () => {
    setFilteredStudents(
      students.filter((s) =>
        s.username.toLowerCase().includes(filterUsername.toLowerCase())
      )
    );
  };

  // Handle edit student
  const handleEdit = (userId: number) => {
    const student = students.find((s) => s.userId === userId);
    if (student) {
      setSelectedStudent(student);
      setFormData({ ...student, dob: new Date(student.dob).toISOString().split("T")[0] });
      openModal();
    }
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  // Handle save (update only)
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData || !selectedStudent) return;

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    try {
      // Update student
      const updateRequest = {
        id: formData.id,
        userId: formData.userId,
        username: selectedStudent.username, // Use original username
        fullName: formData.fullName,
        email: formData.email,
        dob: formData.dob,
        avatar: formData.avatar,
      };
      await api.post("/profile/users/update", updateRequest);
      setStudents(students.map((s) => (s.userId === formData.userId ? formData : s)));
      setFilteredStudents(filteredStudents.map((s) => (s.userId === formData.userId ? formData : s)));
      addAlert("success", "Success", "Student updated successfully");
      closeModal();
      handleSearch(); // Refresh filtered list
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to save student");
    }
  };

  // Confirm delete
  const confirmDelete = (userId: number) => {
    setConfirmDeleteUserId(userId);
  };

  // Handle delete
  const handleConfirmDelete = async () => {
    if (confirmDeleteUserId === null) return;

    try {
      const response = await api.post(`/identity/users/delete/${confirmDeleteUserId}`);
      if (response.data.code !== 200) {
        addAlert("error", "Error", "Failed to delete student");
        return;
      }
      setStudents(students.filter((s) => s.userId !== confirmDeleteUserId));
      setFilteredStudents(filteredStudents.filter((s) => s.userId !== confirmDeleteUserId));
      setConfirmDeleteUserId(null);
      addAlert("success", "Success", "Student deleted successfully");
      handleSearch(); // Refresh filtered list
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to delete student");
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setConfirmDeleteUserId(null);
  };

  // Fetch classrooms on mount
  useEffect(() => {
    fetchClassrooms();
  }, []);

  // Handle pagination
  const handleNextPage = () => {
    if (hasNext) {
      setPage((prev) => prev + 1);
      fetchStudents(selectedClassroomId, page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage((prev) => prev - 1);
      fetchStudents(selectedClassroomId, page - 1);
    }
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

      {/* Filters and Search Button */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by Username"
          value={filterUsername}
          onChange={handleFilterUsernameChange}
          className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
        />
        <select
          value={selectedClassroomId}
          onChange={handleClassroomChange}
          className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
        >
          <option value="">Select Classroom</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleSearch}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          Search
        </Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : selectedClassroomId ? (
        filteredStudents.length === 0 ? (
          <div className="text-center text-sm text-gray-800 dark:text-white">No students found</div>
        ) : (
          <UserTable
            users={filteredStudents}
            handleEdit={handleEdit}
            confirmDelete={confirmDelete}
            handleNextPage={handleNextPage}
            handlePrevPage={handlePrevPage}
            page={page}
            hasNext={hasNext}
          />
        )
      ) : (
        <div className="text-center text-sm text-gray-800 dark:text-white">Please select a classroom</div>
      )}

      {/* Delete Confirmation Alert */}
      {confirmDeleteUserId !== null && (
        <FloatingAlert
          type="warning"
          title="Confirm Delete"
          message={
            <>
              Are you sure you want to delete this student? This action cannot be undone.
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

      {isOpen && formData && selectedStudent && (
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[600px] p-5 lg:p-10"
        >
          <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
            Edit Student
          </h4>
          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar Preview</label>
              <div className="mt-1 flex justify-center">
                {formData.avatar ? (
                  <Image
                    src={formData.avatar}
                    alt="Student Avatar"
                    width={100}
                    height={100}
                    className="rounded-full object-cover"
                    onError={() => setFormData((prev) => (prev ? { ...prev, avatar: "" } : prev))}
                  />
                ) : (
                  <div className="w-[100px] h-[100px] rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar URL</label>
              <input
                type="text"
                name="avatar"
                value={formData.avatar || ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                placeholder="Enter avatar image URL"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                readOnly
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                required
              />
            </div>
            <div className="flex items-center justify-end w-full gap-3 mt-8">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Save
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}