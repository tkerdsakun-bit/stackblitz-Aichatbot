import { HfInference } from '@huggingface/inference';

console.log('Using Hugging Face Inference API');

// Ensure API key is available from environment variables
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  throw new Error('Missing Hugging Face API key');
}

// Instantiate Hugging Face client
const hf = new HfInference(apiKey);

export async function chatWithAI(message, fileContents = []) {
  try {
    // Build context from files if they exist
    let context = '';
    if (fileContents.length > 0) {
      context = 'Here are the contents of the uploaded files:\n\n';
      fileContents.forEach((file, index) => {
        context += `File ${index + 1}: ${file.name}\n${file.content}\n\n`;
      });
    }

    // Create the prompt based on context and user message
    const prompt = context
      ? `${context}\n\nUser question: ${message}\n\nPlease answer based on the file contents above.`
      : message;

    // Send the prompt to Hugging Face's Llama model
    const result = await hf.textGeneration({
      model: 'meta-llama/Llama-2-7b-chat-hf',
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false
      }
    });

    // Return the response from Hugging Face
    return result.generated_text;
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}
