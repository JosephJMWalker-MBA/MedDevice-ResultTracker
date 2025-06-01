
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
import { BodyPositionOptions, RaceEthnicityOptions, GenderOptions } from '@/lib/types'; 

// Schema for a single reading as received by the flow
const FlowReadingSchema = z.object({
  timestamp: z.string().describe('Timestamp of the reading (ISO format).'),
  systolic: z.number().describe('Systolic blood pressure reading.'),
  diastolic: z.number().describe('Diastolic blood pressure reading.'),
  bodyPosition: z.enum(BodyPositionOptions).describe('Body position during the reading (e.g., Sitting, Standing).'),
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
  input: {schema: AnalyzeBloodPressureTrendPromptInternalInputSchema}, 
  output: {schema: AnalyzeBloodPressureTrendOutputSchema},
  prompt: `You are HealthInsightBot, a friendly AI health assistant specializing in blood pressure analysis.
  You will analyze blood pressure readings over the last 30 days based on current AHA/CDC guidelines.
  
  Blood Pressure Readings:
  {{#each readings}}
  - Date: {{formattedTimestamp}}, Systolic: {{systolic}}, Diastolic: {{diastolic}}, Position: {{bodyPosition}}
  {{/each}}

  User Profile (if available):
  {{#if age}}User Age: {{age}}{{/if}}
  {{#if weightLbs}}User Weight: {{weightLbs}} lbs{{/if}}
  {{#if gender}}User Gender: {{gender}}{{/if}}
  {{#if raceEthnicity}}User Race/Ethnicity: {{raceEthnicity}}{{/if}}
  {{#if medicalConditions.length}}User Medical Conditions: {{#each medicalConditions}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if medications}}User Medications: {{medications}}{{/if}}

  Analysis Requirements:

  1. Summary: 
     - Provide a plain-language summary of what the averages and trends mean for the user. 
     - Incorporate how the user's profile data (age, weight, gender, race/ethnicity, medical conditions, medications) and the body position during readings might influence blood pressure patterns, according to general health knowledge and guidelines.
     - For instance, note if readings are consistently different based on body position.
     - Mention if certain demographics or conditions might put the user at a different baseline risk, without making specific diagnoses.

  2. Flags: 
     - List any flags based on the following AHA/CDC blood pressure categories. Apply these to individual readings or overall trends as appropriate.
       - Normal: Systolic <120 mmHg AND Diastolic <80 mmHg.
       - Elevated: Systolic 120–129 mmHg AND Diastolic <80 mmHg.
       - Hypertension Stage 1: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg.
       - Hypertension Stage 2: Systolic ≥140 mmHg OR Diastolic ≥90 mmHg.
       - Hypertensive Crisis: Systolic >180 mmHg AND/OR Diastolic >120 mmHg. (If flagged, strongly advise seeking immediate medical attention in suggestions).
     - When determining flags, consider how demographics, existing medical conditions, or medications (if provided) might be relevant according to general guidelines. For example, treatment targets might differ, or certain conditions might increase risk.

  3. Suggestions: 
     - Offer personalized, actionable suggestions for lifestyle adjustments, monitoring, or discussions with a healthcare provider.
     - These suggestions should be informed by the trends, any flags raised, the user's profile, body position during readings, and general AHA/CDC recommendations for blood pressure management.
     - For example, if readings are higher when standing, a suggestion might be to discuss orthostatic hypotension with a doctor.

  IMPORTANT: The final "summary" field in your output MUST conclude with the exact sentence: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns." Do not omit or alter this disclaimer.
  Format flags and suggestions as arrays of strings.
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
    if (!summary.endsWith(disclaimer)) {
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

