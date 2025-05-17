import { config } from 'dotenv';
config();

import '@/ai/flows/extract-blood-pressure-data.ts';
import '@/ai/flows/analyze-blood-pressure-trend.ts';