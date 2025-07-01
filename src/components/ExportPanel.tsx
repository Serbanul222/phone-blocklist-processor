// src/components/ExportPanel.tsx
'use client'

import React, { useState } from 'react'
import { Download, FileCheck, RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProcessingStats } from '@/types'

interface ExportPanelProps {
  processedFileId: string
  stats: ProcessingStats | null
  onReset: () => void
}

export default function ExportPanel({ processedFileId, stats, onReset }: ExportPanelProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async (format: 'xlsx' | 'csv') => {
    if (!processedFileId) return
    
    setDownloading(true)
    try {
      const response = await fetch(`/api/download?fileId=${processedFileId}&format=${format}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `filtered_phone_numbers.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('Download failed')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-gray-500">No processing results available</p>
        <Button onClick={onReset} variant="outline" className="mt-4">
          Start Over
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="text-center">
        <CardContent className="p-8">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileCheck className="w-10 h-10 text-green-600" />
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing Complete!</h2>
          <p className="text-gray-600 mb-8">
            Your phone numbers have been successfully filtered and are ready for download.
          </p>

          {/* Results Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{stats.totalRows.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Input Rows</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.validNumbers.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Valid Numbers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.blockedNumbers.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Removed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.finalRows.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Final Rows</div>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="space-y-4 mb-8">
            <Button
              onClick={() => handleDownload('xlsx')}
              disabled={downloading}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 px-8 py-3"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {downloading ? 'Preparing Download...' : 'Download Excel File (.xlsx)'}
            </Button>
            
            <div className="text-center">
              <span className="text-gray-400 text-sm">or</span>
            </div>
            
            <Button
              onClick={() => handleDownload('csv')}
              disabled={downloading}
              variant="outline"
              className="w-full md:w-auto px-8 py-3"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download CSV File (.csv)
            </Button>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-2">Download Information</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Phone numbers are normalized to international E.164 format</p>
              <p>• Excel files preserve number formatting (no scientific notation)</p>
              <p>• All original columns are maintained in the output</p>
              <p>• Processing completed in {stats.processingTime}s</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onReset}
              variant="outline"
              className="px-6 py-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Process Another File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}