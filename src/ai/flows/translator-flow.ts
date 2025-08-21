
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslatorInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLang: z.string().describe('The target language code (e.g., "si" for Sinhala, "es" for Spanish).'),
});

export type TranslatorInput = z.infer<typeof TranslatorInputSchema>;

export async function translateText(input: TranslatorInput): Promise<string> {
    if (input.targetLang === 'en') {
        return input.text;
    }
    return translatorFlow(input);
}

const translatorFlow = ai.defineFlow(
  {
    name: 'translatorFlow',
    inputSchema: TranslatorInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `Translate the following text to the language with code "${input.targetLang}":\n\n${input.text}\n\nReturn ONLY the translated text, without any additional formatting or explanation.`,
      model: 'googleai/gemini-2.0-flash',
      config: {
        temperature: 0.2,
      },
    });

    return llmResponse.text;
  }
);
