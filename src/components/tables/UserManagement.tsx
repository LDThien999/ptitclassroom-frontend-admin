"use client";
import { useEffect, useState, FormEvent } from "react";
import api from "../../lib/interceptor";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import FloatingAlert from "../ui/alert/FloatingAlert";
import { useModal } from "@/hooks/useModal";
import UserTable from "./users/UserTable";
import Cookies from "js-cookie";

export interface UserResponse {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  dob: string;
  roles: string;
  avatar?: string;
  password?: string;
}

interface ApiResponse {
  result: {
    items: UserResponse[];
    cursor: number;
    hasNext: boolean;
  };
}

interface Alert {
  id: string;
  type: "success" | "error";
  title: string;
  message: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState<UserResponse | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);

  // alert management
  const addAlert = (type: "success" | "error", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2);
    setAlerts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const fetchUsers = async (cursor: number, page: number) => {
    try {
      setLoading(true);
      console.log("token", Cookies.get("token"));
      const response = await api.get<ApiResponse>("/identity/users/get-list-users", {
        params: { cursor, page },
      });

      setUsers(response.data.result.items || []);
      setHasNext(response.data.result.hasNext || false);
      setCursor(response.data.result.cursor || cursor);
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userId: number) => {
    const user = users.find((u) => u.userId === userId);
    if (user) {
      setSelectedUser(user);
      setFormData({ ...user, dob: new Date(user.dob).toISOString().split("T")[0], password: "" });
      openModal();
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setFormData({
      userId: 0,
      username: "",
      fullName: "",
      email: "",
      dob: "",
      roles: "STUDENT",
      password: "",
      avatar: undefined,
    });
    openModal();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData) return;

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    try {
      if (selectedUser) {
        // Update user: Prepare request body matching UpdateUserRequest
        const updateRequest = {
          userId: formData.userId,
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          dob: formData.dob, // Already in YYYY-MM-DD format
          roles: formData.roles,
        };
        await api.post("/profile/users/update", updateRequest);
        setUsers(users.map((u) => (u.userId === formData.userId ? { ...formData, password: undefined } : u)));
        addAlert("success", "Success", "User updated successfully");
      } else {
        // Create user
        const response = await api.post("/profile/users/create", formData);
        if (response.status !== 200) {
          addAlert("error", "Error", response.data.result || "Failed to create user");
          return;
        }
        setUsers([...users, { ...response.data, userId: Math.max(...users.map((u) => u.userId), 0) + 1 }]);
        addAlert("success", "Success", "User created successfully");
      }
      console.log(`${selectedUser ? "Updated" : "Created"} user:`, formData);
      closeModal();
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to save user");
    }
  };

  const confirmDelete = (userId: number) => {
    setConfirmDeleteUserId(userId);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteUserId === null) return;

    try {
      console.log("Confirm delete user:", confirmDeleteUserId);
      const response = await api.post(`/identity/users/delete/${confirmDeleteUserId}`);
      if (response.data.code !== 200) {
        addAlert("error", "Error", "Failed to delete user");
        return;
      }
      setUsers(users.filter((u) => u.userId !== confirmDeleteUserId));
      setConfirmDeleteUserId(null);
      addAlert("success", "Success", "User deleted successfully");
    } catch (err) {
      addAlert("error", "Error", err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteUserId(null);
  };

  useEffect(() => {
    fetchUsers(cursor, page);
  }, [cursor, page]);

  const handleNextPage = () => {
    if (hasNext) {
      setPage((prev) => prev + 1);
      setCursor((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage((prev) => prev - 1);
      setCursor((prev) => prev - 1);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (users.length === 0 && !alerts.length) return <div>No users found</div>;

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

      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={handleCreate}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          Create User
        </Button>
      </div>

      <UserTable
        users={users}
        handleEdit={handleEdit}
        confirmDelete={confirmDelete}
        handleNextPage={handleNextPage}
        handlePrevPage={handlePrevPage}
        page={page}
        hasNext={hasNext}
      />

      {/* Delete Confirmation Alert */}
      {confirmDeleteUserId !== null && (
        <FloatingAlert
          type="warning"
          title="Confirm Delete"
          message={
            <>
              Are you sure you want to delete this user? This action cannot be undone.
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
            {selectedUser ? "Edit User" : "Create User"}
          </h4>
          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                required
              />
            </div>
            {!selectedUser && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                  required
                />
              </div>
            )}
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <select
                name="roles"
                value={formData.roles}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white dark:bg-gray-700"
                required
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Admin</option>
              </select>
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