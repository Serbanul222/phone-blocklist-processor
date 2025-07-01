// src/components/StepIndicator.tsx
'use client'

import React from 'react'
import { Upload, FileText, Database, BarChart3, Download, CheckCircle } from 'lucide-react'
import { Step } from '@/types'

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

const stepIcons = [Upload, FileText, Database, BarChart3, Download]

export default function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {steps.map((step, index) => {
        const Icon = stepIcons[index] || Upload
        const isActive = currentStep === index
        const isCompleted = currentStep > index
        const isClickable = onStepClick && (isCompleted || index <= currentStep + 1)
        
        return (
          <div key={step.id} className="flex items-center">
            <div 
              onClick={() => isClickable && onStepClick(index)}
              className={`
                flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                ${isClickable ? 'cursor-pointer' : ''}
                ${isActive 
                  ? `bg-${step.color}-500 border-${step.color}-500 text-white` 
                  : isCompleted 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-gray-100 border-gray-300 text-gray-400'
                }
              `}
            >
              {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
            </div>
            <div className="ml-3">
              <div className={`text-sm font-medium ${
                isActive 
                  ? `text-${step.color}-600` 
                  : isCompleted 
                  ? 'text-green-600' 
                  : 'text-gray-400'
              }`}>
                {step.title}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-6 ${
                isCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}