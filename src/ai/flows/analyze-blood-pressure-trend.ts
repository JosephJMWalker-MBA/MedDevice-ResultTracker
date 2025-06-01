
'use server';

/**
 * @fileOverview Analyzes blood pressure trends over the last 30 days and provides a summary, flags, and personalized suggestions.
 * This version expects user profile data (age, weight, etc.) to be passed separately if available for more personalized insights.
 *
 * - analyzeBloodPressureTrend - A function that analyzes blood pressure trends.
 * - AnalyzeBloodPressureTrendInput - The input type for the analyzeBloodPressureTrend function.
 * - AnalyzeBloodPressureTrendOutput - The return type for the analyzeBloodPressureTrend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { BodyPositionOptions, RaceEthnicityOptions, GenderOptions } from '@/lib/types'; 

// Schema for a single reading as received by the flow
const FlowReadingSchema = z.object({
  timestamp: z.string().describe('Timestamp of the reading (ISO format).'),
  systolic: z.number().describe('Systolic blood pressure reading.'),
  diastolic: z.number().describe('Diastolic blood pressure reading.'),
  bodyPosition: z.enum(BodyPositionOptions).describe('Body position during the reading (e.g., Sitting, Standing).'),
  medications: z.string().optional().describe('Medications the user is taking when reading was taken.'),
});

// Public input schema for the flow
const AnalyzeBloodPressureTrendInputSchema = z.object({
  readings: z.array(FlowReadingSchema).describe('Array of blood pressure readings over the last 30 days.'),
  // User profile data for more personalized analysis
  age: z.number().optional().describe('Age of the user.'),
  weightLbs: z.number().optional().describe('Weight of the user in lbs.'),
  gender: z.enum(GenderOptions).optional().describe('Gender of the user.'),
  raceEthnicity: z.enum(RaceEthnicityOptions).optional().describe('Race or ethnicity of the user.'),
  medicalConditions: z.array(z.string()).optional().describe('Existing medical conditions of the user (e.g., diabetes, kidney disease).'),
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
});


const AnalyzeBloodPressureTrendOutputSchema = z.object({
  summary: z.string().describe('A plain-language summary of the blood pressure trends. This summary MUST include the disclaimer: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns."'),
  flags: z.array(z.string()).describe('Any flags based on current guidelines (e.g., elevated, stage 1 hypertension).'),
  suggestions: z.array(z.string()).describe('Personalized suggestions for lifestyle adjustments.'),
});
export type AnalyzeBloodPressureTrendOutput = z.infer<typeof AnalyzeBloodPressureTrendOutputSchema>;

export async function analyzeBloodPressureTrend(input: AnalyzeBloodPressureTrendInput): Promise<AnalyzeBloodPressureTrendOutput> {
  return analyzeBloodPressureTrendFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBloodPressureTrendPrompt',
  input: {schema: AnalyzeBloodPressureTrendPromptInternalInputSchema}, // Use the internal schema with formatted dates
  output: {schema: AnalyzeBloodPressureTrendOutputSchema},
  prompt: `You are HealthInsightBot, a friendly AI health assistant specializing in blood pressure analysis.
  You will analyze blood pressure readings over the last 30 days.
  Consider the body position for each reading (e.g., readings while standing might be different).
  
  Use the provided user profile data (age, weight, gender, race/ethnicity, medical conditions) to personalize the analysis and suggestions further, adhering to current AHA/CDC guidelines.
  
  Blood Pressure Readings:
  {{#each readings}}
  - Date: {{formattedTimestamp}}, Systolic: {{systolic}}, Diastolic: {{diastolic}}, Position: {{bodyPosition}}{{#if medications}}, Medications: {{medications}}{{/if}}
  {{/each}}

  User Profile (if available):
  {{#if age}}User Age: {{age}}{{/if}}
  {{#if weightLbs}}User Weight: {{weightLbs}} lbs{{/if}}
  {{#if gender}}User Gender: {{gender}}{{/if}}
  {{#if raceEthnicity}}User Race/Ethnicity: {{raceEthnicity}}{{/if}}
  {{#if medicalConditions.length}}User Medical Conditions: {{#each medicalConditions}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

  Analysis Requirements:
  1. Summary: Provide a plain-language summary of what the averages and trends mean for the user. Incorporate profile data and body position into this summary.
  2. Flags: List any flags (e.g., "elevated," "stage 1 hypertension") based on current AHA/CDC guidelines.
     - Normal: <120 SBP AND <80 DBP
     - Elevated: 120–129 SBP AND <80 DBP
     - Hypertension Stage 1: 130–139 SBP OR 80–89 DBP
     - Hypertension Stage 2: ≥140 SBP OR ≥90 DBP
     - Hypertensive Crisis: >180 SBP AND/OR >120 DBP (advise seeking immediate medical attention).
     Account for how demographics or medical conditions (if provided) might put the user at higher risk or modify interpretation.
  3. Suggestions: Offer personalized, actionable suggestions for lifestyle adjustments or monitoring, considering all provided data.

  IMPORTANT: The final "summary" field in your output MUST conclude with the exact sentence: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns." Do not omit or alter this disclaimer.
  Format flags and suggestions as arrays of strings.
  `,
  // Removed Handlebars helper registration as it's not being picked up
});

const analyzeBloodPressureTrendFlow = ai.defineFlow(
  {
    name: 'analyzeBloodPressureTrendFlow',
    inputSchema: AnalyzeBloodPressureTrendInputSchema, // Public input schema for the flow
    outputSchema: AnalyzeBloodPressureTrendOutputSchema,
  },
  async (flowInput: AnalyzeBloodPressureTrendInput) => { // Explicitly type flowInput
    // Pre-process readings to add formatted timestamps
    const processedReadings = flowInput.readings.map(reading => {
      let formattedTimestamp: string;
      try {
        const date = new Date(reading.timestamp);
        // Format: MMM dd, yyyy HH:mm (e.g., May 17, 2024 19:10)
        formattedTimestamp = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (e) {
        console.warn(`Failed to format timestamp ${reading.timestamp}:`, e);
        formattedTimestamp = reading.timestamp; // Fallback to original timestamp string
      }
      return {
        ...reading,
        formattedTimestamp: formattedTimestamp,
      };
    });

    // Construct the payload for the prompt, matching AnalyzeBloodPressureTrendPromptInternalInputSchema
    const promptInputPayload: z.infer<typeof AnalyzeBloodPressureTrendPromptInternalInputSchema> = {
      readings: processedReadings,
      age: flowInput.age,
      weightLbs: flowInput.weightLbs,
      gender: flowInput.gender,
      raceEthnicity: flowInput.raceEthnicity,
      medicalConditions: flowInput.medicalConditions,
    };
    
    const {output} = await prompt(promptInputPayload);
    
    let summary = output!.summary;
    const disclaimer = "⚠️ This is not medical advice. Consult a healthcare professional for any concerns.";
    if (!summary.endsWith(disclaimer)) {
      // Attempt to gracefully append if missing, or replace if a similar but not exact disclaimer is there.
      const disclaimerIndex = summary.indexOf("⚠️");
      if (disclaimerIndex !== -1) {
        summary = summary.substring(0, disclaimerIndex) + disclaimer;
      } else {
        summary = summary.trim() + (summary.trim().endsWith('.') ? ' ' : '. ') + disclaimer;
      }
    }

    return {
        summary: summary,
        flags: output!.flags || [],
        suggestions: output!.suggestions || [],
    };
  }
);

