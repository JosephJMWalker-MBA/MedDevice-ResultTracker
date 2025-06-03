
'use server';

import { extractBloodPressureData, type ExtractBloodPressureDataInput } from '@/ai/flows/extract-blood-pressure-data';
import { analyzeBloodPressureTrend, type AnalyzeBloodPressureTrendInput, type AnalyzeBloodPressureTrendOutput } from '@/ai/flows/analyze-blood-pressure-trend';
import type { ImageProcessingResult, OcrRawData } from '@/lib/types';

// Simulate all possible backend responses for testing UI flows
export async function callExtractDataAction(photoDataUri: string): Promise<ImageProcessingResult> {
  console.log("UserAction: Image processing attempted", { photoDataUriLength: photoDataUri.length });

  const glareDetected = Math.random() < 0.2; // 20% chance of glare
  let variance = glareDetected ? Math.random() * 10 + 1 : Math.random() * 10 + 15; // Lower for glare, higher otherwise

  let primaryOcr: {
    date: string;
    time: string;
    systolicNum?: number;
    diastolicNum?: number;
    pulseNum?: number;
    raw: OcrRawData;
  } = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    raw: { sys: null, dia: null, pul: null }
  };

  let secondaryOcrRaw: OcrRawData = { sys: null, dia: null, pul: null };
  let consensus = true;
  let alternates: ImageProcessingResult['ocr_alternates'] = null;

  if (!glareDetected) {
    try {
      // Simulate Primary OCR (e.g., Genkit/Tesseract)
      const input: ExtractBloodPressureDataInput = { photoDataUri };
      const extracted = await extractBloodPressureData(input);
      primaryOcr = {
        date: extracted.date || primaryOcr.date,
        time: extracted.time || primaryOcr.time,
        systolicNum: extracted.systolic,
        diastolicNum: extracted.diastolic,
        pulseNum: extracted.pulse,
        raw: {
          sys: extracted.systolic?.toString() || null,
          dia: extracted.diastolic?.toString() || null,
          pul: extracted.pulse?.toString() || null,
        }
      };

      // Simulate Secondary OCR (e.g., EasyOCR) - and potential disagreement
      const disagreementChance = Math.random();
      if (disagreementChance < 0.4) { // 40% chance of disagreement if no glare
        consensus = false;
        secondaryOcrRaw.sys = primaryOcr.raw.sys ? (parseInt(primaryOcr.raw.sys) + (Math.random() > 0.5 ? 5 : -5)).toString() : null; // +-5
        secondaryOcrRaw.dia = primaryOcr.raw.dia ? (parseInt(primaryOcr.raw.dia) + (Math.random() > 0.5 ? 3 : -3)).toString() : null; // +-3
        secondaryOcrRaw.pul = primaryOcr.raw.pul; // Let pulse agree for this mock
        if (secondaryOcrRaw.sys === primaryOcr.raw.sys && secondaryOcrRaw.dia === primaryOcr.raw.dia) { // ensure at least one differs
            secondaryOcrRaw.sys = primaryOcr.raw.sys ? (parseInt(primaryOcr.raw.sys) + 7).toString() : null;
        }
      } else { // Agree
        secondaryOcrRaw = { ...primaryOcr.raw };
      }

      if (!consensus) {
        alternates = {
          sys: [primaryOcr.raw.sys, secondaryOcrRaw.sys],
          dia: [primaryOcr.raw.dia, secondaryOcrRaw.dia],
          pul: [primaryOcr.raw.pul, secondaryOcrRaw.pul],
        };
      }

    } catch (e) {
      console.warn("Mock OCR (Genkit flow for primary) failed, returning empty OCR data.", e);
      primaryOcr.raw = { sys: null, dia: null, pul: null };
      primaryOcr.systolicNum = undefined;
      primaryOcr.diastolicNum = undefined;
      primaryOcr.pulseNum = undefined;
      consensus = false; // If primary fails, consider it a disagreement or uncertainty
      alternates = { sys: [null, null], dia: [null, null], pul: [null, null] };
    }
  } else { // Glare detected
    primaryOcr.raw = { sys: null, dia: null, pul: null };
    consensus = false; // Glare implies OCR is unreliable
    alternates = { sys: [null, null], dia: [null, null], pul: [null, null] };
  }

  return {
    date: primaryOcr.date,
    time: primaryOcr.time,
    systolic: primaryOcr.systolicNum,
    diastolic: primaryOcr.diastolicNum,
    pulse: primaryOcr.pulseNum,
    glare_detected: glareDetected,
    variance: variance,
    image_url: "https://placehold.co/600x400.png?text=Original+Image",
    heatmap_url: glareDetected ? "https://placehold.co/600x400.png?text=Heatmap+(Glare)" : "https://placehold.co/600x400.png?text=Heatmap+(No+Glare)",
    ocr_raw: primaryOcr.raw,
    consensus: glareDetected ? false : consensus, // If glare, always treat as non-consensus for UI
    ocr_alternates: alternates,
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
