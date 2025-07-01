// src/components/ResultsView.tsx
'use client'

import React from 'react'
import { BarChart3, Users, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProcessingStats } from '@/types'

interface ResultsViewProps {
  stats: ProcessingStats | null
  selectedColumn?: string
  onExport: () => void
}

export default function ResultsView({ stats, selectedColumn, onExport }: ResultsViewProps) {
  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-gray-500">No processing results available</p>
      </div>
    )
  }

  const cleanPercentage = ((stats.finalRows / stats.totalRows) * 100).toFixed(1)
  const blockedPercentage = ((stats.blockedNumbers / stats.totalRows) * 100).toFixed(1)
  const validPercentage = ((stats.validNumbers / stats.totalRows) * 100).toFixed(1)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rows</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRows.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valid Numbers</p>
                <p className="text-2xl font-bold text-green-600">{stats.validNumbers.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{validPercentage}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blocked Numbers</p>
                <p className="text-2xl font-bold text-red-600">{stats.blockedNumbers.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{blockedPercentage}% removed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-emerald-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clean Records</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.finalRows.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{cleanPercentage}% remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Summary */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Processing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Clean Numbers</span>
                  <span className="font-medium">{cleanPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                    style={{width: `${cleanPercentage}%`}}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Blocked Numbers</span>
                  <span className="font-medium">{blockedPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all duration-500" 
                    style={{width: `${blockedPercentage}%`}}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Processing Time</span>
                <Badge variant="outline">{stats.processingTime}s</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blocklist Size</span>
                <Badge variant="outline">{stats.blocklistSize.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone Column Used</span>
                <Badge variant="outline">{selectedColumn || 'N/A'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Efficiency</span>
                <Badge className="bg-green-100 text-green-800">
                  {Math.round((stats.finalRows / stats.totalRows) * 100)}% retained
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={onExport}
          className="bg-green-600 hover:bg-green-700 px-8 py-3"
          size="lg"
        >
          <Eye className="w-5 h-5 mr-2" />
          View Results & Export
        </Button>
      </div>
    </div>
  )
}