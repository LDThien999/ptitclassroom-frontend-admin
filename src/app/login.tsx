import Alert from '@/components/ui/alert/Alert';
import axios from 'axios';

export async function login(username: string, password: string) {
    try {
        const response = await axios.post(
            "http://localhost:8888/api/identity/auth/admin-login",
            { username, password },
            {
                withCredentials: true, // để nhận cookie
            }
        );

        console.log("Login response:", response.data);
        // Nếu login thành công
        if (response.data?.result.authenticated === true) {
            Alert({
                variant: "success",
                title: "Đăng nhập thành công",
                message: "Chào mừng bạn đã đăng nhập!",
            });
            return true;
        } else {
            Alert({
                variant: "error",
                title: "Đăng nhập thất bại",
                message: "Sai tài khoản hoặc mật khẩu.",
            });
            return false;
        }
    } catch (error: any) {
        const message =
            error?.response?.data?.message || "Không thể kết nối máy chủ.";

        Alert({
            variant: "error",
            title: "Đăng nhập thất bại",
            message,
        });

        return false;
    }
}
