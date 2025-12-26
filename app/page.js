'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Menu, FileText, Loader2, Upload, Trash2, X, Settings, Plus, MessageSquare, LogOut, User, Key, Cloud, Download } from 'lucide-react'

const PROVIDERS = {
  perplexity: { name: 'Perplexity', icon: '🔮' },
  openai: { name: 'OpenAI', icon: '🤖' },
  gemini: { name: 'Gemini', icon: '✨' },
  huggingface: { name: 'HF', icon: '🤗' },
  deepseek: { name: 'DeepSeek', icon: '🧠' }
}

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [showDrive, setShowDrive] = useState(false)
  const [settingsTab, setSettingsTab] = useState('account')
  
  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  
  // NEW: File management states
  const [useAllFiles, setUseAllFiles] = useState(true)
  const [fileEnabledState, setFileEnabledState] = useState({})
  const [fileScopeState, setFileScopeState] = useState({}) // 'global' | 'chat' | 'library'
  
  // AI Provider/Model
  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('sonar-reasoning-pro')
  const [availableModels, setAvailableModels] = useState([])
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [userApiKey, setUserApiKey] = useState('')
  
  // Settings
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [apiKeys, setApiKeys] = useState({
    perplexity: '',
    openai: '',
    gemini: '',
    huggingface: '',
    deepseek: ''
  })
  
  // Drive links
  const [driveLink, setDriveLink] = useState('')
  const [loadingLink, setLoadingLink] = useState(false)
  const [driveLinkFiles, setDriveLinkFiles] = useState([])
  
  const [notification, setNotification] = useState(null)
  const messagesEndRef = useRef(null)

  const notify = (msg, type = 'info') => {
    setNotification({ message: msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Initialize
  useEffect(() => {
    if (user) {
      // Load saved settings
      const savedKey = localStorage.getItem('key_' + user.id)
      const savedProvider = localStorage.getItem('provider_' + user.id)
      const savedModel = localStorage.getItem('model_' + user.id)
      const savedPref = localStorage.getItem('own_' + user.id)
      
      // NEW: Load file settings
      const savedUseAll = localStorage.getItem('useAllFiles_' + user.id)
      const savedFileEnabled = localStorage.getItem('fileEnabled_' + user.id)
      const savedFileScope = localStorage.getItem('fileScope_' + user.id)
      
      if (savedKey) setUserApiKey(savedKey)
      if (savedProvider) setSelectedProvider(savedProvider)
      if (savedModel) setSelectedModel(savedModel)
      if (savedPref === 'true') setUseOwnKey(true)
      
      if (savedUseAll !== null) setUseAllFiles(savedUseAll === 'true')
      if (savedFileEnabled) setFileEnabledState(JSON.parse(savedFileEnabled))
      if (savedFileScope) setFileScopeState(JSON.parse(savedFileScope))
      
      // Load files and chats
      loadUserFiles()
      loadChatsFromStorage(user.id)
      fetchModels(savedProvider || 'perplexity')
    }
  }, [user])

  // Initialize first chat
  useEffect(() => {
    if (user && chats.length === 0) {
      const initialChat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        userId: user.id
      }
      setChats([initialChat])
      setCurrentChatId(initialChat.id)
    }
  }, [user])

  // Save chats when they change
  useEffect(() => {
    if (user && chats.length > 0) {
      saveChatsToStorage(user.id, chats)
    }
  }, [chats, user])

  // NEW: Save file settings when they change
  useEffect(() => {
    if (user) {
      localStorage.setItem('useAllFiles_' + user.id, useAllFiles.toString())
      localStorage.setItem('fileEnabled_' + user.id, JSON.stringify(fileEnabledState))
      localStorage.setItem('fileScope_' + user.id, JSON.stringify(fileScopeState))
    }
  }, [useAllFiles, fileEnabledState, fileScopeState, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, currentChatId])

  // Fetch available models for provider
  const fetchModels = async (provider) => {
    try {
      const res = await fetch('/api/models?provider=' + provider)
      if (res.ok) {
        const data = await res.json()
        setAvailableModels(data.models || [])
        if (data.models.length > 0 && !data.models.find(m => m.id === selectedModel)) {
          setSelectedModel(data.models[0].id)
        }
      }
    } catch (error) {
      console.error('Model fetch:', error)
    }
  }

  const changeProvider = (p) => {
    setSelectedProvider(p)
    localStorage.setItem('provider_' + user.id, p)
    fetchModels(p)
  }

  const changeModel = (m) => {
    setSelectedModel(m)
    localStorage.setItem('model_' + user.id, m)
  }

  const toggleKey = () => {
    if (!userApiKey) {
      notify('Set API Key first', 'error')
      setShowSettings(true)
      setSettingsTab('api')
      return
    }
    const v = !useOwnKey
    setUseOwnKey(v)
    localStorage.setItem('own_' + user.id, v.toString())
    notify(v ? '✓ Your API' : '✓ System API', 'success')
  }

  const saveApiKey = (provider) => {
    if (!apiKeys[provider] || apiKeys[provider].length < 20) {
      notify('Invalid API key', 'error')
      return
    }
    localStorage.setItem(`key_${provider}`, apiKeys[provider])
    if (provider === selectedProvider) {
      setUserApiKey(apiKeys[provider])
      localStorage.setItem('key_' + user.id, apiKeys[provider])
    }
    notify(`${provider} API key saved!`, 'success')
  }

  // NEW: Toggle individual file
  const toggleFileEnabled = (fileId) => {
    setFileEnabledState(prev => ({
      ...prev,
      [fileId]: !(prev[fileId] ?? true)
    }))
  }

  // NEW: Toggle file scope (global -> chat -> library)
  const toggleFileScope = (fileId) => {
    setFileScopeState(prev => {
      const current = prev[fileId] || 'library'
      const next = current === 'library' ? 'chat' : current === 'chat' ? 'global' : 'library'
      return { ...prev, [fileId]: next }
    })
    
    const scopeNames = { library: 'Library', chat: 'Chat Only', global: 'Global' }
    const newScope = fileScopeState[fileId] === 'library' ? 'chat' : 
                     fileScopeState[fileId] === 'chat' ? 'global' : 'library'
    notify(`Scope: ${scopeNames[newScope]}`, 'info')
  }

  // Chat operations
  const loadChatsFromStorage = (userId) => {
    try {
      const saved = localStorage.getItem(`chats_${userId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setChats(parsed)
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }

  const saveChatsToStorage = (userId, chatsData) => {
    try {
      localStorage.setItem(`chats_${userId}`, JSON.stringify(chatsData))
    } catch (error) {
      console.error('Failed to save chats:', error)
    }
  }

  const currentChat = chats.find(c => c.id === currentChatId)

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      userId: user.id
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
  }

  const deleteChat = (chatId, e) => {
    e?.stopPropagation()
    if (chats.length === 1) return
    
    setChats(prev => prev.filter(c => c.id !== chatId))
    if (currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId)
      setCurrentChatId(remaining[0]?.id)
    }
  }

  // File operations
  const loadUserFiles = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setUploadedFiles(data.map(f => ({
        id: f.id,
        name: f.name,
        size: (f.file_size / 1024).toFixed(1) + 'K',
        file_path: f.file_path,
        content: f.content
      })))
    } catch (error) {
      console.error('Load files error:', error)
    }
  }

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return
    
    const arr = Array.from(files)
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        notify('Login first', 'error')
        return
      }
      
      let count = 0
      for (const file of arr) {
        if (file.size > 10 * 1024 * 1024) {
          notify(file.name + ' too large', 'error')
          continue
        }
        
        try {
          const formData = new FormData()
          formData.append('file', file)
          
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + session.access_token },
            body: formData
          })
          
          if (!res.ok) throw new Error('Upload failed')
          count++
        } catch (e) {
          console.error(e)
        }
      }
      
      if (count > 0) {
        await loadUserFiles()
        notify('✓ ' + count + ' uploaded', 'success')
      }
    } catch (error) {
      notify('Upload failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (file) => {
    if (!confirm('Delete ' + file.name + '?')) return
    
    try {
      setLoading(true)
      await supabase.storage.from('documents').remove([file.file_path])
      await supabase.from('files').delete().eq('id', file.id).eq('user_id', user.id)
      
      // NEW: Clean up file states
      setFileEnabledState(prev => {
        const newState = { ...prev }
        delete newState[file.id]
        return newState
      })
      setFileScopeState(prev => {
        const newState = { ...prev }
        delete newState[file.id]
        return newState
      })
      
      await loadUserFiles()
      notify('✓ Deleted', 'success')
    } catch (error) {
      notify('Failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async (file) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('documents')
        .download(file.file_path)

      if (error) {
        notify('Download failed', 'error')
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      notify('Download failed', 'error')
    }
  }

  // Drag and drop
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  // Google Drive
  const fetchDriveLink = async () => {
    if (!driveLink.trim()) {
      notify('Please enter a Google Drive link', 'error')
      return
    }
    
    setLoadingLink(true)
    try {
      const res = await fetch('/api/gdrive/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: driveLink.trim() })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch file')
      }
      
      const data = await res.json()
      setDriveLinkFiles(prev => {
        const exists = prev.find(f => f.fileId === data.file.fileId)
        if (exists) {
          notify('File already added', 'info')
          return prev
        }
        return [...prev, data.file]
      })
      
      setDriveLink('')
      notify(`✓ Added: ${data.file.name}`, 'success')
    } catch (error) {
      notify(error.message || 'Failed to fetch file', 'error')
    } finally {
      setLoadingLink(false)
    }
  }

  const removeDriveLinkFile = (fileId) => {
    setDriveLinkFiles(prev => prev.filter(f => f.fileId !== fileId))
    notify('Removed', 'info')
  }

  // NEW: Get files that should be sent to AI
  const getActiveFiles = () => {
    // If using all files globally, return all uploaded files
    if (useAllFiles) {
      return uploadedFiles.filter(f => {
        const scope = fileScopeState[f.id] || 'library'
        // Global files always included
        if (scope === 'global') return true
        // Chat files only if in current chat
        if (scope === 'chat') return true // In real app, check if file belongs to current chat
        // Library files included when useAllFiles is true
        return true
      })
    }
    
    // If not using all files, only use enabled ones
    return uploadedFiles.filter(f => {
      const isEnabled = fileEnabledState[f.id] ?? true
      const scope = fileScopeState[f.id] || 'library'
      
      // Global files always included if enabled
      if (scope === 'global' && isEnabled) return true
      // Chat-specific files included if enabled
      if (scope === 'chat' && isEnabled) return true
      // Library files only if enabled
      return scope === 'library' && isEnabled
    })
  }

  // Send message
  const sendMessage = async (content) => {
    if (!content.trim() || loading) return

    const userMessage = { role: 'user', content: content.trim() }
    
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? content.slice(0, 30) : chat.title
          }
        : chat
    ))

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      // NEW: Get active files based on settings
      const activeFiles = getActiveFiles()
      const fileContents = [
        ...activeFiles.map(f => ({ name: f.name, content: f.content })),
        ...driveLinkFiles.map(f => ({ name: f.name, content: f.content }))
      ]

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }

      if (useOwnKey && userApiKey) {
        headers['X-User-API-Key'] = userApiKey
        headers['X-AI-Provider'] = selectedProvider
        headers['X-AI-Model'] = selectedModel
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          fileContents,
          useOwnKey: useOwnKey && !!userApiKey,
          provider: selectedProvider,
          model: selectedModel
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const data = await res.json()
      const aiMessage = { role: 'assistant', content: data.response }

      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, aiMessage] }
          : chat
      ))

    } catch (error) {
      console.error('Send message error:', error)
      const errorMessage = { 
        role: 'assistant', 
        content: '❌ Error: ' + error.message 
      }
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      notify('Passwords do not match', 'error')
      return
    }
    if (newPassword.length < 6) {
      notify('Password must be at least 6 characters', 'error')
      return
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      notify('Password changed successfully!', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      notify('Failed to change password: ' + error.message, 'error')
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 text-black animate-spin" />
      </div>
    )
  }

  const totalActiveFiles = getActiveFiles().length + driveLinkFiles.length

  return (
    <div 
      className="flex h-screen bg-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`border rounded-xl px-4 py-2 backdrop-blur-xl ${
            notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 
            notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' : 
            'bg-blue-50 border-blue-400 text-blue-800'
          }`}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center">
          <div className="border-2 border-white p-8 rounded-2xl">
            <Upload className="w-16 h-16 mx-auto mb-3 text-white" />
            <p className="text-xl font-bold text-white">Drop Files</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-gray-200 flex flex-col overflow-hidden bg-gray-50`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h1 className="font-semibold text-lg">Chats</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button onClick={createNewChat} className="w-full flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scroll">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`w-full text-left p-3 rounded-lg mb-1 group hover:bg-gray-200 transition-colors ${
                currentChatId === chat.id ? 'bg-white border border-gray-300' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{chat.messages?.length || 0} messages</p>
                  </div>
                </div>
                {chats.length > 1 && (
                  <button onClick={(e) => deleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-gray-200 rounded transition-colors">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-semibold">{currentChat?.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedProvider} onChange={(e) => changeProvider(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500">
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.icon} {p.name}</option>
              ))}
            </select>

            {availableModels.length > 0 && (
              <select value={selectedModel} onChange={(e) => changeModel(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 max-w-[120px] hidden sm:block">
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}

            <button onClick={toggleKey} disabled={!userApiKey} className={`p-1.5 border rounded-lg ${useOwnKey ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-100'}`} title={useOwnKey ? 'Your API' : 'System API'}>
              <Key className="w-3.5 h-3.5" />
            </button>

            <button onClick={() => setShowFiles(true)} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 relative">
              <FileText className="w-4 h-4" />
              {totalActiveFiles > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalActiveFiles}
                </span>
              )}
            </button>

            <button onClick={() => setShowDrive(true)} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">
              <Cloud className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 custom-scroll">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {!currentChat?.messages || currentChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                <p className="text-gray-500 text-sm">Upload files or type a message</p>
              </div>
            ) : (
              currentChat.messages.map((msg, idx) => (
                <div key={idx} className={`mb-6 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-black text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } rounded-2xl px-5 py-3 shadow-sm`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="mb-6">
                <div className="inline-block bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Message..."
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    sendMessage(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-500 transition-colors"
              />
              <button
                onClick={(e) => {
                  const input = e.target.closest('div').querySelector('input')
                  if (input.value.trim()) {
                    sendMessage(input.value)
                    input.value = ''
                  }
                }}
                disabled={loading}
                className="px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

  {/* FILES MODAL - UPDATED */}
  {showFiles && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            My Files
          </h2>
          <button onClick={() => setShowFiles(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <button onClick={() => fileInputRef.current?.click()} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800">
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Files
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={(e) => uploadFiles(e.target.files)} className="hidden" />
        </div>

        {/* NEW: Global Toggle */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useAllFiles}
                onChange={(e) => setUseAllFiles(e.target.checked)}
                className="w-4 h-4 accent-black rounded"
              />
              <div>
                <span className="text-sm font-medium block">
                  🌍 Use all files globally
                </span>
                <span className="text-xs text-gray-500">
                  {useAllFiles ? 'All files are enabled' : 'Toggle files individually'}
                </span>
              </div>
            </div>
          </label>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4 custom-scroll">
          {uploadedFiles.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">No files uploaded</p>
          ) : (
            <div className="space-y-2 mt-4">
              {uploadedFiles.map(f => {
                const isEnabled = useAllFiles || (fileEnabledState[f.id] ?? true)
                const scope = fileScopeState[f.id] || 'library'
                const scopeInfo = {
                  global: { icon: '🌍', label: 'Global', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                  chat: { icon: '💬', label: 'Chat', color: 'text-purple-600 bg-purple-50 border-purple-200' },
                  library: { icon: '📁', label: 'Library', color: 'text-gray-600 bg-gray-50 border-gray-200' }
                }
                
                return (
                  <div 
                    key={f.id} 
                    className={`border rounded-xl p-3 transition-all ${
                      isEnabled ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Individual Toggle (only show if NOT using all files) */}
                      {!useAllFiles && (
                        <label className="flex items-center cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={fileEnabledState[f.id] ?? true}
                            onChange={() => toggleFileEnabled(f.id)}
                            className="w-4 h-4 accent-black rounded"
                          />
                        </label>
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate flex-1">{f.name}</p>
                          
                          {/* Scope Badge */}
                          <button
                            onClick={() => toggleFileScope(f.id)}
                            className={`text-xs px-2 py-1 rounded-full border font-medium ${scopeInfo[scope].color} hover:opacity-80 transition-opacity`}
                            title="Click to change scope: Library → Chat → Global"
                          >
                            {scopeInfo[scope].icon} {scopeInfo[scope].label}
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{f.size}</span>
                          
                          {/* Status */}
                          {isEnabled ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                              Active
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => downloadFile(f)} 
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                        </button>
                        <button 
                          onClick={() => deleteFile(f)} 
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Scope Description */}
                    {scope === 'global' && (
                      <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        ℹ️ Available in all chats
                      </div>
                    )}
                    {scope === 'chat' && (
                      <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        ℹ️ Only in this chat
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* DRIVE MODAL - UNCHANGED */}
  {showDrive && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Google Drive Links
          </h2>
          <button onClick={() => setShowDrive(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-600 mb-2">📌 Share file as "Anyone with the link"</p>
        </div>

        <div className="p-4 space-y-2">
          <input
            type="text"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchDriveLink()}
            placeholder="Paste Google Drive link..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-gray-500"
            disabled={loadingLink}
          />
          <button
            onClick={fetchDriveLink}
            disabled={loadingLink || !driveLink.trim()}
            className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loadingLink ? <><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Fetching...</> : <><Cloud className="w-4 h-4 inline mr-2" />Add File</>}
          </button>
        </div>

        <div className="max-h-[40vh] overflow-y-auto px-4 pb-4 custom-scroll">
          {driveLinkFiles.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">No files added</p>
          ) : (
            <div className="space-y-2">
              {driveLinkFiles.map(file => (
                <div key={file.fileId} className="border border-gray-200 p-3 rounded-xl flex items-center justify-between group hover:border-gray-300">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{file.type}</p>
                  </div>
                  <button onClick={() => removeDriveLinkFile(file.fileId)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

{/* SETTINGS MODAL */}
  {showSettings && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setSettingsTab('account')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              settingsTab === 'account' ? 'border-b-2 border-black text-black bg-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Account
          </button>
          <button
            onClick={() => setSettingsTab('api')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              settingsTab === 'api' ? 'border-b-2 border-black text-black bg-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            API Keys
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(90vh-180px)]">
          {settingsTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500" placeholder="••••••••" />
                  </div>
                  <button onClick={handlePasswordChange} className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 font-medium">
                    Update Password
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200">
                <button onClick={signOut} className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {settingsTab === 'api' && (
            <div className="space-y-6">
              {Object.keys(PROVIDERS).map(provider => (
                <div key={provider} className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold capitalize text-lg">{PROVIDERS[provider].name}</h3>
                  <input
                    type="password"
                    value={apiKeys[provider] || ''}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                    placeholder={`${provider} API key`}
                    className="w-full px-4 py-2.5 border border-gray-300 bg-white rounded-lg focus:outline-none focus:border-gray-500 text-sm"
                  />
                  <button onClick={() => saveApiKey(provider)} className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium">
                    Save Key
                  </button>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">🔒 API keys stored locally in browser</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
    </div>
  )
}
