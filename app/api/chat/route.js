import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatWithAI } from '../../../lib/gemini'

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
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    // Get user's files from database
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filesError) {
      console.error('Files error:', filesError)
      return NextResponse.json(
        { error: `Failed to fetch files: ${filesError.message}` },
        { status: 500 }
      )
    }

    // Prepare file contents for AI
    const fileContents = files.map(file => ({
      name: file.name,
      content: file.content
    }))

    // Get AI response
    const response = await chatWithAI(message, fileContents)

    return NextResponse.json({
      success: true,
      response: response
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}
