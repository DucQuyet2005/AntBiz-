import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .transform((val) => (val.includes("@") ? val : `${val}@gmail.com`))
    .pipe(z.string().email("Định dạng email không hợp lệ")),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(50, "Họ và tên không được quá 50 ký tự"),
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Định dạng email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu phải chứa ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Định dạng email không hợp lệ"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Mật khẩu phải chứa ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số"),
  confirmPassword: z
    .string()
    .min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không trùng khớp",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

