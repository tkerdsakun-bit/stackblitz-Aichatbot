import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Sign up
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })
  if (error) throw error
  return data
}

// Sign in
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Upload file to Supabase Storage (with user folder)
export async function uploadFile(file, fileName, userId) {
  const filePath = `${userId}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data
}

// Save file metadata to database
export async function saveFileMetadata(fileData, userId) {
  const { data, error } = await supabase
    .from('files')
    .insert([{ ...fileData, user_id: userId }])
    .select()

  if (error) throw error
  return data[0]
}

// Get user's files only
export async function getUserFiles(userId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Get file content
export async function getFileContent(filePath) {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath)

  if (error) throw error
  return data
}

// Delete file
export async function deleteFile(id, filePath, userId) {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([filePath])

  if (storageError) throw storageError

  // Delete from database
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (dbError) throw dbError
}