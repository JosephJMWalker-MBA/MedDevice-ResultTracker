
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
import { BodyPositionOptions, RaceEthnicityOptions, GenderOptions, ExerciseContextOptions, StaticSymptomsList, type Symptom } from '@/lib/types';

// Schema for a single reading as received by the flow
const FlowReadingSchema = z.object({
  timestamp: z.string().describe('Timestamp of the reading (ISO format).'),
  systolic: z.number().describe('Systolic blood pressure reading.'),
  diastolic: z.number().describe('Diastolic blood pressure reading.'),
  pulse: z.number().optional().describe('Pulse rate in beats per minute (bpm).'), // Added
  bodyPosition: z.enum(BodyPositionOptions).describe('Body position during the reading (e.g., Sitting, Standing).'),
  exerciseContext: z.enum(ExerciseContextOptions).describe('Context of exercise during the reading (e.g., Resting, Post-Exercise).'),
  symptoms: z.array(z.enum(StaticSymptomsList)).optional().describe('Symptoms reported by the user at the time of reading.'),
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

// Schema for a single reading as expected by the prompt (with formatted timestamp and symptom display flag)
const PromptReadingSchema = FlowReadingSchema.extend({
  formattedTimestamp: z.string().describe('Pre-formatted timestamp for display (e.g., "May 17, 2024 19:10").'),
  hasDisplayableSymptoms: z.boolean().describe('Whether the reading has symptoms that should be displayed (not empty and not just "None").')
});

// Internal input schema for the prompt itself
const AnalyzeBloodPressureTrendPromptInternalInputSchema = z.object({
  readings: z.array(PromptReadingSchema).describe('Array of blood pressure readings with formatted timestamps and symptom display flag.'),
  age: z.number().optional().describe('Age of the user.'),
  weightLbs: z.number().optional().describe('Weight of the user in lbs.'),
  gender: z.enum(GenderOptions).optional().describe('Gender of the user.'),
  raceEthnicity: z.enum(RaceEthnicityOptions).optional().describe('Race or ethnicity of the user.'),
  medicalConditions: z.array(z.string()).optional().describe('Existing medical conditions of the user (e.g., diabetes, kidney disease).'),
  medications: z.string().optional().describe('Current medications the user is taking.'),
});


const AnalyzeBloodPressureTrendOutputSchema = z.object({
  summary: z.string().describe('A plain-language summary of the blood pressure trends, potentially including a breakdown of the most recent reading. This summary MUST include the disclaimer: "⚠️ This is not medical advice. Consult a healthcare professional for any concerns."'),
  flags: z.array(z.string()).describe('Any flags based on current guidelines (e.g., elevated, stage 1 hypertension, high pulse).'),
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
  prompt: `You are HealthInsightBot, a friendly and empathetic AI health assistant specializing in blood pressure and heart rate analysis.
  Your goal is to provide clear, conversational, and actionable feedback based on current AHA/CDC guidelines.

  Blood Pressure Categories (AHA/CDC):
  - Normal: Systolic <120 mmHg AND Diastolic <80 mmHg.
  - Elevated: Systolic 120–129 mmHg AND Diastolic <80 mmHg.
  - Hypertension Stage 1: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg.
  - Hypertension Stage 2: Systolic ≥140 mmHg OR Diastolic ≥90 mmHg.
  - Hypertensive Crisis: Systolic >180 mmHg AND/OR Diastolic >120 mmHg. (Seek immediate medical attention if symptoms like chest pain, shortness of breath, numbness, vision changes occur).

  Resting Heart Rate (Pulse) General Guidelines:
  - Normal Resting Pulse: 60–100 beats per minute (bpm) for adults.
  - Tachycardia (Fast Pulse): Resting pulse consistently >100 bpm.
  - Bradycardia (Slow Pulse): Resting pulse <60 bpm (can be normal for very fit individuals, but also indicative of issues).
  - Post-Exercise Pulse: Can be significantly elevated (e.g., 120-180+ bpm depending on intensity and fitness) and gradually returns to normal.

  Blood Pressure Readings (most recent first):
  {{#each readings}}
  - Date: {{formattedTimestamp}}, Systolic: {{systolic}}, Diastolic: {{diastolic}}{{#if pulse}}, Pulse: {{pulse}} bpm{{/if}}, Position: {{bodyPosition}}, Exercise Context: {{exerciseContext}}{{#if hasDisplayableSymptoms}}, Symptoms: {{#each symptoms}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
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
      *   Start with a conversational interpretation of the most recent reading: "Your latest reading on {{readings.0.formattedTimestamp}} ({{readings.0.systolic}}/{{readings.0.diastolic}} mmHg{{#if readings.0.pulse}}, Pulse {{readings.0.pulse}} bpm{{/if}}), taken while {{readings.0.bodyPosition}} and in a '{{readings.0.exerciseContext}}' state{{#if readings.0.hasDisplayableSymptoms}}, while experiencing: {{#each readings.0.symptoms}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}, shows the following:"
      *   **Systolic Pressure ({{readings.0.systolic}} mmHg):** Explain what it means (e.g., "This is the pressure when your heart beats."). Classify it based on the AHA/CDC categories provided above.
          *   Contextualize based on body position and exercise:
              *   If '{{readings.0.exerciseContext}}' is 'Post-Exercise': "It's common for systolic pressure to be higher after exercise as your body recovers."
              *   If '{{readings.0.bodyPosition}}' is 'Standing': "Standing can sometimes slightly raise or lower blood pressure for some individuals. If this is a consistent pattern, it's worth noting."
      *   **Diastolic Pressure ({{readings.0.diastolic}} mmHg):** Explain what it means (e.g., "This is the pressure when your heart rests between beats."). Classify it based on AHA/CDC categories.
          *   Contextualize:
              *   If '{{readings.0.exerciseContext}}' is 'Post-Exercise': "Diastolic pressure may stay similar or slightly decrease after exercise as blood vessels relax. However, it should still be within a healthy range."
      *   {{#if readings.0.pulse}}**Pulse Rate ({{readings.0.pulse}} bpm):** Explain what it means (e.g., "This is how many times your heart beats per minute.").
          *   Contextualize: If '{{readings.0.exerciseContext}}' is 'Post-Exercise', mention that elevated pulse is expected. If 'Resting', compare to normal resting range (60-100 bpm). If significantly outside this range while resting, note it (e.g., "A resting pulse of {{readings.0.pulse}} bpm is [higher/lower] than the typical range of 60-100 bpm.").
          {{/if}}
      *   {{#if readings.0.hasDisplayableSymptoms}}Briefly acknowledge reported symptoms in relation to the reading, if appropriate (e.g., "The dizziness you reported could be related to this reading if it's unusually low for you, or it could be unrelated. It's worth monitoring.").{{/if}}

  2.  **Trend Analysis (If multiple readings are available):**
      *   Provide a plain-language summary of overall trends in systolic, diastolic pressures, and pulse (if available) over the last 30 days, referencing the AHA/CDC and pulse guidelines.
      *   Mention consistency or variability. "Your readings over the past month show..."
      *   Incorporate how the user's profile data (age, weight, gender, race/ethnicity, medicalConditions, medications), body position, exercise context, and reported symptoms might influence overall patterns, according to general health knowledge and AHA/CDC guidelines.

  **Flags (For the 'flags' field - array of strings):**
  *   List any flags based on the AHA/CDC blood pressure categories and pulse guidelines provided above. Apply these to individual readings or overall trends as appropriate.
  *   Examples: "Elevated BP", "Hypertension Stage 1", "Resting Pulse High (>100 bpm)".
  *   Consider body position and exercise context: A 'Post-Exercise' reading might be flagged differently or have an explanatory note. For example, flag as "Elevated BP (Post-Exercise)" or "High Pulse (Post-Exercise)".
  *   If Hypertensive Crisis symptoms (like chest pain, shortness of breath, blurred vision, severe headache) are reported alongside very high readings, emphasize this in the flags and strongly advise seeking immediate medical attention in suggestions.

  **Suggestions & Next Steps (For the 'suggestions' field - array of strings):**
  1.  **"What to watch for":**
      *   Based on the recent reading(s), profile, and reported symptoms: "Given your reading and reported symptoms (if any), it’s good to be aware of [specific related symptoms like dizziness, lightheadedness, unusual fatigue, headache, palpitations, etc.], especially [mention context e.g., 'when standing up quickly' or 'if readings are consistently low/high' or 'if pulse is consistently high/low at rest']. If you experience these, or if your reported symptoms worsen or persist, it's worth noting and discussing with your doctor."
      *   If values are normal for the context (e.g. post-exercise) and no concerning symptoms: "If you feel fine and this pattern is typical for you after exercise, there’s likely no immediate cause for concern, but continue to monitor your blood pressure and pulse as usual."
  2.  **Personalized Lifestyle/Monitoring Advice:**
      *   Offer actionable suggestions for lifestyle adjustments (diet, exercise, stress), monitoring, or discussions with a healthcare provider.
      *   These should be informed by the trends, flags, user profile, body position, exercise context, and reported symptoms, aligning with general AHA/CDC recommendations.
      *   Example: "If readings are often higher when standing and you report dizziness, discussing this with your doctor might be helpful to rule out orthostatic concerns."
      *   Example: "Maintaining consistent measurement practices (e.g., same time of day, same position when resting, waiting 5 minutes before measuring) can help in tracking your trends accurately. Consider noting any symptoms experienced alongside each reading in the app."
  3.  **Prompts for Further Engagement (include these as the last items in the suggestions array, phrased as considerations):**
      *   "You can consider viewing your [TREND_CHART] to see visual trends of your readings, including pulse."
      *   "It might be helpful to review your [READING_HISTORY] for more details on past entries and any patterns in reported symptoms."
      *   "For a deeper understanding of what these numbers mean for your overall health, a discussion with your healthcare provider is always recommended."

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
      const symptomsArray = reading.symptoms || [];
      const hasDisplayableSymptoms = symptomsArray.length > 0 && (symptomsArray.length > 1 || symptomsArray[0] !== "None");

      return {
        ...reading,
        pulse: reading.pulse, // Pass through pulse
        formattedTimestamp: formattedTimestamp,
        symptoms: symptomsArray, 
        hasDisplayableSymptoms: hasDisplayableSymptoms,
      };
    });

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
    if (summary.includes(disclaimer)) {
        summary = summary.replace(disclaimer, "").trim(); 
    }
    summary = summary.trim() + (summary.trim().endsWith('.') ? ' ' : '. ') + disclaimer;


    return {
        summary: summary,
        flags: output!.flags || [],
        suggestions: output!.suggestions || [],
    };
  }
);
