// src/components/ColumnSelector.tsx
'use client'

import React, { useState } from 'react'
import { Phone, ChevronLeft, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileData } from '@/types'
// --- We'll use these for the checkboxes ---
// (Assuming you have these components from shadcn/ui, if not, replace with standard HTML)
// Since checkbox.tsx isn't provided, I will use standard HTML <input type="checkbox">
// import { Checkbox } from "@/components/ui/checkbox" 
// import { Label } from "@/components/ui/label"

interface ColumnSelectorProps {
  fileData: FileData | null
  selectedColumn?: string
  onColumnSelect: (column: string) => void
  onBack: () => void
  // --- ADDED PROPS ---
  stripPlus: boolean
  onStripPlusChange: (checked: boolean) => void
  splitFiles: boolean
  onSplitFilesChange: (checked: boolean) => void
  // --- END ADDED PROPS ---
}

export default function ColumnSelector({ 
  fileData, 
  selectedColumn: propSelectedColumn, 
  onColumnSelect, 
  onBack,
  // --- DESTRUCTURE NEW PROPS ---
  stripPlus,
  onStripPlusChange,
  splitFiles,
  onSplitFilesChange
}: ColumnSelectorProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>(propSelectedColumn || '')
  const [showPreview, setShowPreview] = useState(false)

  if (!fileData) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-gray-500">No file data available</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>
      </div>
    )
  }

  const handleColumnClick = (columnName: string) => {
    setSelectedColumn(columnName)
  }

  const handleConfirmSelection = () => {
    if (selectedColumn) {
      onColumnSelect(selectedColumn)
    }
  }

  const getColumnTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'object':
      case 'string':
        return 'bg-blue-100 text-blue-800'
      case 'int64':
      case 'float64':
      case 'number':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isPhoneColumn = (columnName: string, sample: string[]) => {
    const phonePatterns = [
      /^\+?\d{8,15}$/,
      /^0\d{9}$/,
      /^\d{10}$/,
      /phone/i,
      /mobile/i,
      /tel/i
    ]
    
    const nameMatch = phonePatterns.some(pattern => 
      typeof pattern === 'object' ? pattern.test(columnName) : false
    )
    
    const sampleMatch = sample.some(value => 
      phonePatterns.some(pattern => 
        typeof pattern === 'object' && typeof value === 'string' ? pattern.test(value) : false
      )
    )
    
    return nameMatch || sampleMatch
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <Button onClick={onBack} variant="outline" className="mr-4">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Select Phone Number Column</h2>
          <p className="text-gray-600">
            File: {fileData.filename} • {fileData.totalRows.toLocaleString()} rows
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-500" />
                Available Columns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fileData.columns.map((column) => {
                  const isSelected = selectedColumn === column.name
                  const suggestedPhone = isPhoneColumn(column.name, column.sample)
                  
                  return (
                    <div
                      key={column.name}
                      onClick={() => handleColumnClick(column.name)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : suggestedPhone
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-800">
                              {column.name}
                            </h4>
                            <Badge className={getColumnTypeColor(column.type)}>
                              {column.type}
                            </Badge>
                            {suggestedPhone && (
                              <Badge className="bg-green-100 text-green-700">
                                Suggested
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Sample: {column.sample.slice(0, 3).join(', ')}
                            {column.sample.length > 3 && '...'}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center text-blue-600">
                            <Phone className="w-5 h-5 mr-1" />
                            <span className="text-sm font-medium">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2 text-gray-500" />
                Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="w-full mb-4"
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              
              {showPreview && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {fileData.preview.slice(0, 5).map((row, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      {Object.entries(row).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium text-gray-600">{key}:</span>
                          <span className="text-gray-800 ml-2 truncate">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selection Summary */}
          {selectedColumn && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h4 className="font-medium text-blue-800 mb-2">Selection Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Column:</span>
                    <span className="font-medium text-blue-800">{selectedColumn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Rows:</span>
                    <span className="font-medium text-blue-800">
                      {fileData.totalRows.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* --- ADDED OPTIONS --- */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="strip-plus"
                      checked={stripPlus}
                      onChange={(e) => onStripPlusChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="strip-plus"
                      className="text-sm font-medium text-gray-700"
                    >
                      Remove &quot;+&quot; from phone numbers
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="split-files"
                      checked={splitFiles}
                      onChange={(e) => onSplitFilesChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="split-files"
                      className="text-sm font-medium text-gray-700"
                    >
                      Split output into files of 50k
                    </label>
                  </div>
                </div>
                {/* --- END ADDED OPTIONS --- */}
                
                <Button
                  onClick={handleConfirmSelection}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Process Phone Numbers
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}