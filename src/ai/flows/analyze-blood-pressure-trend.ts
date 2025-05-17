'use server';

/**
 * @fileOverview Analyzes blood pressure trends over the last 30 days and provides a summary, flags, and personalized suggestions.
 *
 * - analyzeBloodPressureTrend - A function that analyzes blood pressure trends.
 * - AnalyzeBloodPressureTrendInput - The input type for the analyzeBloodPressureTrend function.
 * - AnalyzeBloodPressureTrendOutput - The return type for the analyzeBloodPressureTrend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeBloodPressureTrendInputSchema = z.object({
  readings: z.array(
    z.object({
      timestamp: z.string().describe('Timestamp of the reading (ISO format).'),
      systolic: z.number().describe('Systolic blood pressure reading.'),
      diastolic: z.number().describe('Diastolic blood pressure reading.'),
      age: z.number().describe('Age of the user when reading was taken.'),
      weight: z.number().describe('Weight of the user in lbs when reading was taken.'),
      medications: z.string().describe('Medications the user is taking when reading was taken.'),
    })
  ).describe('Array of blood pressure readings over the last 30 days.'),
});
export type AnalyzeBloodPressureTrendInput = z.infer<typeof AnalyzeBloodPressureTrendInputSchema>;

const AnalyzeBloodPressureTrendOutputSchema = z.object({
  summary: z.string().describe('A plain-language summary of the blood pressure trends.'),
  flags: z.array(z.string()).describe('Any flags based on current guidelines (e.g., elevated, stage 1 hypertension).'),
  suggestions: z.array(z.string()).describe('Personalized suggestions for lifestyle adjustments.'),
});
export type AnalyzeBloodPressureTrendOutput = z.infer<typeof AnalyzeBloodPressureTrendOutputSchema>;

export async function analyzeBloodPressureTrend(input: AnalyzeBloodPressureTrendInput): Promise<AnalyzeBloodPressureTrendOutput> {
  return analyzeBloodPressureTrendFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBloodPressureTrendPrompt',
  input: {schema: AnalyzeBloodPressureTrendInputSchema},
  output: {schema: AnalyzeBloodPressureTrendOutputSchema},
  prompt: `You are HealthInsightBot, a friendly AI health assistant specializing in blood pressure analysis.

  Analyze the following blood pressure readings over the last 30 days to provide a summary, flags, and personalized suggestions.
  The user provides their weight in pounds (lbs).
  Remember to always remind users that you’re not a medical professional and to consult a doctor for serious concerns.

  Blood Pressure Readings:
  {{#each readings}}
  - Timestamp: {{timestamp}}, Systolic: {{systolic}}, Diastolic: {{diastolic}}, Age: {{age}}, Weight: {{weight}} lbs, Medications: {{medications}}
  {{/each}}

  Provide:
  1. A plain-language summary of what the averages and trends mean for the user.
  2. Any flags (e.g., "elevated," "stage 1 hypertension," etc.) based on current guidelines.
  3. Personalized suggestions (e.g., lifestyle tweaks or reminders).

  Always append: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns."
  Make sure to format the flags and suggestions as arrays of strings.
  `,
});

const analyzeBloodPressureTrendFlow = ai.defineFlow(
  {
    name: 'analyzeBloodPressureTrendFlow',
    inputSchema: AnalyzeBloodPressureTrendInputSchema,
    outputSchema: AnalyzeBloodPressureTrendOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
