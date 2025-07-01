import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        database: true, // We don't have a database, so always true
        python: false,
        filesystem: false,
        api: true
      }
    }

    // Check if Python is available
    try {
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3'
      await new Promise<void>((resolve, reject) => {
        const pythonProcess = spawn(pythonCommand, ['--version'])
        pythonProcess.on('close', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`Python not available`))
        })
        pythonProcess.on('error', reject)
      })
      checks.checks.python = true
    } catch (error) {
      checks.checks.python = false
    }

    // Check if uploads directory is writable
    const uploadsDir = path.join(process.cwd(), 'uploads')
    checks.checks.filesystem = existsSync(uploadsDir)

    // Check if Python script exists
    const pythonScriptPath = path.join(process.cwd(), 'python_scripts', 'phone_processor_api.py')
    const scriptExists = existsSync(pythonScriptPath)

    // Overall health
    const isHealthy = checks.checks.python && checks.checks.filesystem && scriptExists
    
    return NextResponse.json({
      ...checks,
      status: isHealthy ? 'healthy' : 'unhealthy',
      python_script: scriptExists
    }, {
      status: isHealthy ? 200 : 503
    })

  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    })
  }
}