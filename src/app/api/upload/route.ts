import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// For CSV parsing
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

interface DataRow {
  [key: string]: string | number | boolean | null | undefined
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique file ID and save file
    const fileId = uuidv4()
    const fileExtension = path.extname(file.name)
    const fileName = `${fileId}${fileExtension}`
    const filePath = path.join(uploadsDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Parse file to get column information
    let data: DataRow[] = []
    let columns: Array<{ name: string; sample: string[]; type: string }> = []

    if (file.name.toLowerCase().endsWith('.csv')) {
      // Parse CSV
      const csvContent = buffer.toString('utf-8')
      data = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        auto_parse: false // Keep as strings for now
      }) as DataRow[]
    } else {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as DataRow[]
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File appears to be empty or invalid' },
        { status: 400 }
      )
    }

    // Analyze columns
    const sampleSize = Math.min(5, data.length)
    const columnNames = Object.keys(data[0])
    
    columns = columnNames.map(colName => {
      const sample = data.slice(0, sampleSize).map(row => 
        String(row[colName] || '').trim()
      ).filter(val => val !== '')
      
      // Simple type detection
      const firstValue = sample[0]
      let type = 'string'
      if (firstValue && !isNaN(Number(firstValue))) {
        type = 'number'
      }
      
      return {
        name: colName,
        sample: sample.slice(0, 3), // Show max 3 samples
        type
      }
    })

    // Prepare preview (first 5 rows)
    const preview = data.slice(0, 5)

    const response = {
      success: true,
      fileId,
      filename: file.name,
      columns,
      totalRows: data.length,
      preview
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process file' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}