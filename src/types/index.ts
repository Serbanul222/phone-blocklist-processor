export interface FileData {
  fileId: string
  filename: string
  columns: Array<{
    name: string
    sample: string[]
    type: string
  }>
  totalRows: number
  preview: Record<string, any>[]
}

export interface ProcessingStats {
  totalRows: number
  validNumbers: number
  blockedNumbers: number
  finalRows: number
  blocklistSize: number
  processingTime: number
  duplicatesRemoved: number
}

export type ProcessingState = 
  | 'idle' 
  | 'uploading' 
  | 'processing' 
  | 'completing'
  | 'completed' 
  | 'error'

export interface Step {
  id: number
  title: string
  color: string
}

export interface UploadResponse {
  success: boolean
  fileId: string
  filename: string
  columns: Array<{
    name: string
    sample: string[]
    type: string
  }>
  totalRows: number
  preview: Record<string, any>[]
  error?: string
}

export interface ProcessResponse {
  success: boolean
  stats: ProcessingStats
  processedFileId: string
  error?: string
}

export interface DownloadResponse {
  success: boolean
  downloadUrl: string
  filename: string
  error?: string
}