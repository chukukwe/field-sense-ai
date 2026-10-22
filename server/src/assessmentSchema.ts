import { z } from 'zod';
import type { CropAssessment } from '../../shared/cropAssessment.js';

export const cropTypes = ['Cassava', 'Plantain', 'Maize', 'Vegetables', 'Other'] as const;

export const assessmentSchema = z.object({
  status: z.enum(['completed', 'inconclusive']),
  cropIdentification: z.enum([...cropTypes, 'unknown']),
  observedSymptoms: z.array(z.string().min(1).max(400)).max(8),
  possibleCauses: z.array(z.object({
    name: z.string().min(1).max(120),
    explanation: z.string().min(1).max(500),
    likelihood: z.enum(['possible', 'more_likely', 'uncertain']),
  }).strict()).max(5),
  confidence: z.enum(['low', 'moderate', 'high']),
  confidenceReason: z.string().min(1).max(500),
  summary: z.string().min(1).max(800),
  recommendedActions: z.array(z.string().min(1).max(400)).max(8),
  preventionTips: z.array(z.string().min(1).max(400)).max(8),
  whenToSeekHelp: z.string().min(1).max(500),
  limitations: z.array(z.string().min(1).max(400)).max(8),
  disclaimer: z.string().min(1).max(300),
}).strict() satisfies z.ZodType<CropAssessment>;

export type CropAssessmentResult = CropAssessment;
