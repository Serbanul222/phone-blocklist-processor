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

function removeBOM(buffer: Buffer): Buffer {
  // Check for UTF-8 BOM (EF BB BF)
  if (buffer.length >= 3 && 
      buffer[0] === 0xEF && 
      buffer[1] === 0xBB && 
      buffer[2] === 0xBF) {
    return buffer.slice(3)
  }
  
  // Check for UTF-16 LE BOM (FF FE)
  if (buffer.length >= 2 && 
      buffer[0] === 0xFF && 
      buffer[1] === 0xFE) {
    return buffer.slice(2)
  }
  
  // Check for UTF-16 BE BOM (FE FF)
  if (buffer.length >= 2 && 
      buffer[0] === 0xFE && 
      buffer[1] === 0xFF) {
    return buffer.slice(2)
  }
  
  return buffer
}

function parseCSVSafely(buffer: Buffer): DataRow[] {
  // Remove BOM if present
  const cleanBuffer = removeBOM(buffer)
  let csvContent = cleanBuffer.toString('utf-8')
  
  // Remove any remaining BOM characters from the string
  csvContent = csvContent.replace(/^\uFEFF/, '')
  
  // Try different parsing strategies
  const strategies = [
    // Strategy 1: Standard parsing
    {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      escape: '"'
    },
    // Strategy 2: More relaxed parsing
    {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true
    },
    // Strategy 3: Very permissive
    {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      quote: false, // Disable quote handling
      relax_quotes: true,
      relax_column_count: true
    }
  ]
  
  for (const strategy of strategies) {
    try {
      const data = parse(csvContent, strategy) as DataRow[]
      if (data.length > 0 && Object.keys(data[0]).length > 0) {
        return data
      }
    } catch (error) {
      console.warn('CSV parse strategy failed:', error)
      continue
    }
  }
  
  throw new Error('All CSV parsing strategies failed')
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
      // Use enhanced CSV parser with BOM handling
      console.log('Parsing CSV with BOM handling...')
      try {
        data = parseCSVSafely(buffer)
        console.log('CSV parsed successfully with BOM handling')
      } catch (error) {
        console.error('Enhanced CSV parsing failed:', error)
        return NextResponse.json(
          { success: false, error: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        )
      }
    } else {
      // Parse Excel
      console.log('Parsing Excel file...')
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as DataRow[]
      } catch (error) {
        console.error('Excel parsing failed:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to parse Excel file' },
          { status: 400 }
        )
      }
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File appears to be empty or invalid' },
        { status: 400 }
      )
    }

    // Clean column names (remove any remaining BOM characters)
    const cleanedData = data.map(row => {
      const cleanedRow: DataRow = {}
      Object.keys(row).forEach(key => {
        const cleanKey = key.replace(/^\uFEFF/, '').trim()
        cleanedRow[cleanKey] = row[key]
      })
      return cleanedRow
    })

    // Update data with cleaned column names
    data = cleanedData

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

    console.log(`File uploaded successfully: ${file.name} (${data.length} rows)`)

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