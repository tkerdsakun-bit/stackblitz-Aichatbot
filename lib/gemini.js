console.log('Using Hugging Face Inference API (Direct)');

export async function chatWithAI(message, fileContents = [], userApiKey = null) {
  try {
    const apiKey = userApiKey || process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      throw new Error('Missing Hugging Face API key');
    }

    console.log('Using ' + (userApiKey ? 'user' : 'system') + ' API key');

    let context = '';
    if (fileContents.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\\n\\n';
      fileContents.forEach((file, index) => {
        const shortContent = file.content.substring(0, 10000);
        const isTruncated = file.content.length > 10000;
        context += 'ไฟล์ที่ ' + (index + 1) + ': ' + file.name + '\\n' + shortContent;
        if (isTruncated) {
          context += '\\n...(มีเนื้อหาต่ออีก)';
        }
        context += '\\n\\n';
      });
    }

    const prompt = context
      ? context + '\\n\\nคำถามของผู้ใช้: ' + message + '\\n\\nกรุณาตอบเป็นภาษาไทยโดยอิงจากเนื้อหาในไฟล์ด้านบน'
      : 'กรุณาตอบคำถามนี้เป็นภาษาไทย: ' + message;

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'คุณเป็นผู้ช่วยที่ตอบคำถามเป็นภาษาไทยอย่างชัดเจน'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);

      if (response.status === 401) {
        throw new Error('Invalid API Key - Please check your Hugging Face API key');
      }

      throw new Error('Hugging Face API error (' + response.status + '): ' + errorText);
    }

    const result = await response.json();

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response format from Hugging Face API');
    }

    return result.choices[0].message.content || 'ไม่สามารถสร้างคำตอบได้';

  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}
