'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  currentImage?: string | null
  onImageChange: (url: string | null) => void
  userId: string
  folder?: string // 'products' | 'categories' etc
  size?: 'sm' | 'md' | 'lg'
}

export default function ImageUpload({ 
  currentImage, 
  onImageChange, 
  userId,
  folder = 'products',
  size = 'md'
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

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط')
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('حجم الصورة يجب أن يكون أقل من 2MB')
      return
    }

    setUploading(true)

    try {
      // Create unique filename: userId/folder/timestamp_originalname
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`

      // Delete old image if exists
      if (currentImage) {
        const oldPath = currentImage.split('/').slice(-3).join('/')
        await supabase.storage.from('images').remove([oldPath])
      }

      // Upload new image
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('Upload error:', error)
        alert('فشل رفع الصورة. حاول مرة أخرى.')
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
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
      const urlParts = currentImage.split('/images/')
      if (urlParts[1]) {
        await supabase.storage.from('images').remove([urlParts[1]])
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
