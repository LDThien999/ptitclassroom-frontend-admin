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