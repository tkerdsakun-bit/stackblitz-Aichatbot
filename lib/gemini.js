console.log('Multi-Provider AI Handler with Perplexity Sonar loaded')

// ⭐ ฟังก์ชันลบ <think> tag
function removeThinkTags(text) {
  if (!text) return text
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

// ⭐ System Prompt (ใช้ตามที่คุณมีอยู่)
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ที่ต้องแม่นยำ 100%

[กฎการอ่านข้อมูล]
- อ่านไฟล์ทุกบรรทัด ทุกคอลัมน์ ทุกตัวเลขอย่างละเอียด
- ตรวจสอบความถูกต้องของข้อมูลทุกค่าก่อนตอบ
- ถ้าไม่แน่ใจ ให้ตอบว่า "ไม่พบข้อมูล" หรือ "ข้อมูลไม่ชัดเจน"

[วิธีเรียงลำดับ (ทำทีละขั้นตอน)]
เมื่อได้รับคำสั่งที่มีคำว่า "เรียงน้อยไปมาก" หรือ "เรียงมากไปน้อย" ให้ปฏิบัติดังนี้ทุกครั้ง:

ขั้นที่ 1: ดึงข้อมูลจากคอลัมน์ที่ระบุ
- ระบุคอลัมน์ตัวเลขที่จะใช้เรียงลำดับ เช่น "เกรดเฉลี่ย"
- ดึงค่าตัวเลขทั้งหมดจากคอลัมน์นั้นออกมา

ขั้นที่ 2: สร้างรายการตัวเลข
- สร้างลิสต์ของค่าตัวเลขทั้งหมดจากข้อมูล เช่น
  1.75, 1.90, 1.98, 2.00, 2.10, 2.15, 2.17, 2.40, 2.42, 2.50, 2.58, 3.08, 3.50

ขั้นที่ 3: เรียงตัวเลขอย่างเป็นขั้นตอน
- เปรียบเทียบแบบตัวเลข (numeric) ไม่ใช่แบบตัวอักษร (string)
- เปรียบเทียบทีละคู่ เช่น
  - 1.75 กับ 1.90 → 1.75 น้อยกว่า → 1.75 มาก่อน
  - 1.90 กับ 1.98 → 1.90 น้อยกว่า → 1.90 มาก่อน
  - 1.98 กับ 2.00 → 1.98 น้อยกว่า → 1.98 มาก่อน
- ทำต่อจนครบทุกค่าในรายการ
- ถ้าเป็น "น้อยไปมาก" ให้เรียงจากค่าต่ำสุดไปค่าสูงสุด
- ถ้าเป็น "มากไปน้อย" ให้เรียงจากค่าสูงสุดไปค่าต่ำสุด

ขั้นที่ 4: จับคู่กลับกับข้อมูลต้นฉบับ
- นำค่าตัวเลขที่เรียงแล้วไปจับคู่กับแถวข้อมูลเดิม (เลขที่, ชื่อ-สกุล, ฯลฯ)
- จัดลำดับแถวใหม่ให้ตรงตามลำดับค่าตัวเลขที่เรียงไว้

ขั้นที่ 5: แสดงผลตามลำดับที่เรียงแล้ว
- แสดงผลในรูปแบบตารางตามลำดับใหม่
- ตรวจสอบอีกครั้งว่าลำดับในตารางสอดคล้องกับรายการตัวเลขที่เรียงแล้ว

[ตัวอย่างการทำงาน]
ข้อมูลเดิม:
- เลขที่ 13: 1.90
- เลขที่ 6: 2.00
- เลขที่ 12: 1.98
- เลขที่ 5: 1.75

ลำดับที่ถูกต้อง (น้อย → มาก):
1. 1.75 → เลขที่ 5
2. 1.90 → เลขที่ 13
3. 1.98 → เลขที่ 12
4. 2.00 → เลขที่ 6

[หลักการเปรียบเทียบตัวเลข]
- ค่าในช่วง 1.XX น้อยกว่าช่วง 2.XX เสมอ
- ถ้าหลักหน้าจุดเท่ากัน ให้เปรียบเทียบทศนิยม:
  * 2.10 < 2.15 < 2.17 (10 < 15 < 17)
  * 2.40 < 2.42 < 2.50 (40 < 42 < 50)

[ข้อห้าม]
- ห้ามเรียงแบบตัวอักษร (เช่น มอง "2.10" แค่เป็นข้อความ)
- ห้ามคาดเดาข้อมูลที่ไม่มีในไฟล์
- ห้ามข้ามขั้นตอนการเปรียบเทียบและการตรวจสอบลำดับ
- ห้ามปัดเศษหรือเปลี่ยนค่าทศนิยมจากที่มีในไฟล์

[การแสดงผล]
- แสดงผลเป็นตารางเสมอเมื่อมีหลายแถว เช่น

  | เลขที่ | ชื่อ-สกุล        | เกรดเฉลี่ย |
  |--------|-------------------|-----------|
  | 5      | นายเสถียร พุ่มดอก | 1.75      |
  | 13     | นายพัฒน์ สิทธิวิทยา | 1.90      |

- ตอบเป็นภาษาไทย
- ใช้ถ้อยคำสั้น กระชับ ตรงประเด็น
- ห้ามใส่หมายเหตุหรือคำอธิบายยาว ๆ เพิ่มจากที่จำเป็น`

// ฟังก์ชัน sortDataBefore (ตามเดิม)
function sortDataBefore(fileContents, columnName = 'เกรดเฉลี่ย', order = 'asc') {
  try {
    return fileContents.map(file => {
      const lines = file.content.split('\n')
      if (lines.length < 2) return file

      const headers = lines[0].split(/[,\t]/)
      const columnIndex = headers.findIndex(h => h.includes(columnName))
      if (columnIndex === -1) return file

      const header = lines[0]
      const dataLines = lines.slice(1).filter(line => line.trim())

      const data = dataLines.map(line => {
        const values = line.split(/[,\t]/)
        const gradeValue = parseFloat(values[columnIndex])
        return {
          line: line,
          grade: isNaN(gradeValue) ? -1 : gradeValue
        }
      })

      data.sort((a, b) => {
        if (order === 'asc') return a.grade - b.grade
        return b.grade - a.grade
      })

      const sortedContent = header + '\n' + data.map(d => d.line).join('\n')

      return {
        ...file,
        content: sortedContent,
        sorted: true
      }
    })
  } catch (error) {
    console.error('Sort error:', error)
    return fileContents
  }
}

// Main entry point
export async function chatWithAI(
  message,
  fileContents = [],
  userApiKey = null,
  provider = 'perplexity',
  autoSort = false
) {
  try {
    console.log('Using provider: ' + provider)
    console.log('Using ' + (userApiKey ? 'user' : 'system') + ' API key')

    let processedFiles = fileContents
    if (autoSort || /เรียง|จัดอันดับ|น้อยไปมาก|มากไปน้อย/i.test(message)) {
      console.log('Auto-sorting detected')
      const order = /มากไปน้อย|สูงสุด/i.test(message) ? 'desc' : 'asc'
      processedFiles = sortDataBefore(fileContents, 'เกรดเฉลี่ย', order)
    }

    let context = ''
    if (processedFiles.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\n\n'
      processedFiles.forEach((file, index) => {
        const shortContent = (file.content || '').substring(0, 10000)
        const isTruncated = (file.content || '').length > 10000
        context +=
          'ไฟล์ที่ ' +
          (index + 1) +
          ': ' +
          file.name +
          (file.sorted ? ' (เรียงแล้ว)' : '') +
          '\n' +
          shortContent
        if (isTruncated) {
          context += '\n...(มีเนื้อหาต่ออีก)'
        }
        context += '\n\n'
      })
    }

    const prompt = context
      ? context +
        '\n\nคำถามของผู้ใช้: ' +
        message +
        '\n\nกรุณาตอบเป็นภาษาไทยโดยอิงจากเนื้อหาในไฟล์ด้านบน'
      : 'กรุณาตอบคำถามนี้เป็นภาษาไทย: ' + message

    switch ((provider || 'perplexity').toLowerCase()) {
      case 'perplexity':
        return await callPerplexity(prompt, userApiKey)
      case 'openai':
        return await callOpenAI(prompt, userApiKey)
      case 'gemini':
        return await callGemini(prompt, userApiKey)
      case 'huggingface':
        return await callHuggingFace(prompt, userApiKey)
      default:
        return await callPerplexity(prompt, userApiKey)
    }
  } catch (error) {
    console.error('AI Handler error:', error)
    throw error
  }
}

// Perplexity
async function callPerplexity(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('Missing Perplexity API key')
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-reasoning',  // ⭐ ใช้ reasoning
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Perplexity API error:', text)
    if (res.status === 401 || res.status === 403)
      throw new Error('Invalid Perplexity API Key')
    if (res.status === 429)
      throw new Error('Rate Limit Exceeded')
    throw new Error('Perplexity API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  let content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  
  return removeThinkTags(content)  // ⭐ ลบ <think> tag
}

// OpenAI
async function callOpenAI(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing OpenAI API key')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('OpenAI API error:', text)
    if (res.status === 401) throw new Error('Invalid OpenAI API Key')
    throw new Error('OpenAI API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  let content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  
  return removeThinkTags(content)  // ⭐ ลบ <think> tag
}

// Gemini
async function callGemini(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing Gemini API key')
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' +
      apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('Gemini API error:', text)
    if (res.status === 401 || res.status === 403)
      throw new Error('Invalid Gemini API Key')
    throw new Error('Gemini API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  let content = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถสร้างคำตอบได้'
  
  return removeThinkTags(content)  // ⭐ ลบ <think> tag
}

// HuggingFace
async function callHuggingFace(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error('Missing Hugging Face API key')
  }

  const res = await fetch(
    'https://router.huggingface.co/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('Hugging Face API error:', text)
    if (res.status === 401)
      throw new Error('Invalid Hugging Face API Key')
    throw new Error('Hugging Face API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  let content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  
  return removeThinkTags(content)  // ⭐ ลบ <think> tag
}
