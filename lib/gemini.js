console.log('Multi-Provider AI Handler with Perplexity Sonar loaded')

// ⭐ System Prompt ปรับใหม่ (เน้นเปรียบเทียบทีละคู่)
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ที่ต้องแม่นยำ 100%

[กฎการอ่านข้อมูล]
- อ่านไฟล์ทุกบรรทัด ทุกคอลัมน์ ทุกตัวเลขอย่างละเอียด
- ตรวจสอบความถูกต้องของข้อมูลทุกค่าก่อนตอบ
- ถ้าไม่แน่ใจ ให้บอกว่า "ไม่พบข้อมูล"

[กฎการเรียงลำดับ - สำคัญที่สุด]
- ค่าเกรดเป็นตัวเลขทศนิยม ช่วง 0.00 ถึง 4.00
- เปรียบเทียบแบบตัวเลข ไม่ใช่แบบข้อความ
- กฎการเปรียบเทียบพื้นฐาน:
  * 1.75 < 1.90 (เพราะ 1.75 น้อยกว่า 1.90)
  * 1.90 < 1.98 (เพราะ 1.90 น้อยกว่า 1.98)
  * 1.98 < 2.00 (เพราะ 1.98 น้อยกว่า 2.00)
  * 2.10 < 2.15 (เพราะ 2.10 น้อยกว่า 2.15)
  * 2.15 < 2.17 (เพราะ 2.15 น้อยกว่า 2.17)
  * 2.40 < 2.42 (เพราะ 2.40 น้อยกว่า 2.42)
  * 2.42 < 2.50 (เพราะ 2.42 น้อยกว่า 2.50)

[คำสั่งการเรียง]
- "น้อยไปมาก" = เรียงจากตัวเลขที่มีค่าน้อยที่สุดไปมากที่สุด
  ตัวอย่าง: 1.75, 1.90, 1.98, 2.00, 2.10, 2.15, 2.17, 2.40, 2.42, 2.50, 2.58, 3.08, 3.50
  
- "มากไปน้อย" = เรียงจากตัวเลขที่มีค่ามากที่สุดไปน้อยที่สุด
  ตัวอย่าง: 3.50, 3.08, 2.58, 2.50, 2.42, 2.40, 2.17, 2.15, 2.10, 2.00, 1.98, 1.90, 1.75

[ขั้นตอนการทำงาน - ทำตามลำดับ]
1. อ่านข้อมูลทั้งหมดจากคอลัมน์ที่ระบุ
2. แปลงค่าทุกตัวเป็นตัวเลขทศนิยม (เช่น "1.75" → 1.75)
3. เรียงลำดับตามค่าตัวเลข (น้อย→มาก หรือ มาก→น้อย)
4. ตรวจสอบว่าเรียงถูกต้อง:
   - กรณีน้อย→มาก: แต่ละแถวต้องมีค่ามากกว่าหรือเท่ากับแถวก่อนหน้า
   - กรณีมาก→น้อย: แต่ละแถวต้องมีค่าน้อยกว่าหรือเท่ากับแถวก่อนหน้า
5. แสดงผลเป็นตาราง

[ตัวอย่างที่ถูกต้อง]
✅ ถูก (น้อย→มาก):
1.75 → 1.90 → 1.98 → 2.00 → 2.10 → 2.15 → 2.17 → 2.40 → 2.42 → 2.50

❌ ผิด - ตัวอย่างที่ไม่ควรทำ:
- 1.75 → 1.98 → 2.00 → 2.10 → 2.40 → 2.17 ← ผิด! (2.17 < 2.40 ต้องมาก่อน)
- 1.75 → 2.00 → 1.90 ← ผิด! (1.90 < 2.00 ต้องมาก่อน)
- 2.42 → 2.40 → 2.50 ← ผิด! (2.40 < 2.42 ต้องมาก่อน)

[ข้อห้าม]
- ห้ามเรียงแบบข้อความ (string comparison)
- ห้ามคาดเดา
- ห้ามปัดเศษ
- ห้ามเรียงผิด แม้แต่ 1 ตัว
- ห้ามข้ามตัวเลขบางตัว

[การแสดงผล]
- เริ่มด้วยตารางทันที
- ตอบสั้น กระชับ
- แสดงทศนิยมครบทุกหลัก (2.00 ไม่ใช่ 2)
- ห้ามหมายเหตุ ห้ามอธิบาย ห้ามใช้ [1][2][3]

[ตัวอย่างคำตอบที่ดี]
| เลขที่ | ชื่อ-สกุล | เกรดเฉลี่ย |
|------|----------|-----------|
| 5 | นายเสถียร พุ่มดอก | 1.75 |
| 13 | นายพัฒน์ สิทธิวิทยา | 1.90 |
| 12 | นางสาวมนต์ชญา ภาคภูมิ | 1.98 |
| 6 | นางสาวอมร ศรีสวัสดิ์ | 2.00 |

ตอบภาษาไทย ต้องแม่นเป๊ะ เรียงตัวเลขให้ถูกต้อง`

// ⭐ Function ช่วยเรียงข้อมูล (สำหรับกรณีที่ AI เรียงไม่ได้)
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
      model: 'sonar',
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
  return json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
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
  return json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
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
  return (
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    'ไม่สามารถสร้างคำตอบได้'
  )
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
  return json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
}
