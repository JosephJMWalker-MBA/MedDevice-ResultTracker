
'use server';

import { extractBloodPressureData, type ExtractBloodPressureDataInput } from '@/ai/flows/extract-blood-pressure-data';
import { analyzeBloodPressureTrend, type AnalyzeBloodPressureTrendInput, type AnalyzeBloodPressureTrendOutput } from '@/ai/flows/analyze-blood-pressure-trend';
import type { ImageProcessingResult, OcrRawData } from '@/lib/types';

export async function callExtractDataAction(photoDataUri: string): Promise<ImageProcessingResult> {
  if (!photoDataUri || !photoDataUri.startsWith('data:image')) {
    throw new Error("Invalid image data URI provided.");
  }
  const input: ExtractBloodPressureDataInput = { photoDataUri };
  
  // Simulate richer backend processing for now.
  // In a real scenario, this action would call your Firebase Cloud Function.
  let glareDetectedMock = false; // Math.random() > 0.8; // Simulate glare 20% of the time
  let varianceMock: number | undefined = undefined;
  
  // For demonstration, let's assume the real backend would handle glare detection *before* OCR.
  // If glare was detected, OCR might not even run, or results would be flagged.
  // Here, we'll run OCR regardless for the prototype but include the glare flag.
  if (glareDetectedMock) {
    varianceMock = Math.random() * 20; // Simulate some variance value
  }

  try {
    const ocrResult = await extractBloodPressureData(input);
    
    // Construct the ocr_raw structure
    // The Genkit flow returns numbers, so we convert them back to strings for ocr_raw
    // and handle potential undefined/null for pulse.
    const ocr_raw: OcrRawData = {
      sys: ocrResult.systolic?.toString() || null,
      dia: ocrResult.diastolic?.toString() || null,
      pul: ocrResult.pulse?.toString() || null,
    };

    return {
      date: ocrResult.date || "",
      time: ocrResult.time || "",
      systolic: ocrResult.systolic || 0, // Fallback to 0 if OCR fails for numbers
      diastolic: ocrResult.diastolic || 0,
      pulse: ocrResult.pulse ?? undefined,
      // Mocked/simulated values based on your new pipeline
      glare_detected: glareDetectedMock,
      variance: varianceMock,
      image_url: photoDataUri.substring(0, 50) + "...", // Mock URL
      heatmap_url: "https://placehold.co/300x150.png?text=MockHeatmap", // Mock URL
      ocr_raw: ocr_raw,
    };
  } catch (error) {
    console.error("Error in callExtractDataAction:", error);
    // Return a structure indicating failure but still fitting ImageProcessingResult
    return {
        date: "",
        time: "",
        systolic: 0,
        diastolic: 0,
        pulse: undefined,
        glare_detected: glareDetectedMock, // Could be true if glare was detected before OCR failed
        variance: varianceMock,
        image_url: photoDataUri.substring(0, 50) + "...",
        heatmap_url: "https://placehold.co/300x150.png?text=MockHeatmapError",
        ocr_raw: { sys: null, dia: null, pul: null },
        // Include an error message perhaps, or handle differently
        // For now, rely on toast in frontend for error display
        // errorMessage: "Failed to extract data from image. The AI model might be unable to read this image clearly."
    };
    // throw new Error("Failed to extract data from image. The AI model might be unable to read this image clearly.");
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
