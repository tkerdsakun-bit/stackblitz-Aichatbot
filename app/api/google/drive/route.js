// app/api/google/drive/route.js
// ✅ CRITICAL FIX: Matching callback URL with the actual route

import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🔐 Initiating Google Drive OAuth flow...')
    
    // ✅ FIXED: Callback URL now matches app/api/google/callback/route.js
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_URL}/api/google/callback`
    )

    // Request both read and file access scopes
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]

    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      prompt: 'consent' // Force consent screen to get refresh token
    })

    console.log('✅ Redirecting to Google OAuth consent screen')
    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('❌ OAuth initiation error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/?error=oauth_failed&details=${encodeURIComponent(error.message)}`
    )
  }
}
