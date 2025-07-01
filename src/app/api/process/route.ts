import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, phoneColumn } = body

    if (!fileId || !phoneColumn) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId or phoneColumn' },
        { status: 400 }
      )
    }

    // Find the uploaded file
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const possibleExtensions = ['.csv', '.xlsx', '.xls']
    let inputFilePath = ''
    
    for (const ext of possibleExtensions) {
      const testPath = path.join(uploadsDir, `${fileId}${ext}`)
      if (existsSync(testPath)) {
        inputFilePath = testPath
        break
      }
    }

    if (!inputFilePath) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file not found' },
        { status: 404 }
      )
    }

    // Generate output file path
    const processedFileId = uuidv4()
    const outputFilePath = path.join(uploadsDir, `${processedFileId}_processed.xlsx`)

    // Python script path
    const pythonScriptPath = path.join(process.cwd(), 'python_scripts', 'phone_processor_api.py')

    if (!existsSync(pythonScriptPath)) {
      return NextResponse.json(
        { success: false, error: 'Python script not found' },
        { status: 500 }
      )
    }

    // Determine Python command
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3'

    // Execute Python script
    console.log('Starting Python execution at:', new Date().toISOString())
    const startTime = Date.now()
    
    const stats = await new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn(pythonCommand, [
        pythonScriptPath,
        inputFilePath,
        '--output', outputFilePath,
        '--phone-column', phoneColumn,
        '--json-output'
      ])

      let stdout = ''
      let stderr = ''

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      pythonProcess.on('close', (code) => {
        console.log(`Python process completed in ${Date.now() - startTime}ms`)
        
        if (code === 0) {
          try {
            // Parse the JSON output from the Python script
            const lines = stdout.trim().split('\n')
            const jsonLine = lines.find(line => {
              try {
                JSON.parse(line)
                return true
              } catch {
                return false
              }
            })
            
            if (jsonLine) {
              const stats = JSON.parse(jsonLine)
              console.log('Resolving with stats at:', Date.now() - startTime + 'ms')
              resolve(stats)
            } else {
              reject(new Error('No JSON output from Python script'))
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError}`))
          }
        } else {
          reject(new Error(`Python script failed with code ${code}${stderr ? ': ' + stderr : ''}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`))
      })
    })

    console.log('Total API processing time:', Date.now() - startTime + 'ms')

    const response = {
      success: true,
      stats: {
        totalRows: stats.total_rows,
        validNumbers: stats.valid_numbers,
        blockedNumbers: stats.blocked_numbers,
        finalRows: stats.final_rows,
        blocklistSize: stats.blocklist_size,
        processingTime: stats.processing_time,
        duplicatesRemoved: stats.duplicates_removed || 0
      },
      processedFileId
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process file' },
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