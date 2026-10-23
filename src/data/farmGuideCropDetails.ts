export interface FarmGuideCropDetail {
  image: string;
  imageAlt: string;
  about: string;
  plantingNotes: string[];
}

// General crop descriptions and planting steps shown in the Farm Guide details cards.
export const farmGuideCropDetails: Record<string, FarmGuideCropDetail> = {
  Cassava: {
    image: '/assets/thumb-cassava.png',
    imageAlt: 'Cassava plant growing in a field',
    about: 'A root crop commonly established from stem cuttings.',
    plantingNotes: ['Choose healthy, mature stems from vigorous plants.', 'Place suitable stem cuttings into loose, moist soil and follow local advice on cutting size, angle, and spacing.'],
  },
  Cowpea: {
    image: '/assets/cowpea-guide.jpg',
    imageAlt: 'Cowpea plant with green pods',
    about: 'A grain legume grown for its edible seeds and leaves.',
    plantingNotes: ['Use clean seed and sow into moist, well-drained soil.', 'Keep the young crop weed-free and avoid waterlogged plots; ask locally about variety and spacing.'],
  },
  Groundnut: {
    image: '/assets/groundnut-guide.jpg',
    imageAlt: 'Groundnut plant flowering in a field',
    about: 'A legume whose pods develop below the soil surface.',
    plantingNotes: ['Use sound seed and handle it gently to avoid damaging the seed coat.', 'Plant in loose, well-drained soil and keep the crop weed-free early; confirm spacing and seed treatment locally.'],
  },
  'Irish potato': {
    image: '/assets/irish-potato-guide.jpg',
    imageAlt: 'Irish potato plant and harvested tubers',
    about: 'A tuber crop that needs a locally suitable variety and growing conditions.',
    plantingNotes: ['Use healthy, locally suitable seed tubers in loose, well-drained soil.', 'Check that the variety and season suit your area, then follow local guidance on planting depth and earthing up.'],
  },
  Maize: {
    image: '/assets/thumb-maize.png',
    imageAlt: 'Maize plants growing in a field',
    about: 'A cereal crop grown from seed, with varieties suited to different conditions.',
    plantingNotes: ['Use clean seed of a variety recommended for your area.', 'Sow into moist soil, keep weeds under control while plants are young, and confirm row spacing locally.'],
  },
  Millet: {
    image: '/assets/millet-guide.jpg',
    imageAlt: 'Millet grain heads growing in a field',
    about: 'A cereal crop with varieties used in drier parts of Nigeria.',
    plantingNotes: ['Choose seed suited to your local conditions and prepare a weed-free seedbed.', 'Sow when the soil has adequate moisture, then thin crowded stands and weed early as locally advised.'],
  },
  Rice: {
    image: '/assets/rice-guide.jpg',
    imageAlt: 'Rice panicles growing in a paddy field',
    about: 'A cereal crop with varieties and methods suited to different field and water conditions.',
    plantingNotes: ['Choose a variety and production method suited to your field (upland or lowland).', 'Use clean seed and follow local guidance for direct sowing or transplanting; plan around dependable water access.'],
  },
  Sorghum: {
    image: '/assets/sorghum-guide.jpg',
    imageAlt: 'Sorghum grain heads growing in a field',
    about: 'A cereal crop with locally adapted varieties across several Nigerian farming zones.',
    plantingNotes: ['Select clean seed of a variety recommended for your locality.', 'Sow into adequately moist soil, thin crowded plants, and control weeds early using local spacing advice.'],
  },
  Soybean: {
    image: '/assets/soybean-guide.jpg',
    imageAlt: 'Soybean pods growing on the plant',
    about: 'A grain legume grown for its protein-rich seeds.',
    plantingNotes: ['Use clean, viable seed and a variety suited to your area.', 'Plant in well-drained soil, avoid waterlogging, and follow local recommendations for spacing and seed treatment.'],
  },
  Tomato: {
    image: '/assets/tomato-guide.jpg',
    imageAlt: 'Tomatoes ripening on the plant',
    about: 'A fruit vegetable commonly started in a nursery before transplanting.',
    plantingNotes: ['Start with healthy seedlings and transplant them into prepared, well-drained soil.', 'Maintain even soil moisture, support plants where needed, and monitor regularly for pests and disease.'],
  },
  Yam: {
    image: '/assets/yam-guide.jpg',
    imageAlt: 'Yam tuber beside a growing yam vine',
    about: 'A tuber crop commonly planted using seed yams or prepared setts.',
    plantingNotes: ['Select healthy planting material and prepare mounds or ridges using local practice.', 'Plant into moist soil, protect the setts from damage, and provide vine support where customary.'],
  },
};
