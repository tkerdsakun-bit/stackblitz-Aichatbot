'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import React, { useState } from 'react'
import { Upload, Send, FileText, Loader2, Trash2, Sparkles, Database, LogOut, Download, X, AlertCircle, CheckCircle, Menu, Key, Settings } from 'lucide-react'

// AI Provider configurations with models
const AI_PROVIDERS = {
  perplexity: {
    name: 'Perplexity',
    icon: '🔮',
    models: [
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small (Online)' },
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large (Online)' },
      { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge (Online)' }
    ],
    apiKeyUrl: 'https://www.perplexity.ai/settings/api'
  },
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ],
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' }
    ],
    apiKeyUrl: 'https://makersuite.google.com/app/apikey'
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    models: [
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
      { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' }
    ],
    apiKeyUrl: 'https://huggingface.co/settings/tokens'
  },
  deepseek: {
    name: 'DeepSeek',
    icon: '🧠',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
    ],
    apiKeyUrl: 'https://platform.deepseek.com/api_keys'
  }
}

export default function AIChatbot() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState([])
  const [notification, setNotification] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Enhanced BYOK States
  const [userApiKey, setUserApiKey] = useState('')
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInputTemp, setApiKeyInputTemp] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('')

  const chatAreaRef = useRef(null)
  const messagesEndRef = useRef(null)

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH)
    }
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH)
      }
    }
  }, [])

  // Load API Key and settings from localStorage
  useEffect(() => {
    if (user) {
      const savedKey = localStorage.getItem(`ai_api_key_${user.id}`)
      const savedProvider = localStorage.getItem(`ai_provider_${user.id}`)
      const savedModel = localStorage.getItem(`ai_model_${user.id}`)
      const savedPref = localStorage.getItem(`use_own_key_${user.id}`)

      if (savedKey) {
        setUserApiKey(savedKey)
        setApiKeyInputTemp(savedKey)
      }
      if (savedProvider) {
        setSelectedProvider(savedProvider)
      }
      if (savedModel) {
        setSelectedModel(savedModel)
      } else if (savedProvider && AI_PROVIDERS[savedProvider]) {
        // Set default model for provider
        setSelectedModel(AI_PROVIDERS[savedProvider].models[0].id)
      }
      if (savedPref === 'true') {
        setUseOwnKey(true)
      }
    }
  }, [user])

  const saveApiKey = () => {
    if (!apiKeyInputTemp.trim()) {
      showNotification('กรุณากรอก API Key', 'error')
      return
    }
    if (apiKeyInputTemp.length < 20) {
      showNotification('API Key ไม่ถูกต้อง', 'error')
      return
    }
    if (!selectedModel) {
      showNotification('กรุณาเลือก Model', 'error')
      return
    }

    localStorage.setItem(`ai_api_key_${user.id}`, apiKeyInputTemp.trim())
    localStorage.setItem(`ai_provider_${user.id}`, selectedProvider)
    localStorage.setItem(`ai_model_${user.id}`, selectedModel)
    localStorage.setItem(`use_own_key_${user.id}`, 'true')

    setUserApiKey(apiKeyInputTemp.trim())
    setUseOwnKey(true)
    setShowApiKeyModal(false)
    showNotification(`✅ บันทึก ${AI_PROVIDERS[selectedProvider].name} API Key สำเร็จ!`, 'success')
  }

  const clearApiKey = () => {
    localStorage.removeItem(`ai_api_key_${user.id}`)
    localStorage.removeItem(`ai_provider_${user.id}`)
    localStorage.removeItem(`ai_model_${user.id}`)
    localStorage.removeItem(`use_own_key_${user.id}`)
    setUserApiKey('')
    setApiKeyInputTemp('')
    setUseOwnKey(false)
    setShowApiKeyModal(false)
    showNotification('ลบ API Key แล้ว', 'info')
  }

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
    // Set default model for new provider
    setSelectedModel(AI_PROVIDERS[provider].models[0].id)
  }

  const toggleUseOwnKey = () => {
    if (!useOwnKey && !userApiKey) {
      setShowApiKeyModal(true)
      return
    }
    const newValue = !useOwnKey
    setUseOwnKey(newValue)
    localStorage.setItem(`use_own_key_${user.id}`, newValue.toString())
    showNotification(
      newValue ? '✅ ใช้ API Key ของคุณ' : 'ใช้ API Key ของระบบ',
      'success'
    )
  }

  const loadUserFiles = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedFiles = data.map(file => ({
        id: file.id,
        name: file.name,
        size: (file.file_size / 1024).toFixed(2) + ' KB',
        uploadedAt: new Date(file.created_at).toLocaleString(),
        file_path: file.file_path,
        file_type: file.file_type,
        content: file.content
      }))

      setUploadedFiles(formattedFiles)
    } catch (error) {
      console.error('Error loading files:', error)
      showNotification('ไม่สามารถโหลดไฟล์ได้', 'error')
    }
  }

  useEffect(() => {
    if (user) {
      loadUserFiles()
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error')
        return
      }

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        if (file.size > MAX_FILE_SIZE) {
          showNotification(`${file.name} ใหญ่เกิน 10 MB`, 'error')
          failCount++
          continue
        }

        setUploadProgress(prev => [...prev, { name: file.name, progress: 0 }])

        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            body: formData
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Upload failed')
          }

          setUploadProgress(prev =>
            prev.map(p =>
              p.name === file.name ? { ...p, progress: 100 } : p
            )
          )
          successCount++
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error)
          showNotification(`${file.name}: ${error.message}`, 'error')
          setUploadProgress(prev => prev.filter(p => p.name !== file.name))
          failCount++
        }
      }

      if (successCount > 0) {
        await loadUserFiles()
        showNotification(`✅ อัปโหลดสำเร็จ ${successCount}/${fileArray.length} ไฟล์`, 'success')
        setIsSidebarOpen(false)
      }
    } catch (error) {
      console.error('Upload error:', error)
      showNotification(`อัปโหลดล้มเหลว: ${error.message}`, 'error')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress([]), 1000)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  useEffect(() => {
    const handlePaste = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      const files = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          files.push(items[i].getAsFile())
        }
      }

      if (files.length > 0) {
        e.preventDefault()
        uploadFiles(files)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [user])

  const handleFileUpload = async (event) => {
    const files = event.target.files
    await uploadFiles(files)
    event.target.value = ''
  }

  const handleDownloadFile = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.file_path, 60)

      if (error) throw error

      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = file.name
      link.click()
      showNotification(`กำลังดาวน์โหลด ${file.name}`, 'success')
    } catch (error) {
      console.error('Download error:', error)
      showNotification('ดาวน์โหลดไม่สำเร็จ', 'error')
    }
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(`ต้องการลบ ${file.name} ใช่หรือไม่?`)) return

    try {
      setLoading(true)

      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.file_path])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      await loadUserFiles()
      showNotification(`ลบ ${file.name} สำเร็จ`, 'success')
    } catch (error) {
      console.error('Delete error:', error)
      showNotification('ลบไฟล์ไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fileContents = uploadedFiles.map(f => ({
        name: f.name,
        content: f.content
      }))

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }

      if (useOwnKey && userApiKey) {
        headers['X-User-API-Key'] = userApiKey
        headers['X-AI-Provider'] = selectedProvider
        headers['X-AI-Model'] = selectedModel
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: userMessage,
          fileContents,
          useOwnKey: useOwnKey && !!userApiKey,
          provider: selectedProvider,
          model: selectedModel
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      let errorMessage = 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      if (error.message.includes('API key') || error.message.includes('Invalid')) {
        errorMessage = '❌ API Key ไม่ถูกต้อง กรุณาตรวจสอบ API Key ของคุณ'
        setShowApiKeyModal(true)
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
      showNotification('ส่งข้อความไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div
      className="flex h-screen bg-black text-white overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
            notification.type === 'success' ? 'bg-green-900 border-green-700' :
            notification.type === 'error' ? 'bg-red-900 border-red-700' :
            'bg-gray-800 border-gray-700'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Enhanced API Key Settings Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">API Settings</h2>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Choose AI Provider</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        selectedProvider === key
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-3xl">{provider.icon}</span>
                      <span className="text-sm font-medium">{provider.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Model ({AI_PROVIDERS[selectedProvider].name})
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AI_PROVIDERS[selectedProvider].models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder={`Enter your ${AI_PROVIDERS[selectedProvider].name} API Key`}
                  value={apiKeyInputTemp}
                  onChange={(e) => setApiKeyInputTemp(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  🔒 Stored locally in your browser only
                </p>
              </div>

              {/* API Key Link */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-300 mb-2">Where to get your API key:</p>
                <a
                  href={AI_PROVIDERS[selectedProvider].apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline break-all"
                >
                  {AI_PROVIDERS[selectedProvider].apiKeyUrl}
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={saveApiKey}
                  disabled={!apiKeyInputTemp.trim() || !selectedModel}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Save API Key
                </button>
                {userApiKey && (
                  <button
                    onClick={clearApiKey}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status */}
              {useOwnKey && userApiKey && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ✓ Using your {AI_PROVIDERS[selectedProvider].name} API ({selectedModel})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold">AI Chat</h1>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* API Status Indicator */}
          <div className="mb-3 px-3 py-2 bg-gray-800 rounded-lg text-xs">
            {useOwnKey && userApiKey ? (
              <span className="text-green-400 flex items-center gap-1">
                🔑 {AI_PROVIDERS[selectedProvider].icon} {AI_PROVIDERS[selectedProvider].name}
                <br />
                <span className="text-gray-400 text-[10px] mt-1">{selectedModel}</span>
              </span>
            ) : (
              <span className="text-gray-400">🤖 System API</span>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mb-3"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">API Settings</span>
          </button>

          {/* Upload Button */}
          <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Upload Files</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 text-center mt-2">Max 10 MB per file</p>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400">Your Files</h2>
            <Database className="w-4 h-4 text-gray-400" />
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files yet</p>
              <p className="text-xs mt-1">Upload files to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{file.size}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-900 hover:bg-red-800 rounded text-xs transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold">AI Chat</h1>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <div className="bg-gray-900 border-b border-gray-800 p-3">
            {uploadProgress.map((file) => (
              <div key={file.name} className="text-xs text-gray-400">
                Uploading {file.name}... {file.progress}%
              </div>
            ))}
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-600/20 border-4 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-30 pointer-events-none">
            <div className="text-center animate-bounce">
              <Upload className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <p className="text-xl font-bold text-white">Drop files here</p>
              <p className="text-sm text-gray-300 mt-2">PDF, Word, Excel, Text (Max 10 MB)</p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div
          ref={chatAreaRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ 
            height: 'calc(var(--vh, 1vh) * 100 - 140px)',
            paddingBottom: '80px'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles className="w-16 h-16 text-blue-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                {useOwnKey && userApiKey ? (
                  <span>🔑 Using your {AI_PROVIDERS[selectedProvider].name} key</span>
                ) : (
                  <span>🤖 Using system API</span>
                )}
              </h2>
              <p className="text-gray-400 mb-6">Upload files and get instant insights</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>💡 Drag & drop files anywhere</p>
                <p>📋 Paste files with Ctrl+V</p>
                <p>📤 Upload multiple files at once</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-800 bg-gray-900 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your files..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
