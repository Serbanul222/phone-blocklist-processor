// src/app/page.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { Phone } from 'lucide-react'
import StepIndicator from '@/components/StepIndicator'
import FileUpload from '@/components/FileUpload'
import ColumnSelector from '@/components/ColumnSelector'
import ProcessingDashboard from '@/components/ProcessingDashboard'
import ResultsView from '@/components/ResultsView'
import ExportPanel from '@/components/ExportPanel'
import { ProcessingState, FileData, ProcessingStats } from '@/types'

export default function PhoneBlocklistProcessor() {
  const [currentStep, setCurrentStep] = useState(0)
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null)
  const [processedFileId, setProcessedFileId] = useState<string>('')
  
  // --- ADDED STATE ---
  const [stripPlus, setStripPlus] = useState(false)
  const [splitFiles, setSplitFiles] = useState(false)
  // --- END ADDED STATE ---

  const steps = [
    { id: 0, title: 'Upload File', color: 'blue' },
    { id: 1, title: 'Select Column', color: 'purple' },
    { id: 2, title: 'Processing', color: 'orange' },
    { id: 3, title: 'Results', color: 'green' },
    { id: 4, title: 'Export', color: 'emerald' }
  ]

  const handleProcessing = useCallback(async (column: string) => {
    if (!fileData) return
    
    setProcessingState('processing')
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes timeout
      
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileData.fileId,
          phoneColumn: column,
          // --- PASS NEW OPTIONS ---
          stripPlus: stripPlus,
          splitFiles: splitFiles
          // --- END PASS NEW OPTIONS ---
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        // Get the error details from the response
        const errorData = await response.json()
        console.error('API Error Details:', errorData)
        throw new Error(`Processing failed: ${errorData.error || 'Unknown error'}`)
      }
      
      const data = await response.json()
      console.log('Success data:', data)
      
      // Immediately set the data and move to results
      setProcessingStats(data.stats)
      setProcessedFileId(data.processedFileId)
      setCurrentStep(3)
      setProcessingState('completed')
      
    } catch (error) {
      console.error('Processing error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timed out after 2 minutes')
      }
      setProcessingState('error')
    }
    // --- MODIFIED DEPENDENCY ARRAY ---
  }, [fileData, stripPlus, splitFiles])
  // --- END MODIFIED DEPENDENCY ARRAY ---


  const handleFileUpload = useCallback(async (file: File) => {
    setProcessingState('uploading')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      const data = await response.json()
      setFileData(data)
      setCurrentStep(1)
      setProcessingState('idle')
    } catch (error) {
      console.error('Upload error:', error)
      setProcessingState('error')
    }
  }, [])

  const handleColumnSelect = useCallback((column: string) => {
    setSelectedColumn(column)
    setCurrentStep(2)
    handleProcessing(column)
  }, [handleProcessing])

  const handleExport = useCallback(() => {
    setCurrentStep(4)
  }, [])

  const handleReset = useCallback(() => {
    setCurrentStep(0)
    setFileData(null)
    setSelectedColumn('')
    setProcessingState('idle')
    setProcessingStats(null)
    setProcessedFileId('')
    // --- RESET NEW STATE ---
    setStripPlus(false)
    setSplitFiles(false)
    // --- END RESET NEW STATE ---
  }, [])

  const renderStep = () => {
    switch(currentStep) {
      case 0:
        return (
          <FileUpload 
            onFileUpload={handleFileUpload}
            isUploading={processingState === 'uploading'}
            error={processingState === 'error'}
          />
        )
      case 1:
        return (
          <ColumnSelector 
            fileData={fileData}
            selectedColumn={selectedColumn}
            onColumnSelect={handleColumnSelect}
            onBack={() => setCurrentStep(0)}
            // --- PASS STATE AND SETTERS ---
            stripPlus={stripPlus}
            onStripPlusChange={setStripPlus}
            splitFiles={splitFiles}
            onSplitFilesChange={setSplitFiles}
            // --- END PASS STATE AND SETTERS ---
          />
        )
      case 2:
        return (
          <ProcessingDashboard 
            state={processingState}
            stats={processingStats}
            selectedColumn={selectedColumn}
          />
        )
      case 3:
        return (
          <ResultsView 
            stats={processingStats}
            selectedColumn={selectedColumn}
            onExport={handleExport}
          />
        )
      case 4:
        return (
          <ExportPanel 
            processedFileId={processedFileId}
            stats={processingStats}
            onReset={handleReset}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center">
            <Phone className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Phone Blocklist Processor
              </h1>
              <p className="text-gray-600">
                Filter phone numbers against blocklist with real-time processing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <StepIndicator 
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
        
        <div className="mt-8">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}