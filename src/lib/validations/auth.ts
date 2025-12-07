import { z } from 'zod'

export const registerStep1Schema = z.object({
  fullName: z.string().min(2, 'الاسم يجب أن يكون على الأقل حرفين'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  phone: z.string().optional(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
  pinCode: z.string()
    .min(4, 'كود PIN يجب أن يكون 4-6 أرقام')
    .max(6, 'كود PIN يجب أن يكون 4-6 أرقام')
    .regex(/^\d+$/, 'كود PIN يجب أن يحتوي على أرقام فقط'),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'يجب الموافقة على شروط الاستخدام' })
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword']
})

export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة')
})

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>
export type LoginData = z.infer<typeof loginSchema>
