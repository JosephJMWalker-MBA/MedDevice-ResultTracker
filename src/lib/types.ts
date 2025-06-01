import type { ExtractBloodPressureDataOutput } from "@/ai/flows/extract-blood-pressure-data";
import type { AnalyzeBloodPressureTrendOutput } from "@/ai/flows/analyze-blood-pressure-trend";

export const BodyPositionOptions = ["Sitting", "Standing", "Lying Down", "Other"] as const;
export type BodyPosition = typeof BodyPositionOptions[number];

export interface BloodPressureReading {
  id: string; // Client-side unique ID
  timestamp: string; // ISO string format
  systolic: number;
  diastolic: number;
  bodyPosition: BodyPosition;
  medications: string; // Comma-separated list or description
}

export type OcrData = ExtractBloodPressureDataOutput; // This will be just { date, time, systolic, diastolic }

export type TrendAnalysisResult = AnalyzeBloodPressureTrendOutput;

// Schema for the reading form, to be used with react-hook-form and Zod
import { z } from "zod";

// Helper for file validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const ReadingFormSchema = z.object({
  imageFile: z
    .custom<FileList>()
    .refine((files) => files === undefined || files === null || files.length === 0 || (files?.[0]?.size !== undefined && files[0].size <= MAX_FILE_SIZE), `Max image size is 5MB.`)
    .refine(
      (files) => files === undefined || files === null || files.length === 0 || (files?.[0]?.type !== undefined && ACCEPTED_IMAGE_TYPES.includes(files[0].type)),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    )
    .optional(),
  date: z.string().min(1, "Date is required"), // Expected format YYYY-MM-DD
  time: z.string().min(1, "Time is required"), // Expected format HH:MM
  systolic: z.coerce.number({invalid_type_error: "Systolic must be a number"}).positive("Systolic pressure must be positive"),
  diastolic: z.coerce.number({invalid_type_error: "Diastolic must be a number"}).positive("Diastolic pressure must be positive"),
  bodyPosition: z.enum(BodyPositionOptions, { required_error: "Body position is required." }),
  medications: z.string().optional(),
});

export type ReadingFormData = z.infer<typeof ReadingFormSchema>;

// User Profile related types (for future implementation)
export const RaceEthnicityOptions = ["Asian", "Black or African American", "Hispanic or Latino", "Native American or Alaska Native", "Native Hawaiian or Other Pacific Islander", "White", "Two or more races", "Prefer not to say", "Other"] as const;
export type RaceEthnicity = typeof RaceEthnicityOptions[number];

export const GenderOptions = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"] as const;
export type Gender = typeof GenderOptions[number];

export interface UserProfile {
  age: number | null;
  weightLbs: number | null; // Weight in lbs
  raceEthnicity: RaceEthnicity | null;
  gender: Gender | null;
  medicalConditions: string[]; // list of conditions, could be a string with comma separation initially
  preferredReminderTime: string | null; // HH:MM format, e.g., "08:00"
}

// Example of Zod schema for UserProfile (can be refined later)
export const UserProfileSchema = z.object({
  age: z.coerce.number().positive("Age must be a positive number.").nullable(),
  weightLbs: z.coerce.number().positive("Weight must be a positive number.").nullable(),
  raceEthnicity: z.enum(RaceEthnicityOptions).nullable(),
  gender: z.enum(GenderOptions).nullable(),
  medicalConditions: z.array(z.string()).optional(), // Or z.string() if comma-separated
  preferredReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM.").nullable(),
});
