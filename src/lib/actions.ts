
'use server';

import { extractBloodPressureData, type ExtractBloodPressureDataInput } from '@/ai/flows/extract-blood-pressure-data'; // Still used for OCR part of the mock
import { analyzeBloodPressureTrend, type AnalyzeBloodPressureTrendInput, type AnalyzeBloodPressureTrendOutput } from '@/ai/flows/analyze-blood-pressure-trend';
import type { ImageProcessingResult, OcrRawData } from '@/lib/types';

// Simulate all possible backend responses for testing UI flows
export async function callExtractDataAction(photoDataUri: string): Promise<ImageProcessingResult> {
  // Mock glare logic: randomly assign glare for demo purposes
  const glareDetected = Math.random() < 0.3; // 30% chance of glare

  let ocrDataFromFlow: {
    date: string;
    time: string;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    ocr_raw: OcrRawData;
  } = {
    date: new Date().toISOString().split('T')[0], // Mock date
    time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Mock time
    ocr_raw: { sys: null, dia: null, pul: null }
  };

  if (!glareDetected) {
    // If no glare, attempt "OCR" (using the Genkit flow for this mock)
    try {
      const input: ExtractBloodPressureDataInput = { photoDataUri };
      const extracted = await extractBloodPressureData(input);
      ocrDataFromFlow = {
        date: extracted.date || ocrDataFromFlow.date,
        time: extracted.time || ocrDataFromFlow.time,
        systolic: extracted.systolic,
        diastolic: extracted.diastolic,
        pulse: extracted.pulse,
        ocr_raw: {
          sys: extracted.systolic?.toString() || null,
          dia: extracted.diastolic?.toString() || null,
          pul: extracted.pulse?.toString() || null,
        }
      };
    } catch (e) {
      console.warn("Mock OCR (Genkit flow) failed, returning empty OCR data.", e);
      // ocrDataFromFlow remains with null/empty raw values
       ocrDataFromFlow.ocr_raw = { sys: null, dia: null, pul: null };
       ocrDataFromFlow.systolic = undefined;
       ocrDataFromFlow.diastolic = undefined;
       ocrDataFromFlow.pulse = undefined;
    }
  } else {
     // If glare detected, OCR raw values are typically empty or not reliable
     ocrDataFromFlow.ocr_raw = { sys: null, dia: null, pul: null };
     ocrDataFromFlow.systolic = undefined;
     ocrDataFromFlow.diastolic = undefined;
     ocrDataFromFlow.pulse = undefined;
  }
  
  console.log("UserAction: Image processing attempted", { photoDataUriLength: photoDataUri.length, glareDetectedMock: glareDetected });

  return {
    // Fields from ExtractBloodPressureDataOutput
    date: ocrDataFromFlow.date,
    time: ocrDataFromFlow.time,
    systolic: ocrDataFromFlow.systolic,
    diastolic: ocrDataFromFlow.diastolic,
    pulse: ocrDataFromFlow.pulse,
    // New fields for ImageProcessingResult
    glare_detected: glareDetected,
    variance: glareDetected ? Math.random() * 10 + 1 : Math.random() * 10 + 15, // Lower for glare, higher otherwise
    image_url: "https://placehold.co/600x400.png?text=Original+Image", // Mock URL
    heatmap_url: glareDetected ? "https://placehold.co/600x400.png?text=Heatmap+(Glare)" : "https://placehold.co/600x400.png?text=Heatmap+(Normal)", // Mock URL
    ocr_raw: ocrDataFromFlow.ocr_raw,
  };
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
