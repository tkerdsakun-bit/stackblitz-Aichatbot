// ========================================
// NEW FILE: app/api/gdrive/parse-link/route.js
// Parse Google Drive shared links without OAuth
// ========================================

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Extract file ID from various Google Drive URL formats
    const fileId = extractFileId(url)
    
    if (!fileId) {
      return NextResponse.json({ 
        error: 'Invalid Google Drive link. Please share the file publicly first.' 
      }, { status: 400 })
    }

    console.log('📎 Extracted File ID:', fileId)

    // Determine file type and fetch content
    const fileData = await fetchPublicFile(fileId)

    return NextResponse.json({
      success: true,
      file: fileData
    })

  } catch (error) {
    console.error('❌ Parse link error:', error)
    
    if (error.message.includes('403')) {
      return NextResponse.json({
        error: 'File not accessible. Make sure it\'s shared as "Anyone with the link can view"'
      }, { status: 403 })
    }

    return NextResponse.json({
      error: error.message || 'Failed to fetch file'
    }, { status: 500 })
  }
}

// ========================================
// Extract File ID from various URL formats
// ========================================
function extractFileId(url) {
  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]

  // Format 2: https://drive.google.com/open?id=FILE_ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match) return match[1]

  // Format 3: https://docs.google.com/document/d/FILE_ID/edit
  match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]

  // Format 4: https://docs.google.com/spreadsheets/d/FILE_ID/edit
  match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]

  // Format 5: https://docs.google.com/presentation/d/FILE_ID/edit
  match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]

  // Format 6: Direct ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    return url
  }

  return null
}

// ========================================
// Fetch public file without OAuth
// ========================================
async function fetchPublicFile(fileId) {
  try {
    // Try to fetch as Google Docs export (most common)
    const docContent = await fetchGoogleDoc(fileId)
    if (docContent) return docContent

    // Try to fetch as Google Sheets
    const sheetContent = await fetchGoogleSheet(fileId)
    if (sheetContent) return sheetContent

    // Try direct download (PDF, TXT, etc.)
    const directContent = await fetchDirectFile(fileId)
    if (directContent) return directContent

    throw new Error('Unable to fetch file. Make sure it\'s publicly shared.')

  } catch (error) {
    throw error
  }
}

// ========================================
// Fetch Google Docs (as plain text)
// ========================================
async function fetchGoogleDoc(fileId) {
  try {
    const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`
    
    const res = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('403: File is not publicly accessible')
      }
      return null
    }

    const text = await res.text()
    
    // Check if it's actually a doc (not an error page)
    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      return null
    }

    console.log('✅ Fetched Google Doc:', text.length, 'chars')

    return {
      name: `Document ${fileId.substring(0, 8)}`,
      content: text,
      type: 'Google Docs',
      fileId: fileId
    }

  } catch (error) {
    console.log('⚠️ Not a Google Doc or not accessible:', error.message)
    return null
  }
}

// ========================================
// Fetch Google Sheets (as CSV)
// ========================================
async function fetchGoogleSheet(fileId) {
  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`
    
    const res = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('403: File is not publicly accessible')
      }
      return null
    }

    const csv = await res.text()
    
    // Check if it's actually a sheet (not an error page)
    if (csv.includes('<!DOCTYPE html>') || csv.includes('<html')) {
      return null
    }

    console.log('✅ Fetched Google Sheet:', csv.length, 'chars')

    return {
      name: `Spreadsheet ${fileId.substring(0, 8)}`,
      content: csv,
      type: 'Google Sheets',
      fileId: fileId
    }

  } catch (error) {
    console.log('⚠️ Not a Google Sheet or not accessible:', error.message)
    return null
  }
}

// ========================================
// Fetch direct files (PDF, TXT, etc.)
// ========================================
async function fetchDirectFile(fileId) {
  try {
    // Try direct download link
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    
    const res = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'follow'
    })

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('403: File is not publicly accessible')
      }
      return null
    }

    const contentType = res.headers.get('content-type') || ''
    
    // Only handle text-based files
    if (contentType.includes('text') || contentType.includes('plain')) {
      const text = await res.text()
      
      console.log('✅ Fetched direct file:', text.length, 'chars')

      return {
        name: `File ${fileId.substring(0, 8)}`,
        content: text,
        type: 'Text File',
        fileId: fileId
      }
    }

    // For PDFs and other binary files
    if (contentType.includes('pdf')) {
      return {
        name: `PDF ${fileId.substring(0, 8)}`,
        content: '[PDF files require OAuth authentication to read content]',
        type: 'PDF',
        fileId: fileId,
        note: 'Cannot read PDF content from public links. Please upload the file directly.'
      }
    }

    return null

  } catch (error) {
    console.log('⚠️ Not a direct downloadable file:', error.message)
    return null
  }
}
