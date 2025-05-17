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
    // Ensure all fields are present, even if empty strings, to match schema
    return {
      date: result.date || "",
      time: result.time || "",
      systolic: result.systolic || 0,
      diastolic: result.diastolic || 0,
    };
  } catch (error) {
    console.error("Error in callExtractDataAction:", error);
    throw new Error("Failed to extract data from image. The AI model might be unable to read this image clearly.");
  }
}

export async function callAnalyzeTrendAction(readings: AnalyzeBloodPressureTrendInput['readings']): Promise<AnalyzeBloodPressureTrendOutput> {
  if (!readings || readings.length === 0) {
    // Return a default structure or throw an error if no readings are provided for analysis.
    // For this app, returning a specific structure indicating no data might be better than throwing.
    return {
        summary: "No recent readings available to analyze.",
        flags: [],
        suggestions: ["Please add more readings to get a trend analysis."]
    };
  }
  const input: AnalyzeBloodPressureTrendInput = { readings };
  try {
    return await analyzeBloodPressureTrend(input);
  } catch (error) {
    console.error("Error in callAnalyzeTrendAction:", error);
    throw new Error("Failed to analyze blood pressure trend. The AI model encountered an issue.");
  }
}
