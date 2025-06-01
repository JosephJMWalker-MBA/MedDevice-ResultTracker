
import type { ExtractBloodPressureDataOutput } from "@/ai/flows/extract-blood-pressure-data";
import type { AnalyzeBloodPressureTrendOutput } from "@/ai/flows/analyze-blood-pressure-trend";
import { z } from "zod";

export const BodyPositionOptions = ["Sitting", "Standing", "Lying Down", "Other"] as const;
export type BodyPosition = typeof BodyPositionOptions[number];

export interface BloodPressureReading {
  id: string;
  timestamp: string;
  systolic: number;
  diastolic: number;
  bodyPosition: BodyPosition;
  // medications field removed from individual reading
}

export type OcrData = ExtractBloodPressureDataOutput;

export type TrendAnalysisResult = AnalyzeBloodPressureTrendOutput;

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
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  systolic: z.coerce.number({invalid_type_error: "Systolic must be a number"}).positive("Systolic pressure must be positive"),
  diastolic: z.coerce.number({invalid_type_error: "Diastolic must be a number"}).positive("Diastolic pressure must be positive"),
  bodyPosition: z.enum(BodyPositionOptions, { required_error: "Body position is required." }),
  // medications field removed from reading form schema
});

export type ReadingFormData = z.infer<typeof ReadingFormSchema>;

// User Profile related types
export const RaceEthnicityOptions = [
    "Asian", 
    "Black or African American", 
    "Hispanic or Latino", 
    "Native American or Alaska Native", 
    "Native Hawaiian or Other Pacific Islander", 
    "White", 
    "Two or more races", 
    "Other",
    "Prefer not to say"
] as const;
export type RaceEthnicity = typeof RaceEthnicityOptions[number];

export const GenderOptions = [
    "Male", 
    "Female", 
    "Non-binary", 
    "Other",
    "Prefer not to say"
] as const;
export type Gender = typeof GenderOptions[number];

export interface UserProfile {
  age?: number | null;
  weightLbs?: number | null;
  raceEthnicity?: RaceEthnicity | null;
  gender?: Gender | null;
  medicalConditions?: string[];
  medications?: string | null; // Added medications to user profile
  preferredReminderTime?: string | null;
}

export const UserProfileSchema = z.object({
  age: z.coerce.number().positive("Age must be a positive number.").optional().nullable(),
  weightLbs: z.coerce.number().positive("Weight must be a positive number.").optional().nullable(),
  raceEthnicity: z.enum(RaceEthnicityOptions).optional().nullable(),
  gender: z.enum(GenderOptions).optional().nullable(),
  medicalConditions: z.string()
    .transform(value => value ? value.split(',').map(item => item.trim()).filter(item => item.length > 0) : [])
    .optional()
    .nullable(),
  medications: z.string().optional().nullable(), // Added medications to profile schema
  preferredReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM.")
    .optional()
    .nullable(),
});

export type UserProfileFormData = z.infer<typeof UserProfileSchema>;
