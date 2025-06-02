
import type { ExtractBloodPressureDataOutput } from "@/ai/flows/extract-blood-pressure-data";
import type { AnalyzeBloodPressureTrendOutput } from "@/ai/flows/analyze-blood-pressure-trend";
import { z } from "zod";

export const BodyPositionOptions = ["Sitting", "Standing", "Lying Down", "Other"] as const;
export type BodyPosition = typeof BodyPositionOptions[number];

export const ExerciseContextOptions = ["Resting", "Pre-Exercise", "During Exercise", "Post-Exercise"] as const;
export type ExerciseContext = typeof ExerciseContextOptions[number];

export const StaticSymptomsList = ["Dizzy", "Headache", "Lightheaded", "Fatigue", "Shortness of Breath", "Chest Pain", "Swelling", "Blurred Vision", "None"] as const;
export type Symptom = typeof StaticSymptomsList[number];

export interface BloodPressureReading {
  id: string;
  timestamp: string;
  systolic: number;
  diastolic: number;
  pulse?: number; // Added
  bodyPosition: BodyPosition;
  exerciseContext: ExerciseContext;
  symptoms?: Symptom[];
}

export type OcrData = ExtractBloodPressureDataOutput; // Assumes OCR output might not have pulse yet

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
  pulse: z.coerce.number({invalid_type_error: "Pulse must be a number"}).positive("Pulse must be positive").optional().nullable(), // Added
  bodyPosition: z.enum(BodyPositionOptions, { required_error: "Body position is required." }),
  exerciseContext: z.enum(ExerciseContextOptions, { required_error: "Exercise context is required." }),
  symptoms: z.array(z.enum(StaticSymptomsList)).optional(),
});

export type ReadingFormData = z.infer<typeof ReadingFormSchema>;


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
export type RaceEthnicity = typeof RaceEthnicityOptions[number] | null;

export const GenderOptions = [
    "Male",
    "Female",
    "Non-binary",
    "Other",
    "Prefer not to say"
] as const;
export type Gender = typeof GenderOptions[number] | null;

export const PreferredMailClientOptions = ["Default (mailto:)", "Gmail", "Outlook.com"] as const;
export type PreferredMailClient = typeof PreferredMailClientOptions[number] | null;


export interface UserProfile {
  age?: number | null;
  weightLbs?: number | null;
  raceEthnicity?: RaceEthnicity;
  gender?: Gender;
  medicalConditions?: string[];
  medications?: string | null;
  preferredReminderTime?: string | null;
  preferredMailClient?: PreferredMailClient; // Added
}

export const UserProfileSchema = z.object({
  age: z.coerce.number().positive("Age must be a positive number.").optional().nullable(),
  weightLbs: z.coerce.number().positive("Weight must be a positive number.").optional().nullable(),
  raceEthnicity: z.enum(RaceEthnicityOptions).optional().nullable(),
  gender: z.enum(GenderOptions).optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  preferredReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM.")
    .optional()
    .nullable(),
  preferredMailClient: z.enum(PreferredMailClientOptions).optional().nullable(), // Added
});

export type UserProfileFormData = z.infer<typeof UserProfileSchema>;

export type UserProfileFormDataInternal = UserProfileFormData & {
  medicalConditions?: string | null;
};
