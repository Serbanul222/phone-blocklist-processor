'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle, Database, Filter, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ProcessingState, ProcessingStats } from '@/types'

interface ProcessingDashboardProps {
  state: ProcessingState
  stats: ProcessingStats | null
  selectedColumn?: string
}

interface ProcessingStep {
  id: string
  title: string
  description: string
  icon: typeof Database
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
}

export default function ProcessingDashboard({ state, stats, selectedColumn }: ProcessingDashboardProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'blocklist',
      title: 'Fetching Blocklist',
      description: 'Downloading blocked numbers from API',
      icon: Database,
      status: 'pending',
      progress: 0
    },
    {
      id: 'normalize',
      title: 'Normalizing Phone Numbers',
      description: 'Converting to international E.164 format',
      icon: Filter,
      status: 'pending',
      progress: 0
    },
    {
      id: 'filter',
      title: 'Filtering Blocked Numbers',
      description: 'Removing numbers found in blocklist',
      icon: CheckCircle,
      status: 'pending',
      progress: 0
    }
  ])

  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (state === 'processing') {
      timer = setInterval(() => {
        setSteps(prevSteps => {
          const newSteps = [...prevSteps]
          
          if (currentStepIndex < newSteps.length) {
            const currentStep = newSteps[currentStepIndex]
            
            if (currentStep.status === 'pending') {
              currentStep.status = 'running'
              currentStep.progress = 10
            } else if (currentStep.status === 'running') {
              currentStep.progress = Math.min(100, currentStep.progress + 15)
              
              if (currentStep.progress >= 100) {
                currentStep.status = 'completed'
                setCurrentStepIndex(prev => prev + 1)
              }
            }
          }
          
          return newSteps
        })
      }, 800)
    }

    if (state === 'completed') {
      // Immediately mark all steps as completed when API finishes
      setSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          status: 'completed' as const,
          progress: 100
        }))
      )
    }

    if (state === 'error') {
      setSteps(prevSteps => {
        const newSteps = [...prevSteps]
        if (currentStepIndex < newSteps.length) {
          newSteps[currentStepIndex].status = 'error'
        }
        return newSteps
      })
    }

    // Cleanup timer
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [state, currentStepIndex])

  const getStepIcon = (step: ProcessingStep) => {
    const Icon = step.icon
    
    if (step.status === 'running') {
      return <Loader2 className="w-5 h-5 text-white animate-spin" />
    }
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-white" />
    }
    if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-white" />
    }
    return <Icon className="w-5 h-5 text-gray-500" />
  }

  const getStepColor = (step: ProcessingStep) => {
    if (step.status === 'running') return 'bg-blue-500'
    if (step.status === 'completed') return 'bg-green-500'
    if (step.status === 'error') return 'bg-red-500'
    return 'bg-gray-300'
  }

  const getProgressColor = (step: ProcessingStep) => {
    if (step.status === 'running') return 'bg-blue-500'
    if (step.status === 'completed') return 'bg-green-500'
    if (step.status === 'error') return 'bg-red-500'
    return 'bg-gray-300'
  }

  const getStatusText = (step: ProcessingStep) => {
    if (step.status === 'pending') return 'Pending'
    if (step.status === 'running') return `Processing... ${step.progress}%`
    if (step.status === 'completed') return 'Complete'
    if (step.status === 'error') return 'Error'
    return ''
  }

  const getStatusColor = (step: ProcessingStep) => {
    if (step.status === 'running') return 'text-blue-600'
    if (step.status === 'completed') return 'text-green-600'
    if (step.status === 'error') return 'text-red-600'
    return 'text-gray-400'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-6 h-6 mr-2 text-blue-500" />
            Processing Your Data
            {selectedColumn && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                (Column: {selectedColumn})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${getStepColor(step)}`}>
                  {getStepIcon(step)}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">{step.title}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${getStatusColor(step)}`}>
                        {getStatusText(step)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(step)}`}
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>

                  {step.status === 'completed' && stats && (
                    <div className="mt-2 text-xs text-gray-500">
                      {step.id === 'blocklist' && `Loaded ${stats.blocklistSize.toLocaleString()} blocked numbers`}
                      {step.id === 'normalize' && `Processed ${stats.validNumbers.toLocaleString()} valid numbers`}
                      {step.id === 'filter' && `Removed ${stats.blockedNumbers.toLocaleString()} blocked numbers`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          {state === 'processing' && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Overall Progress</span>
                <span className="text-sm text-blue-600">
                  {Math.round(((currentStepIndex + (steps[currentStepIndex]?.progress || 0) / 100) / steps.length) * 100)}%
                </span>
              </div>
              <Progress 
                value={((currentStepIndex + (steps[currentStepIndex]?.progress || 0) / 100) / steps.length) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* Completion Message */}
          {(state === 'completed' || state === 'completing') && stats && (
            <div className={`mt-8 p-6 border rounded-lg transition-all duration-500 ${
              state === 'completing' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center mb-4">
                {state === 'completing' ? (
                  <>
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    <h3 className="text-lg font-semibold text-blue-800">Finalizing Results...</h3>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-green-800">Processing Complete!</h3>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{stats.totalRows.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Input Rows</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.validNumbers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Valid Numbers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.blockedNumbers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Blocked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.finalRows.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Final Rows</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                {state === 'completing' 
                  ? 'Preparing download file...' 
                  : `Processing completed in ${stats.processingTime}s`
                }
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Processing Failed</h3>
                  <p className="text-red-600 mt-1">
                    An error occurred while processing your file. Please try again or contact support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}