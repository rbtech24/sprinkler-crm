'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button } from './button'
import { clsx } from 'clsx'

interface FileUploadProps {
  value?: File[]
  onChange: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  maxFiles?: number
  label?: string
  description?: string
  className?: string
  disabled?: boolean
}

export function FileUpload({
  value = [],
  onChange,
  accept = "image/*",
  multiple = true,
  maxSize = 10,
  maxFiles = 10,
  label = "Upload Photos",
  description = "Drag and drop photos here, or click to browse",
  className,
  disabled = false
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      return `File type ${file.type} is not allowed`
    }

    return null
  }

  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files)
    const newErrors: string[] = []

    // Check max files limit
    if (value.length + newFiles.length > maxFiles) {
      newErrors.push(`Cannot upload more than ${maxFiles} files`)
      setErrors(newErrors)
      return
    }

    // Validate each file
    const validFiles: File[] = []
    newFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        newErrors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
    } else {
      setErrors([])
      onChange(multiple ? [...value, ...validFiles] : validFiles)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index)
    onChange(newFiles)
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={clsx("space-y-4", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        className={clsx(
          "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver && !disabled
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">
              Click to upload
            </span>{" "}
            or drag and drop
          </div>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          <p className="text-xs text-gray-500">
            Max {maxSize}MB per file, up to {maxFiles} files
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* File Preview */}
      {value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Files ({value.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {value.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg border bg-gray-50 overflow-hidden">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                <p className="mt-1 text-xs text-gray-500 truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
