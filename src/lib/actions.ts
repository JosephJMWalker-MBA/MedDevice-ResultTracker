
'use server';

import { extractBloodPressureData, type ExtractBloodPressureDataInput, type ExtractBloodPressureDataOutput } from '@/ai/flows/extract-blood-pressure-data';
import { analyzeBloodPressureTrend, type AnalyzeBloodPressureTrendInput, type AnalyzeBloodPressureTrendOutput } from '@/ai/flows/analyze-blood-pressure-trend';

export async function callExtractDataAction(photoDataUri: string): Promise<ExtractBloodPressureDataOutput> {
  if (!photoDataUri || !photoDataUri.startsWith('data:image')) {
    throw new Error("Invalid image data URI provided.");
  }
  const input: ExtractBloodPressureDataInput = { photoDataUri };
  try {
    const result = await extractBloodPressureData(input);
    return {
      date: result.date || "",
      time: result.time || "",
      systolic: result.systolic || 0,
      diastolic: result.diastolic || 0,
      pulse: result.pulse ?? undefined, // Ensure pulse is passed through
    };
  } catch (error) {
    console.error("Error in callExtractDataAction:", error);
    throw new Error("Failed to extract data from image. The AI model might be unable to read this image clearly.");
  }
}

export async function callAnalyzeTrendAction(input: AnalyzeBloodPressureTrendInput): Promise<AnalyzeBloodPressureTrendOutput> {
  if (!input.readings || input.readings.length === 0) {
    return {
        summary: "No recent readings available to analyze. Add some readings to get started.\n\n⚠️ This is not medical advice. Consult a healthcare professional for any concerns.",
        flags: [],
        suggestions: ["Please add more readings to get a trend analysis."]
    };
  }
  try {
    return await analyzeBloodPressureTrend(input);
  } catch (error) {
    console.error("Error in callAnalyzeTrendAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze blood pressure trend. The AI model encountered an issue.";
    throw new Error(`${errorMessage}\n\n⚠️ This is not medical advice. Consult a healthcare professional for any concerns.`);
  }
}
