import { z } from 'zod'

// Password must be at least 8 characters with at least one number
const passwordSchema = z.string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
  .regex(/[a-zA-Z]/, 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل')

export const registerStep1Schema = z.object({
  fullName: z.string()
    .min(2, 'الاسم يجب أن يكون على الأقل حرفين')
    .max(100, 'الاسم طويل جداً')
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على حروف فقط'),
  email: z.string()
    .email('البريد الإلكتروني غير صالح')
    .max(255, 'البريد الإلكتروني طويل جداً')
    .toLowerCase(),
  phone: z.string()
    .regex(/^[+]?[\d\s-]{0,20}$/, 'رقم الهاتف غير صالح')
    .optional()
    .or(z.literal('')),
  password: passwordSchema,
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
  email: z.string()
    .email('البريد الإلكتروني غير صالح')
    .toLowerCase(),
  password: z.string().min(1, 'كلمة المرور مطلوبة')
})

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmNewPassword']
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'كلمة المرور الجديدة يجب أن تكون مختلفة',
  path: ['newPassword']
})

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>
export type LoginData = z.infer<typeof loginSchema>
