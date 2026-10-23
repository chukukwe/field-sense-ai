import type { CropAssessment, CropType } from '../types.js';

export interface ProviderFailure {
  code: string;
  status: number;
}

export interface SampleCropResult {
  source: 'sample';
  saved: false;
  cropType: CropType;
  title: string;
  possibleProblem: string;
  explanation: string;
  assessment: CropAssessment;
}

type SampleCropScenario = Omit<SampleCropResult, 'source' | 'saved'>;

const sampleResults: Partial<Record<CropType, SampleCropScenario>> = {
  Cassava: {
    cropType: 'Cassava',
    title: 'Dry, brown edges on cassava leaves',
    possibleProblem: 'Leaf edge damage',
    explanation: 'Dry or brown leaf edges can have different causes. This example cannot tell which one is responsible.',
    assessment: {
      status: 'inconclusive', cropIdentification: 'Cassava',
      observedSymptoms: ['Dry, brown areas along the edge of a leaf.'],
      possibleCauses: [{ name: 'Leaf stress or damage', explanation: 'Water stress, pests, disease, or physical damage can look alike. This example does not confirm a cause.', likelihood: 'uncertain' }],
      confidence: 'low', confidenceReason: 'This is prepared sample content. No photo was checked.',
      summary: 'Dry, brown leaf edges can have different causes. Check other cassava leaves too.',
      recommendedActions: ['Check the top and underside of nearby leaves.', 'Take a clear photo of the whole plant and one close leaf.', 'Ask a local farm adviser if the damage spreads.'],
      preventionTips: ['Use clean tools when working between plants.', 'Keep checking nearby plants for changes.'],
      whenToSeekHelp: 'Ask a local farm adviser if many plants change or the leaves keep getting worse.',
      limitations: ['This is a sample. It was not made from your photo.', 'A photo alone may not show the cause.'],
      disclaimer: 'Sample result only — not a check of your crop.',
    },
  },
  Plantain: {
    cropType: 'Plantain',
    title: 'Brown edges on plantain leaves',
    possibleProblem: 'Leaf edge damage',
    explanation: 'Dryness, rubbing, or other plant stress can affect leaf edges. This example cannot confirm the cause.',
    assessment: {
      status: 'inconclusive', cropIdentification: 'Plantain',
      observedSymptoms: ['Brown areas along a leaf edge.'],
      possibleCauses: [{ name: 'Leaf stress or damage', explanation: 'Several problems can look alike. This sample does not identify one cause.', likelihood: 'uncertain' }],
      confidence: 'low', confidenceReason: 'This is prepared sample content. No photo was checked.',
      summary: 'Brown leaf edges can have different causes. Check more than one leaf.',
      recommendedActions: ['Check whether new leaves also have brown edges.', 'Look for broken leaves or signs of pests.', 'Ask a local farm adviser if the damage spreads.'],
      preventionTips: ['Avoid damaging leaves while working around the plant.', 'Keep checking new leaves for changes.'],
      whenToSeekHelp: 'Ask a local farm adviser if new leaves are affected or the plant becomes weak.',
      limitations: ['This is a sample. It was not made from your photo.', 'A photo alone may not show the cause.'],
      disclaimer: 'Sample result only — not a check of your crop.',
    },
  },
  Maize: {
    cropType: 'Maize',
    title: 'Spots on maize leaves',
    possibleProblem: 'Leaf spots',
    explanation: 'Spots can have different causes. This example cannot identify a disease or confirm what caused them.',
    assessment: {
      status: 'inconclusive', cropIdentification: 'Maize',
      observedSymptoms: ['Small spots on a leaf.'],
      possibleCauses: [{ name: 'Leaf stress or disease', explanation: 'Several problems can look alike. This sample does not confirm pests or disease.', likelihood: 'uncertain' }],
      confidence: 'low', confidenceReason: 'This is prepared sample content. No photo was checked.',
      summary: 'Leaf spots can have different causes. Check other maize plants for changes.',
      recommendedActions: ['Look at both sides of nearby leaves.', 'Check whether spots appear on new leaves.', 'Ask a local farm adviser before using any spray.'],
      preventionTips: ['Check the crop often and note any new damage.', 'Use clean tools around the plants.'],
      whenToSeekHelp: 'Ask a local farm adviser if damage spreads quickly across the field.',
      limitations: ['This is a sample. It was not made from your photo.', 'A photo alone may not show the cause.'],
      disclaimer: 'Sample result only — not a check of your crop.',
    },
  },
  Vegetables: {
    cropType: 'Vegetables',
    title: 'Healthy-looking vegetable leaves',
    possibleProblem: 'No clear issue visible in this example',
    explanation: 'This example shows no clear leaf damage. A healthy-looking leaf does not prove the whole plant is free of problems.',
    assessment: {
      status: 'inconclusive', cropIdentification: 'Vegetables',
      observedSymptoms: [],
      possibleCauses: [],
      confidence: 'low', confidenceReason: 'This is prepared sample content. No photo was checked.',
      summary: 'No clear issue is shown in this example. Keep checking the crop as it grows.',
      recommendedActions: ['Check new leaves and the whole plant regularly.', 'Look for changes in growth, colour, or leaf shape.', 'Ask a local farm adviser if you notice a new problem.'],
      preventionTips: ['Keep checking the crop as it grows.', 'Use clean tools when working between plants.'],
      whenToSeekHelp: 'Ask a local farm adviser if you notice spreading damage or the plant starts to weaken.',
      limitations: ['This is a sample. It was not made from your photo.', 'A healthy-looking leaf does not show the condition of the whole plant.'],
      disclaimer: 'Sample result only — not a check of your crop.',
    },
  },
};

export function getSampleCropResult(cropType: CropType): SampleCropResult | undefined {
  const result = sampleResults[cropType];
  return result ? { ...result, source: 'sample', saved: false } : undefined;
}

/** Only known upstream availability failures can open a sample result. */
export function canOfferSampleCropResult(failure: ProviderFailure | undefined, cropType: CropType): boolean {
  if (!failure || typeof failure.code !== 'string' || !Number.isInteger(failure.status) || !getSampleCropResult(cropType)) return false;
  return (failure.code === 'GEMINI_QUOTA' && failure.status === 429)
    || (failure.code === 'GEMINI_TIMEOUT' && failure.status === 504)
    || (failure.code === 'GEMINI_UNAVAILABLE' && (failure.status === 502 || failure.status === 503))
    || (failure.code === 'ASSESSMENT_TIMEOUT' && (failure.status === 408 || failure.status === 504))
    || (failure.code === 'ASSESSMENT_UNAVAILABLE' && failure.status === 503);
}
