const GEMINI_MODEL = 'gemini-2.0-flash';

export async function generateGeminiText(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      }),
      cache: 'no-store',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Gemini API response:', {
      status: response.status,
      data,
    });

    throw new Error(
      data?.error?.message ||
        `Gemini API request failed with status ${response.status}`
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned no text');
  }

  return text;
}
