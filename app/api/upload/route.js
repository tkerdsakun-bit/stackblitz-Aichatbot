import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFile } from '../../../lib/fileParser'
import { uploadFile, saveFileMetadata } from '../../../lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`

    const content = await parseFile(file, file.type)

    const uploadData = await uploadFile(file, fileName, user.id)

    const fileMetadata = {
      name: file.name,
      file_path: uploadData.path,
      file_type: file.type,
      file_size: file.size,
      content: content,
      created_at: new Date().toISOString()
    }

    const savedFile = await saveFileMetadata(fileMetadata, user.id)

    return NextResponse.json({
      success: true,
      file: {
        id: savedFile.id,
        name: savedFile.name,
        size: `${(savedFile.file_size / 1024).toFixed(2)} KB`,
        type: savedFile.file_type,
        uploadedAt: new Date(savedFile.created_at).toLocaleString()
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
