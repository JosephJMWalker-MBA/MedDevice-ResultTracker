'use server';

/**
 * @fileOverview Analyzes blood pressure trends over the last 30 days and provides a summary, flags, and personalized suggestions.
 * This version expects user profile data (age, weight, medications etc.) to be passed separately.
 *
 * - analyzeBloodPressureTrend - A function that analyzes blood pressure trends.
 * - AnalyzeBloodPressureTrendInput - The input type for the analyzeBloodPressureTrend function.
 * - AnalyzeBloodPressureTrendOutput - The return type for the analyzeBloodPressureTrend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { BodyPositionOptions, RaceEthnicityOptions, GenderOptions, ExerciseContextOptions } from '@/lib/types';

// Schema for a single reading as received by the flow
const FlowReadingSchema = z.object({
  timestamp: z.string().describe('Timestamp of the reading (ISO format).'),
  systolic: z.number().describe('Systolic blood pressure reading.'),
  diastolic: z.number().describe('Diastolic blood pressure reading.'),
  bodyPosition: z.enum(BodyPositionOptions).describe('Body position during the reading (e.g., Sitting, Standing).'),
  exerciseContext: z.enum(ExerciseContextOptions).describe('Context of exercise during the reading (e.g., Resting, Post-Exercise).'),
});

// Public input schema for the flow
const AnalyzeBloodPressureTrendInputSchema = z.object({
  readings: z.array(FlowReadingSchema).describe('Array of blood pressure readings over the last 30 days.'),
  age: z.number().optional().describe('Age of the user.'),
  weightLbs: z.number().optional().describe('Weight of the user in lbs.'),
  gender: z.enum(GenderOptions).optional().describe('Gender of the user.'),
  raceEthnicity: z.enum(RaceEthnicityOptions).optional().describe('Race or ethnicity of the user.'),
  medicalConditions: z.array(z.string()).optional().describe('Existing medical conditions of the user (e.g., diabetes, kidney disease).'),
  medications: z.string().optional().describe('Current medications the user is taking.'),
});
export type AnalyzeBloodPressureTrendInput = z.infer<typeof AnalyzeBloodPressureTrendInputSchema>;

// Schema for a single reading as expected by the prompt (with formatted timestamp)
const PromptReadingSchema = FlowReadingSchema.extend({
  formattedTimestamp: z.string().describe('Pre-formatted timestamp for display (e.g., "May 17, 2024 19:10").')
});

// Internal input schema for the prompt itself
const AnalyzeBloodPressureTrendPromptInternalInputSchema = z.object({
  readings: z.array(PromptReadingSchema).describe('Array of blood pressure readings with formatted timestamps.'),
  age: z.number().optional().describe('Age of the user.'),
  weightLbs: z.number().optional().describe('Weight of the user in lbs.'),
  gender: z.enum(GenderOptions).optional().describe('Gender of the user.'),
  raceEthnicity: z.enum(RaceEthnicityOptions).optional().describe('Race or ethnicity of the user.'),
  medicalConditions: z.array(z.string()).optional().describe('Existing medical conditions of the user (e.g., diabetes, kidney disease).'),
  medications: z.string().optional().describe('Current medications the user is taking.'),
});


const AnalyzeBloodPressureTrendOutputSchema = z.object({
  summary: z.string().describe('A plain-language summary of the blood pressure trends, potentially including a breakdown of the most recent reading. This summary MUST include the disclaimer: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns."'),
  flags: z.array(z.string()).describe('Any flags based on current guidelines (e.g., elevated, stage 1 hypertension).'),
  suggestions: z.array(z.string()).describe('Personalized suggestions for lifestyle adjustments, including "What to watch for" and "Next Steps" prompts.'),
});
export type AnalyzeBloodPressureTrendOutput = z.infer<typeof AnalyzeBloodPressureTrendOutputSchema>;

export async function analyzeBloodPressureTrend(input: AnalyzeBloodPressureTrendInput): Promise<AnalyzeBloodPressureTrendOutput> {
  return analyzeBloodPressureTrendFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBloodPressureTrendPrompt',
  input: {schema: AnalyzeBloodPressureTrendPromptInternalInputSchema},
  output: {schema: AnalyzeBloodPressureTrendOutputSchema},
  prompt: `You are HealthInsightBot, a friendly and empathetic AI health assistant specializing in blood pressure analysis.
  Your goal is to provide clear, conversational, and actionable feedback based on current AHA/CDC guidelines.

  Blood Pressure Readings (most recent first):
  {{#each readings}}
  - Date: {{formattedTimestamp}}, Systolic: {{systolic}}, Diastolic: {{diastolic}}, Position: {{bodyPosition}}, Exercise Context: {{exerciseContext}}
  {{/each}}

  User Profile (if available):
  {{#if age}}User Age: {{age}}{{/if}}
  {{#if weightLbs}}User Weight: {{weightLbs}} lbs{{/if}}
  {{#if gender}}User Gender: {{gender}}{{/if}}
  {{#if raceEthnicity}}User Race/Ethnicity: {{raceEthnicity}}{{/if}}
  {{#if medicalConditions.length}}User Medical Conditions: {{#each medicalConditions}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if medications}}User Medications: {{medications}}{{/if}}

  Analysis Requirements:

  **Overall Summary (Primary output for the 'summary' field):**
  1.  **Recent Reading Breakdown (If 1-2 readings provided, focus on the most recent. If many, briefly summarize the most recent before trend analysis):**
      *   Start with a conversational interpretation of the most recent reading: "Your latest reading of {{readings.0.systolic}}/{{readings.0.diastolic}} mmHg, taken on {{readings.0.formattedTimestamp}} while {{readings.0.bodyPosition}} and in a '{{readings.0.exerciseContext}}' state, shows the following:"
      *   **Systolic Pressure ({{readings.0.systolic}} mmHg):** Explain what it means (e.g., "This is the pressure when your heart beats."). Classify it (e.g., "This is in the normal/elevated/stage 1 hypertension range.").
          *   Contextualize based on body position and exercise:
              *   If 'Post-Exercise': "It's common for systolic pressure to be higher after exercise."
              *   If 'Standing': "Standing can sometimes slightly raise or lower blood pressure for some individuals."
      *   **Diastolic Pressure ({{readings.0.diastolic}} mmHg):** Explain what it means (e.g., "This is the pressure when your heart rests between beats."). Classify it.
          *   Contextualize:
              *   If 'Post-Exercise': "A lower diastolic pressure can be expected after exercise as blood vessels relax."
              *   Mention if it's unusually low or high for the context.
      *   **(If applicable and data is available) Pulse:** Briefly comment if pulse data were part of the input.
          *   If 'Post-Exercise': "An elevated pulse is also expected after physical activity."

  2.  **Trend Analysis (If multiple readings are available):**
      *   Provide a plain-language summary of overall trends in systolic and diastolic pressures over the last 30 days.
      *   Mention consistency or variability. "Your readings over the past month show..."
      *   Incorporate how the user's profile data (age, weight, gender, race/ethnicity, medical conditions, medications), body position, and exercise context might influence overall blood pressure patterns, according to general health knowledge and AHA/CDC guidelines.

  **Flags (For the 'flags' field - array of strings):**
  *   List any flags based on the following AHA/CDC blood pressure categories. Apply these to individual readings or overall trends as appropriate.
    - Normal: Systolic <120 mmHg AND Diastolic <80 mmHg.
    - Elevated: Systolic 120–129 mmHg AND Diastolic <80 mmHg.
    - Hypertension Stage 1: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg.
    - Hypertension Stage 2: Systolic ≥140 mmHg OR Diastolic ≥90 mmHg.
    - Hypertensive Crisis: Systolic >180 mmHg AND/OR Diastolic >120 mmHg. (If this is flagged for any recent reading, make this the MOST prominent flag and strongly advise seeking immediate medical attention in suggestions).
  *   Consider body position and exercise context: A 'Post-Exercise' reading might be flagged differently or have an explanatory note. For example, flag as "Elevated (Post-Exercise)" if it's high but expected.

  **Suggestions & Next Steps (For the 'suggestions' field - array of strings):**
  1.  **"What to watch for":**
      *   Based on the recent reading(s) and profile: "Given your reading, it’s good to be aware of symptoms like dizziness, lightheadedness, or unusual fatigue, especially [mention context e.g., 'when standing up quickly' or 'if readings are consistently low/high']. If you experience these, it's worth noting."
      *   If values are normal for the context (e.g. post-exercise): "If you feel fine and this pattern is typical for you after exercise, there’s likely no immediate cause for concern, but continue to monitor."
  2.  **Personalized Lifestyle/Monitoring Advice:**
      *   Offer actionable suggestions for lifestyle adjustments (diet, exercise, stress), monitoring, or discussions with a healthcare provider.
      *   These should be informed by the trends, flags, user profile, body position, and exercise context, aligning with general AHA/CDC recommendations.
      *   Example: "If readings are often higher when standing, discussing this with your doctor might be helpful to rule out orthostatic hypotension."
  3.  **Call to Action Prompts (include these as the last items in the suggestions array):**
      *   "Would you like to compare this reading to your previous ones in more detail?"
      *   "Do you want more information about what these blood pressure numbers mean for you?"

  **VERY IMPORTANT:**
  *   The final "summary" field in your output (which contains the detailed breakdown and trend analysis) MUST conclude with the exact sentence: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns." Do not omit or alter this disclaimer. Ensure it is the very last part of the summary.
  *   Format 'flags' and 'suggestions' as arrays of strings.
  *   Maintain a friendly, empathetic, and clear tone throughout.
  `,
});

const analyzeBloodPressureTrendFlow = ai.defineFlow(
  {
    name: 'analyzeBloodPressureTrendFlow',
    inputSchema: AnalyzeBloodPressureTrendInputSchema,
    outputSchema: AnalyzeBloodPressureTrendOutputSchema,
  },
  async (flowInput: AnalyzeBloodPressureTrendInput) => {
    const processedReadings = flowInput.readings.map(reading => {
      let formattedTimestamp: string;
      try {
        const date = new Date(reading.timestamp);
        formattedTimestamp = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (e) {
        console.warn(`Failed to format timestamp ${reading.timestamp}:`, e);
        formattedTimestamp = reading.timestamp;
      }
      return {
        ...reading,
        formattedTimestamp: formattedTimestamp,
      };
    });

    // Sort readings to ensure the most recent is first for the prompt logic
    processedReadings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


    const promptInputPayload: z.infer<typeof AnalyzeBloodPressureTrendPromptInternalInputSchema> = {
      readings: processedReadings,
      age: flowInput.age,
      weightLbs: flowInput.weightLbs,
      gender: flowInput.gender,
      raceEthnicity: flowInput.raceEthnicity,
      medicalConditions: flowInput.medicalConditions,
      medications: flowInput.medications,
    };

    const {output} = await prompt(promptInputPayload);

    let summary = output!.summary;
    const disclaimer = "⚠️ This is not medical advice. Consult a healthcare professional for any concerns.";
    // Ensure disclaimer is the absolute last thing in summary
    if (summary.includes(disclaimer)) {
        summary = summary.replace(disclaimer, "").trim(); // Remove existing instances
    }
    summary = summary.trim() + (summary.trim().endsWith('.') ? ' ' : '. ') + disclaimer;


    return {
        summary: summary,
        flags: output!.flags || [],
        suggestions: output!.suggestions || [],
    };
  }
);