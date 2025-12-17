console.log('Multi-Provider AI Handler with Perplexity Sonar loaded')

// ⭐ System Prompt แบบสั้น กระชับ ไม่มีหมายเหตุ
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ที่ต้องแม่นยำ 100%

[กฎการอ่านข้อมูล]
- อ่านไฟล์ทุกบรรทัด ทุกคอลัมน์ ทุกตัวเลขอย่างละเอียด
- ตรวจสอบความถูกต้องของข้อมูลทุกค่าก่อนตอบ
- ถ้าไม่แน่ใจ ให้บอกว่า "ไม่พบข้อมูล"

[กฎการเรียงลำดับ]
- ต้องเรียงตามค่าตัวเลขจริง รวมทศนิยมทุกหลัก
- "มากไปน้อย" = สูงสุด → ต่ำสุด (4.00 → 3.75 → 2.33)
- "น้อยไปมาก" = ต่ำสุด → สูงสุด (2.33 → 3.75 → 4.00)
- ตรวจสอบการเรียงซ้ำก่อนแสดงผล

[การแสดงผล - สำคัญมาก]
- ตอบสั้น กระชับ ตรงประเด็น
- ใช้ตารางเสมอเมื่อมีข้อมูล 2 แถวขึ้นไป
- ห้ามเพิ่มหมายเหตุ คำอธิบาย หรือข้อความยืดยาว
- แสดงเฉพาะข้อมูลที่ถามมา ไม่ต้องอธิบายเพิ่ม
- ห้ามใช้ [1][2][3] หรือเลขอ้างอิง

[ข้อห้าม]
- ห้ามคาดเดาข้อมูล
- ห้ามใช้ "ประมาณ" "ราวๆ" "น่าจะ"
- ห้ามเรียงลำดับผิด
- ห้ามปัดเศษทศนิยม
- ห้ามเขียนหมายเหตุหรือคำอธิบาย

[ตัวอย่างคำตอบที่ดี]
| ชื่อ | เกรด |
|------|------|
| นายสมชาย | 3.75 |
| นางสาวสมหญิง | 3.50 |

[ตัวอย่างคำตอบที่ไม่ดี]
"นายสมชาย มีเกรดเฉลี่ย 3.75 ซึ่งสูงกว่า... (หมายเหตุ: ข้อมูลจาก...)"

ตอบภาษาไทย สั้น กระชับ เฉพาะข้อมูลที่ถาม`

// Main entry point
export async function chatWithAI(
  message,
  fileContents = [],
  userApiKey = null,
  provider = 'perplexity'
) {
  try {
    console.log('Using provider: ' + provider)
    console.log('Using ' + (userApiKey ? 'user' : 'system') + ' API key')

    let context = ''
    if (fileContents.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\n\n'
      fileContents.forEach((file, index) => {
        const shortContent = (file.content || '').substring(0, 10000)
        const isTruncated = (file.content || '').length > 10000
        context +=
          'ไฟล์ที่ ' +
          (index + 1) +
          ': ' +
          file.name +
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
