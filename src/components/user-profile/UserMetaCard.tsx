"use client";
import React, { useEffect, useState, useRef } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Image from "next/image";
import api from "../../lib/interceptor";

interface UserProfileResponse {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  dob: string;
  avatar?: string;
  role: string;
}

interface UpdateUserRequest {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  dob: string;
  roles: string;
}

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [formData, setFormData] = useState<UpdateUserRequest | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user info when component mounts
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ result: UserProfileResponse }>("/identity/users/myInfo");
        const userData = response.data.result;
        console.log("Fetched user data:", userData);
        setUser(userData);
        // Initialize formData with user data, converting dob to YYYY-MM-DD
        setFormData({
          userId: userData.userId,
          username: userData.username,
          fullName: userData.fullName,
          email: userData.email,
          dob: userData.dob && !isNaN(new Date(userData.dob).getTime())
            ? new Date(userData.dob).toISOString().split("T")[0]
            : "",
          roles: userData.role,
        });
        setAvatarPreview(userData.avatar || "/images/user/default.jpg");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user info");
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name}=${value}`); // Debug log
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };

  // Handle avatar file change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      console.log("Selected avatar file:", file.name); // Debug log
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    console.log("Triggering file input"); // Debug log
    fileInputRef.current?.click();
  };

  // Handle form submission
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData) {
      console.error("Form data is null");
      return;
    }

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    try {
      // Prepare update request
      let avatarUrl = user?.avatar;
      if (avatarFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", avatarFile);
        const uploadResponse = await api.post<{ result: { url: string } }>("/upload/avatar", formDataUpload);
        avatarUrl = uploadResponse.data.result.url;
      }

      const updateData: UpdateUserRequest = {
        ...formData,
        // Keep other fields unchanged
      };

      console.log("Submitting update request:", updateData); // Debug log
      await api.post("/profile/users/update", updateData);
      // Update user state with new data
      setUser({
        ...user!,
        username: formData.username,
        avatar: avatarUrl,
      });
      console.log("Updated user:", { ...updateData, avatar: avatarUrl });
      setAvatarFile(null);
      setAvatarPreview(avatarUrl || "/images/user/default.jpg");
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // Debug log when modal closes
  const handleCloseModal = () => {
    console.log("Closing modal, isOpen:", isOpen); // Debug log
    closeModal();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user data found</div>;

  // Split fullName into firstName and lastName (assuming space-separated)
  const [firstName, ...lastNameParts] = user.fullName.split(" ");
  const lastName = lastNameParts.join(" ");

  // Debug log to check formData before rendering modal
  console.log("Rendering with formData:", formData, "isOpen:", isOpen);

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-32 h-32 overflow-hidden border border-gray-200 rounded-md dark:border-gray-800">
              <Image
                width={128}
                height={128}
                src={user.avatar || "/images/user/default.jpg"}
                alt="user"
                className="object-cover"
              />
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {user.fullName}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.username}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openModal}
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Edit
          </button>
        </div>
      </div>
      {formData && (
        <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] m-4">
          <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
            <div className="px-2 pr-14">
              <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                Edit Personal Information
              </h4>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                Update your username and avatar.
              </p>
            </div>
            <form onSubmit={handleSave} className="flex flex-col">
              <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
                <div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                    <div className="col-span-1 lg:col-span-2">
                      <Label>Avatar</Label>
                      <div className="mt-2">
                        {avatarPreview && (
                          <Image
                            width={280}
                            height={280}
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="rounded-md object-cover"
                          />
                        )}
                        <Button
                          type="button" // Prevent form submission
                          size="sm"
                          variant="outline"
                          onClick={triggerFileInput}
                          className="mt-2 w-full lg:w-auto"
                        >
                          Choose Avatar
                        </Button>
                        <input
                          type="file"
                          name="avatar"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <Label>Username</Label>
                      <Input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button type="button" size="sm" variant="outline" onClick={handleCloseModal}>
                  Close
                </Button>
                <Button type="submit" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}