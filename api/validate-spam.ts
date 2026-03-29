/**
 * Vercel Serverless Function — /api/validate-spam
 *
 * This runs SERVER-SIDE only. The GROQ_API_KEY is read from Vercel environment
 * variables and is NEVER sent to the browser or included in the JS bundle.
 *
 * The browser calls POST /api/validate-spam with { name, email }.
 * This function calls Groq, then returns { isSpam: boolean }.
 */
export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name = '', email = '' } = req.body || {};

  // Read the key from server-side environment (never sent to the browser)
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set in environment variables');
    // Fail open so a missing key doesn't block legitimate users
    return res.status(200).json({ isSpam: false });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a strict anti-spam validator for the UAE Government.
Analyze the provided Name and Email.

Reply with EXACTLY one word: "true" if it is spam/fake/gibberish, or "false" if it looks valid.

Spam examples: "asd asd", "hhhhh", "test test", "user123", "no name"
Valid examples: "Ahmed Ali", "Sarah Smith", "Mohammad Al-Qasimi"`,
          },
          {
            role: 'user',
            content: `Name: "${name}", Email: "${email}"`,
          },
        ],
        model: 'llama3-8b-8192',
        temperature: 0,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error (${response.status}):`, errorText);
      // Fail open — don't block users if the AI service is down
      return res.status(200).json({ isSpam: false });
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content?.toLowerCase().trim() ?? '';
    const isSpam = content.includes('true');

    console.log(`Spam validation — name="${name}" email="${email}" result=${isSpam}`);
    return res.status(200).json({ isSpam });
  } catch (error) {
    console.error('Spam validation exception:', error);
    // Fail open on network/parse errors
    return res.status(200).json({ isSpam: false });
  }
}
