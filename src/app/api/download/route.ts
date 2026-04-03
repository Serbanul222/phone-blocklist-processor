// Updated src/app/api/download/route.ts
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

    // Construct file path based on requested format
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const baseFileName = `${fileId}_processed`

    // Check for ZIP files first (split output), then regular files
    let actualFilePath = ''
    let actualFormat = format
    let isZipFile = false

    // Priority 1: Check for ZIP file (split output)
    const zipExtension = format === 'csv' ? '_csv.zip' : '_xlsx.zip'
    const zipFilePath = path.join(uploadsDir, `${baseFileName}${zipExtension}`)

    if (existsSync(zipFilePath)) {
      actualFilePath = zipFilePath
      isZipFile = true
      console.log(`Found split output ZIP file: ${zipFilePath}`)
    } else {
      // Priority 2: Check for regular file (single output)
      const requestedExtension = format === 'csv' ? '.csv' : '.xlsx'
      const regularFilePath = path.join(uploadsDir, `${baseFileName}${requestedExtension}`)

      if (existsSync(regularFilePath)) {
        actualFilePath = regularFilePath
        console.log(`Found regular file: ${regularFilePath}`)
      } else {
        // Priority 3: If Excel was requested but doesn't exist, try CSV
        if (format === 'xlsx') {
          const csvFallback = path.join(uploadsDir, `${baseFileName}.csv`)
          if (existsSync(csvFallback)) {
            actualFilePath = csvFallback
            actualFormat = 'csv'
            console.log('Excel file not found, serving CSV instead')
          } else {
            return NextResponse.json(
              { success: false, error: 'Processed file not found' },
              { status: 404 }
            )
          }
        } else {
          return NextResponse.json(
            { success: false, error: 'Processed file not found' },
            { status: 404 }
          )
        }
      }
    }

    // Read file as binary buffer
    const fileBuffer = await readFile(actualFilePath)
    const fileStats = await stat(actualFilePath)

    console.log(`Serving ${isZipFile ? 'ZIP' : actualFormat} file: ${actualFilePath}, size: ${fileStats.size} bytes`)

    // Create response with proper binary handling
    if (isZipFile) {
      // For ZIP files, serve as binary
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="filtered_phone_numbers_${actualFormat}.zip"`,
          'Content-Length': fileStats.size.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept-Ranges': 'bytes',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    } else if (actualFormat === 'csv') {
      // For CSV, ensure UTF-8 encoding and proper line endings
      let csvContent = fileBuffer.toString('utf-8')

      // Normalize line endings for better compatibility
      csvContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="filtered_phone_numbers.csv"',
          'Content-Length': Buffer.byteLength(csvContent, 'utf-8').toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
    } else {
      // For Excel, serve as pure binary with robust headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="filtered_phone_numbers.xlsx"',
          'Content-Length': fileStats.size.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Additional headers for binary integrity
          'Accept-Ranges': 'bytes',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    )
  }
}