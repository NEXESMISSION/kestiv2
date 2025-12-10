'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// SECURITY: Only allow specific folder names to prevent path traversal
const ALLOWED_FOLDERS = ['products', 'categories', 'avatars', 'members'] as const
type AllowedFolder = typeof ALLOWED_FOLDERS[number]

interface ImageUploadProps {
  currentImage?: string | null
  onImageChange: (url: string | null) => void
  userId: string
  folder?: AllowedFolder // Restricted to allowed folders only
  size?: 'sm' | 'md' | 'lg'
  maxSizeMB?: number
  compressQuality?: number // 0.1 to 1.0
}

// Compress image using canvas
async function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Compression failed'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export default function ImageUpload({ 
  currentImage, 
  onImageChange, 
  userId,
  folder = 'products',
  size = 'md',
  maxSizeMB = 5,
  compressQuality = 0.7
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - only allow specific image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('يرجى اختيار صورة فقط (JPEG, PNG, GIF, WebP)')
      return
    }

    // Check max size (5MB)
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`حجم الصورة يجب أن يكون أقل من ${maxSizeMB}MB`)
      return
    }

    // SECURITY: Validate folder is in allowed list
    const safeFolder = ALLOWED_FOLDERS.includes(folder as AllowedFolder) ? folder : 'products'

    setUploading(true)

    try {
      // Compress image before upload
      let fileToUpload: Blob | File = file
      
      // Only compress if larger than 200KB
      if (file.size > 200 * 1024) {
        try {
          fileToUpload = await compressImage(file, 800, compressQuality)
        } catch {
          // If compression fails, use original
          fileToUpload = file
        }
      }

      // SECURITY: Sanitize userId to prevent path traversal
      const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '')
      
      // Create unique filename with sanitized path
      const fileName = `${safeUserId}/${safeFolder}/${Date.now()}.jpg`

      // Delete old image if exists
      if (currentImage) {
        const oldPath = currentImage.split('/products/')[1]
        if (oldPath) {
          await supabase.storage.from('products').remove([oldPath])
        }
      }

      // Upload compressed image
      const { error } = await supabase.storage
        .from('products')
        .upload(fileName, fileToUpload, {
          cacheControl: '31536000', // 1 year cache
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) {
        console.error('Upload error:', error)
        alert('فشل رفع الصورة. تأكد من إعداد Storage في Supabase')
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName)

      setPreview(publicUrl)
      onImageChange(publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      alert('حدث خطأ أثناء رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentImage) {
      setPreview(null)
      onImageChange(null)
      return
    }

    setUploading(true)
    try {
      // Extract path from URL
      const urlParts = currentImage.split('/products/')
      if (urlParts[1]) {
        await supabase.storage.from('products').remove([urlParts[1]])
      }
      setPreview(null)
      onImageChange(null)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div 
        className={`${sizeClasses[size]} relative rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors cursor-pointer bg-gray-50 flex items-center justify-center overflow-hidden group`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        ) : preview ? (
          <>
            <Image
              src={preview}
              alt="صورة المنتج"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="text-center p-2">
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">صورة</span>
          </div>
        )}
      </div>

      {preview && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleRemove(); }}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          حذف
        </button>
      )}
    </div>
  )
}
