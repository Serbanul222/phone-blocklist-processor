'use client'

import React, { useCallback, useState } from 'react'
import { Upload, AlertCircle, Loader2, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  isUploading: boolean
  error: boolean
}

export default function FileUpload({ onFileUpload, isUploading, error }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')

  const validateFile = useCallback((file: File): string | null => {
    const maxSize = 50 * 1024 * 1024 // 50MB
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ]
    
    if (file.size > maxSize) {
      return 'File size must be less than 50MB'
    }
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      return 'Only CSV and Excel files (.csv, .xlsx, .xls) are supported'
    }
    
    return null
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }
    
    setUploadError('')
    onFileUpload(file)
  }, [validateFile, onFileUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-2 border-dashed hover:border-blue-400 transition-all duration-200">
        <CardContent 
          className={`p-12 text-center ${
            isDragOver ? 'bg-blue-50 border-blue-400' : 'bg-blue-50/30'
          } ${isUploading ? 'opacity-50' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto animate-spin" />
              <h3 className="text-xl font-semibold text-gray-700">Uploading file...</h3>
              <p className="text-gray-500">Please wait while we process your file</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Upload className="w-16 h-16 text-blue-500 mx-auto" />
                {isDragOver && (
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-700">
                Drop your file here
              </h3>
              <p className="text-gray-500 mb-4">
                Supports CSV and Excel files (.csv, .xlsx, .xls)
              </p>
              
              <div className="space-y-2">
                <Button 
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => document.getElementById('file-input')?.click()}
                  disabled={isUploading}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Requirements */}
      <Alert className="mt-6 border-yellow-200 bg-yellow-50">
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>File Requirements:</strong> Maximum file size: 50MB. 
          Must contain phone numbers in one column. Supported formats: CSV, Excel (.xlsx, .xls)
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {(error || uploadError) && (
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {uploadError || 'An error occurred while uploading the file. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Supported File Examples */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Expected File Structure:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Phone numbers can be in any format (with/without country code)</div>
          <div>• Example formats: +40723456789, 0723456789, 40723456789</div>
          <div>• Additional columns (name, email, etc.) will be preserved</div>
        </div>
      </div>
    </div>
  )
}