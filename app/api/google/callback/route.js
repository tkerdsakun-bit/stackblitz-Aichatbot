// app/api/google/callback/route.js
// ✅ CRITICAL FIX: Corrected OAuth callback URL path

import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      console.error('❌ No authorization code received')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/?error=no_code`)
    }

    // ✅ FIXED: Callback URL now matches the actual route location
    // Changed from: /api/auth/google/callback
    // To: /api/google/callback
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_URL}/api/google/callback`
    )

    console.log('🔄 Exchanging authorization code for tokens...')
    const { tokens } = await oauth2Client.getToken(code)
    console.log('✅ Tokens received successfully')

    // Redirect back to home
    const response = NextResponse.redirect(process.env.NEXT_PUBLIC_URL)

    // ✅ Store access token (expires in 1 hour - your security choice)
    response.cookies.set('gdrive_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour - forces re-authentication for security
    })

    // ✅ Store refresh token (if provided - only on first auth)
    if (tokens.refresh_token) {
      console.log('✅ Refresh token received (first-time auth)')
      response.cookies.set('gdrive_refresh', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })
    } else {
      console.log('ℹ️ No refresh token (user already authorized before)')
    }

    console.log('✅ OAuth callback successful - redirecting to home')
    return response

  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/?error=auth_failed&details=${encodeURIComponent(error.message)}`
    )
  }
}
