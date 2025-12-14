"use client";
import Image from "next/image";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";

interface UserProfileResponse {
    id: string;
    userId: number;
    username: string;
    fullName: string;
    email: string;
    dob: string;
    avatar?: string;
}

interface UserTableProps {
    users: UserProfileResponse[];
    handleEdit: (userId: number) => void;
    confirmDelete: (userId: number) => void;
    handleNextPage: () => void;
    handlePrevPage: () => void;
    page: number;
    hasNext: boolean;
}

export default function UserTable({
    users,
    handleEdit,
    confirmDelete,
    handleNextPage,
    handlePrevPage,
    page,
    hasNext,
}: UserTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-0">
            <div className="max-w-full overflow-x-auto">
                <div className="min-w-[1000px]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Student Information
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Username
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Email
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Date of Birth
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Edit
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Delete
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {users.map((user) => (
                                <TableRow key={user.userId}>
                                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 overflow-hidden rounded-full">
                                                <Image
                                                    width={40}
                                                    height={40}
                                                    src={user.avatar || "/default-avatar.png"}
                                                    alt={user.fullName}
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div>
                                                <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                    {user.fullName}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        {user.username}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        {user.email}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        {new Date(user.dob).toLocaleDateString("en-GB")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-start">
                                        <Button
                                            size="sm"
                                            onClick={() => handleEdit(user.userId)}
                                            className="px-3 py-1 rounded-md text-sm font-medium !text-green-500 bg-gray-100 hover:bg-green-600 hover:!text-white transition-colors"
                                        >
                                            Edit
                                        </Button>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-start">
                                        <Button
                                            size="sm"
                                            onClick={() => confirmDelete(user.userId)}
                                            className="px-3 py-1 rounded-md text-sm font-medium !text-red-600 bg-gray-100 hover:bg-red-600 hover:!text-white transition-colors"
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 dark:border-white/[0.05]">
                <Button
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={page === 0}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
            ${page === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                >
                    Previous
                </Button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page + 1}
                </span>
                <Button
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNext}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
            ${!hasNext ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}