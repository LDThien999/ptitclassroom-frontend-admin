import { JSX, useEffect } from "react";
import Alert from "./Alert";

interface FloatingAlertProps {
    type: "success" | "warning" | "error";
    title: string;
    message: string | JSX.Element;
    onClose: () => void;
    duration?: number;
    className?: string;
    children?: React.ReactNode;
    position?: "top-right" | "center"; // Thêm prop để chọn vị trí
    showOverlay?: boolean; // Thêm prop để hiển thị lớp phủ
    onOverlayClick?: () => void; // Thêm prop để xử lý nhấn lớp phủ
    overlayOpacity?: number; // Thêm prop để tùy chỉnh độ trong suốt
}

export default function FloatingAlert({
    type,
    title,
    message,
    onClose,
    duration = 3000,
    className = "",
    children,
    position = "top-right",
    showOverlay = false,
    onOverlayClick,
    overlayOpacity = 0.5,
}: FloatingAlertProps) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const positionClasses =
        position === "center"
            ? "fixed inset-0 min-w-60 flex justify-center items-center z-100001"
            : "fixed min-w-60 top-20 right-5 z-100001 max-w-xs";

    return (
        <>
            {showOverlay && (
                <div
                    className="fixed inset-0 bg-black"
                    style={{ opacity: overlayOpacity, zIndex: 100000 }}
                    onClick={onOverlayClick}
                />
            )}
            <div className={`${positionClasses} ${className}`}>
                <Alert
                    variant={type}
                    title={title}
                    message={message}
                    showLink={false}
                />
                {children}
            </div>
        </>
    );
}