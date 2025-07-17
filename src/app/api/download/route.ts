import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const format = searchParams.get('format') || 'xlsx'

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId parameter' },
        { status: 400 }
      )
    }

    // Construct file path
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const fileName = `${fileId}_processed.xlsx`
    const filePath = path.join(uploadsDir, fileName)

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Processed file not found' },
        { status: 404 }
      )
    }

    // Read file as buffer (binary data)
    const fileBuffer = await readFile(filePath)
    const fileStats = await stat(filePath)

    // Create proper headers for binary file download
    const headers = new Headers()
    
    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv; charset=utf-8')
      headers.set('Content-Disposition', 'attachment; filename="filtered_phone_numbers.csv"')
    } else {
      // Critical: Use the exact MIME type for Excel files
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      headers.set('Content-Disposition', 'attachment; filename="filtered_phone_numbers.xlsx"')
    }
    
    headers.set('Content-Length', fileStats.size.toString())
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    headers.set('Pragma', 'no-cache')
    headers.set('Expires', '0')
    
    // Critical: Return the buffer directly as ArrayBuffer for binary data
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    )
  }
}