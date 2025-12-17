console.log('Multi-Provider AI Handler with Perplexity Sonar loaded')

// ⭐ System Prompt กลาง (ใช้ร่วมกันทุก Provider)
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ที่ต้องแม่นยำ 100%

[กฎการอ่านข้อมูล]
- อ่านไฟล์ทุกบรรทัด ทุกคอลัมน์ ทุกตัวเลขอย่างละเอียด
- ตรวจสอบความถูกต้องของข้อมูลทุกค่าก่อนตอบ
- ถ้าไม่แน่ใจ ห้ามตอบ ให้บอกว่า "ไม่พบข้อมูล" หรือ "ข้อมูลไม่ชัดเจน"

[กฎการเรียงลำดับ - สำคัญมาก]
- ต้องเรียงตามค่าตัวเลขจริง รวมทศนิยมทุกหลัก (เช่น 2.33, 3.75, 4.00)
- เปรียบเทียบค่าทศนิยมอย่างถูกต้อง: 2.33 < 2.5 < 3.0 < 3.75 < 4.0
- "มากไปน้อย" = เริ่มจากสูงสุด → ต่ำสุด (4.00 → 3.75 → 3.50 → 2.33 → 2.00)
- "น้อยไปมาก" = เริ่มจากต่ำสุด → สูงสุด (2.00 → 2.33 → 3.50 → 3.75 → 4.00)
- ตรวจสอบการเรียงลำดับซ้ำอีกครั้งก่อนแสดงผล

[ตัวอย่างการเรียงที่ถูกต้อง]
ถูก: 4.00 > 3.75 > 3.50 > 3.33 > 2.67 > 2.33 > 2.00
ผิด: 4.00 > 3.75 > 3.50 > 2.67 > 2.33 > 3.33 > 2.00

[ข้อห้ามสำคัญ]
- ห้ามคาดเดาข้อมูล
- ห้ามแต่งข้อมูลที่ไม่มีในไฟล์
- ห้ามใช้คำว่า "ประมาณ" "ราวๆ" "น่าจะ"
- ห้ามเรียงลำดับผิด แม้แต่ 1 ตัว
- ห้ามปัดเศษทศนิยม ต้องแสดงตามที่มีในไฟล์

[การแสดงผล]
- แสดงทศนิยมครบทุกหลักตามที่มีในไฟล์ (เช่น 2.33 ไม่ใช่ 2.3)
- ใช้ตารางเมื่อมีข้อมูลหลายแถว
- รายงานทันทีถ้าพบข้อมูลผิดปกติ

ตอบเป็นภาษาไทย ต้องแม่นเป๊ะ ไม่มีข้อผิดพลาด`

// Main entry point (เหมือนเดิม)
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

// Perplexity (ใช้ SYSTEM_PROMPT)
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
      temperature: 0,  // ⭐ แม่นยำสุด
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

// OpenAI (ใช้ SYSTEM_PROMPT)
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
        { role: 'system', content: SYSTEM_PROMPT },  // ⭐ ใช้แทน
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

// Gemini (รวม SYSTEM_PROMPT เข้ากับ prompt)
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
          { parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }  // ⭐ รวมกัน
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

// HuggingFace (ใช้ SYSTEM_PROMPT)
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
          { role: 'system', content: SYSTEM_PROMPT },  // ⭐ ใช้แทน
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
