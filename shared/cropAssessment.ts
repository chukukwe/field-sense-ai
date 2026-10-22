export type CropType = 'Cassava' | 'Plantain' | 'Maize' | 'Vegetables' | 'Other';

export interface CropAssessment {
  status: 'completed' | 'inconclusive';
  cropIdentification: CropType | 'unknown';
  observedSymptoms: string[];
  possibleCauses: Array<{
    name: string;
    explanation: string;
    likelihood: 'possible' | 'more_likely' | 'uncertain';
  }>;
  confidence: 'low' | 'moderate' | 'high';
  confidenceReason: string;
  summary: string;
  recommendedActions: string[];
  preventionTips: string[];
  whenToSeekHelp: string;
  limitations: string[];
  disclaimer: string;
}
