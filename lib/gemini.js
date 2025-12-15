console.log('Using Hugging Face Inference API (Direct)');

const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  throw new Error('Missing Hugging Face API key');
}

export async function chatWithAI(message, fileContents = []) {
  try {
    let context = '';
    if (fileContents.length > 0) {
      context = 'Here are the contents of the uploaded files:\n\n';
      fileContents.forEach((file, index) => {
        context += `File ${index + 1}: ${file.name}\n${file.content}\n\n`;
      });
    }

    const prompt = context
      ? `${context}\n\nUser question: ${message}\n\nPlease answer based on the file contents above.`
      : message;

    // Using Google's Gemma model with NEW router endpoint
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemma-2-2b-it',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 512,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    // Handle OpenAI-style response format
    return result.choices[0].message.content || 'No response generated';
    
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}
