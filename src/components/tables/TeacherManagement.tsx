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

interface UserResponse {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  dob: string;
  avatar?: string;
  roles?: string;
}

interface UserPagingResponse<T> {
  items: T[];
  cursor: number;
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

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<UserProfileResponse[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [page, setPage] = useState<number>(0);
  const [cursor, setCursor] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [selectedTeacher, setSelectedTeacher] = useState<UserProfileResponse | null>(null);
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

  // Fetch teachers
  const fetchTeachers = async (cursor: number, page: number) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        cursor: cursor.toString(),
        page: page.toString(),
        size: pageSize.toString(),
        role: "TEACHER", // Filter for teachers
      });

      const response = await api.get<ApiResponse<UserPagingResponse<UserResponse>>>(
        `/identity/users/get-list-users?${queryParams.toString()}`
      );

      const result = response.data.result;
      // Map UserResponse to UserProfileResponse
      const mappedTeachers: UserProfileResponse[] = result.items
        .filter((user) => user.roles?.includes("TEACHER")) // Client-side filter as fallback
        .map((user) => ({
          id: user.userId.toString(), // Synthetic id
          userId: user.userId,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          dob: user.dob,
          avatar: user.avatar,
        }));

      setTeachers(mappedTeachers);
      setFilteredTeachers(mappedTeachers);
      setHasNext(result.hasNext);
      setCursor(result.cursor || cursor);
      setPage(page);
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to fetch teachers");
      setTeachers([]);
      setFilteredTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle username filter change
  const handleFilterUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterUsername(value);
    setFilteredTeachers(
      teachers.filter((t) => t.username.toLowerCase().includes(value.toLowerCase()))
    );
  };

  // Handle search button click
  const handleSearch = () => {
    setFilteredTeachers(
      teachers.filter((t) => t.username.toLowerCase().includes(filterUsername.toLowerCase()))
    );
  };

  // Handle edit teacher
  const handleEdit = (userId: number) => {
    const teacher = teachers.find((t) => t.userId === userId);
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({ ...teacher, dob: new Date(teacher.dob).toISOString().split("T")[0] });
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
    if (!formData || !selectedTeacher) return;

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    try {
      // Update teacher
      const updateRequest = {
        id: formData.id,
        userId: formData.userId,
        username: selectedTeacher.username, // Use original username
        fullName: formData.fullName,
        email: formData.email,
        dob: formData.dob,
        avatar: formData.avatar,
      };
      await api.post("/profile/users/update", updateRequest);
      setTeachers(teachers.map((t) => (t.userId === formData.userId ? formData : t)));
      setFilteredTeachers(filteredTeachers.map((t) => (t.userId === formData.userId ? formData : t)));
      addAlert("success", "Success", "Teacher updated successfully");
      closeModal();
      handleSearch(); // Refresh filtered list
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to save teacher");
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
        addAlert("error", "Error", "Failed to delete teacher");
        return;
      }
      setTeachers(teachers.filter((t) => t.userId !== confirmDeleteUserId));
      setFilteredTeachers(filteredTeachers.filter((t) => t.userId !== confirmDeleteUserId));
      setConfirmDeleteUserId(null);
      addAlert("success", "Success", "Teacher deleted successfully");
      handleSearch(); // Refresh filtered list
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to delete teacher");
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setConfirmDeleteUserId(null);
  };

  // Fetch teachers on mount
  useEffect(() => {
    fetchTeachers(0, 0);
  }, []);

  // Handle pagination
  const handleNextPage = () => {
    if (hasNext) {
      setPage((prev) => prev + 1);
      setCursor((prev) => prev + pageSize);
      fetchTeachers(cursor + pageSize, page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage((prev) => prev - 1);
      setCursor((prev) => Math.max(prev - pageSize, 0));
      fetchTeachers(Math.max(cursor - pageSize, 0), page - 1);
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

      {/* Username Filter and Search Button */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by Username"
          value={filterUsername}
          onChange={handleFilterUsernameChange}
          className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm text-gray-800 dark:text-white dark:bg-gray-700"
        />
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
      ) : filteredTeachers.length === 0 ? (
        <div className="text-center text-sm text-gray-800 dark:text-white">No teachers found</div>
      ) : (
        <UserTable
          users={filteredTeachers}
          handleEdit={handleEdit}
          confirmDelete={confirmDelete}
          handleNextPage={handleNextPage}
          handlePrevPage={handlePrevPage}
          page={page}
          hasNext={hasNext}
        />
      )}

      {/* Delete Confirmation Alert */}
      {confirmDeleteUserId !== null && (
        <FloatingAlert
          type="warning"
          title="Confirm Delete"
          message={
            <>
              Are you sure you want to delete this teacher? This action cannot be undone.
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

      {isOpen && formData && selectedTeacher && (
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[600px] p-5 lg:p-10"
        >
          <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
            Edit Teacher
          </h4>
          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar Preview</label>
              <div className="mt-1 flex justify-center">
                {formData.avatar ? (
                  <Image
                    src={formData.avatar}
                    alt="Teacher Avatar"
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
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
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