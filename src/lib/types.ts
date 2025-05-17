import type { ExtractBloodPressureDataOutput } from "@/ai/flows/extract-blood-pressure-data";
import type { AnalyzeBloodPressureTrendOutput } from "@/ai/flows/analyze-blood-pressure-trend";

export interface BloodPressureReading {
  id: string; // Client-side unique ID
  timestamp: string; // ISO string format
  systolic: number;
  diastolic: number;
  age: number;
  weight: number; // Weight in lbs
  medications: string; // Comma-separated list or description
}

export type OcrData = ExtractBloodPressureDataOutput;

export type TrendAnalysisResult = AnalyzeBloodPressureTrendOutput;

// Schema for the reading form, to be used with react-hook-form and Zod
import { z } from "zod";

// Helper for file validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const ReadingFormSchema = z.object({
  imageFile: z
    .custom<FileList>()
    .refine((files) => files === undefined || files === null || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
    .refine(
      (files) => files === undefined || files === null || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    )
    .optional(),
  date: z.string().min(1, "Date is required"), // Expected format YYYY-MM-DD
  time: z.string().min(1, "Time is required"), // Expected format HH:MM
  systolic: z.coerce.number({invalid_type_error: "Systolic must be a number"}).positive("Systolic pressure must be positive"),
  diastolic: z.coerce.number({invalid_type_error: "Diastolic must be a number"}).positive("Diastolic pressure must be positive"),
  age: z.coerce.number({invalid_type_error: "Age must be a number"}).positive("Age must be positive").max(120, "Age seems too high"),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).positive("Weight must be positive"),
  medications: z.string().optional(),
});

export type ReadingFormData = z.infer<typeof ReadingFormSchema>;
