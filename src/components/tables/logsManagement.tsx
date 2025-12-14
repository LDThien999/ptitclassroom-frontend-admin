'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from "../../lib/interceptor";

interface AuditLog {
    id: number;
    username: string;
    role: string;
    action: string;
    description: string;
    createdAt: string; // ISO String from LocalDateTime
}

// Spring Boot Page<T> structure
interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export default function AuditLogsPage() {
    // 2. State Management
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);

    // Config
    const pageSize = 10;

    // 3. API Call Function
    const fetchLogs = useCallback(async (pageIndex: number) => {
        setLoading(true);
        try {
            const response = await api.get<PageResponse<AuditLog>>('/logs/', {
                params: {
                    page: pageIndex,
                    size: pageSize,
                    sort: 'createdAt,desc' // Sort by newest first
                }
            });

            const data = response.data;
            setLogs(data.content);
            setTotalPages(data.totalPages);
            setPage(data.number);
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial Load & Page Change Effect
    useEffect(() => {
        fetchLogs(page);
    }, [page, fetchLogs]);

    // Helper: Format Date
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 4. Render
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">System Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">View-only access to system activities</p>
                </div>
                <button
                    onClick={() => fetchLogs(page)}
                    className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm transition flex items-center gap-2"
                >
                    Refresh
                </button>
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
                <table className="min-w-full leading-normal">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                                    Loading logs...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                                    No audit logs found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                                    <td className="px-5 py-4 text-sm text-center text-gray-500">
                                        {log.id}
                                    </td>
                                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                        {log.username}
                                    </td>
                                    <td className="px-5 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.role === 'ADMIN'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}>
                                            {log.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-blue-600 font-medium">
                                        {log.action}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.description}>
                                        {log.description}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {formatDate(log.createdAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Section */}
            {!loading && totalPages > 0 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                        Page <span className="font-semibold text-gray-900">{page + 1}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className={`px-3 py-1.5 border rounded text-sm font-medium transition ${page === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            className={`px-3 py-1.5 border rounded text-sm font-medium transition ${page >= totalPages - 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}