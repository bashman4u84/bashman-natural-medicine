export const CONDITIONS = {
  'hepatitis-b': {
    name: 'Hepatitis B',
    organ: 'liver',
    tagline: 'The silent viral burden weighing on your liver',
    happening:
      'The Hepatitis B virus slips into liver cells and hijacks them, multiplying quietly for years. The liver fights back with inflammation; left unsupported, that fire slowly scars the organ (fibrosis) and drains the energy your blood deserves.',
    causes: ['HBV virus via blood or body fluids', 'Mother-to-child at birth', 'Shared blades or unsterile needles', 'Unprotected intimacy', 'Weakened immune defence'],
    symptoms: ['Yellowing eyes & skin', 'Constant fatigue', 'Dark urine', 'Swollen or painful abdomen', 'Loss of appetite & nausea', 'Joint aches'],
    remedies: [
      { name: 'Phyllanthus niruri protocol', note: 'A cornerstone herb of our Hepatitis program, traditionally used to help the liver clear viral particles and calm inflammation.' },
      { name: 'Black seed & raw honey', note: 'The Prophet ﷺ taught that in the black seed is healing for every disease. We pair it with raw honey as a daily immune tonic.' },
      { name: 'Milk thistle (silymarin)', note: 'Shields liver cells and supports regeneration of healthy hepatocytes.' },
      { name: 'Hijama (prophetic cupping)', note: 'Wet cupping at sunnah points to lift stagnation and relieve the toxic load on the liver.' },
      { name: 'Liver-cleanse diet', note: 'Beetroot, dandelion greens, olive oil and strict abstinence from alcohol and processed fats.' }
    ],
    hotspots: [
      { pos: [0.55, 0.2, 0.55], title: 'Inflamed right lobe', body: 'Virus-filled cells swell and redden — this is where ALT/AST enzymes leak into the blood.' },
      { pos: [-0.72, 0.3, 0.4], title: 'Viral replication zone', body: 'HBV hijacks cell machinery here, copying itself millions of times per day.' },
      { pos: [0.26, -0.44, 0.5], title: 'Gallbladder under pressure', body: 'Swelling squeezes the bile sac — one cause of the dark urine and nausea you feel.' }
    ]
  },
  ulcer: {
    name: 'Peptic Ulcer',
    organ: 'stomach',
    tagline: 'When acid burns through your stomach’s shield',
    happening:
      'A mucus lining protects the stomach from its own acid. H. pylori bacteria and painkillers weaken that shield until acid burns an open crater — the gnawing pain you feel on an empty stomach.',
    causes: ['H. pylori infection', 'Frequent painkillers (NSAIDs)', 'Skipping meals / late-night eating', 'Chronic stress & poor sleep', 'Alcohol, smoking, excess pepper'],
    symptoms: ['Burning pain before meals', 'Bloating & belching', 'Heartburn / acid reflux', 'Nausea after eating', 'Dark, tarry stool', 'Feeling full too quickly'],
    remedies: [
      { name: 'Raw honey dose protocol', note: 'Prophetic medicine at its finest — honey coats the wound and its enzymes starve H. pylori.' },
      { name: 'Black seed oil', note: 'Taken warm before meals to calm acid and heal the eroded lining.' },
      { name: 'Cabbage–pawpaw enzyme juice', note: 'Rich natural glutamine and papain to rebuild the mucus wall fast.' },
      { name: 'Licorice root (chewed)', note: 'Stimulates protective mucus — our patients call it “natural antacid without the rebound.”' },
      { name: 'Sunnah meal-timing plan', note: 'Two-third rule, never eat to fullness, structured fasting windows so ulcers close permanently.' }
    ],
    hotspots: [
      { pos: [-0.62, 0.05, 0.45], title: 'Eroded mucus shield', body: 'The pink protective coat is worn thin — acid touches raw flesh here first.' },
      { pos: [-0.05, -0.52, 0.45], title: 'H. pylori colony', body: 'Spiral bacteria drill into the lining, keeping the wound from closing.' },
      { pos: [-0.42, 0.75, 0.35], title: 'Acid surge zone', body: 'Where reflux burns upward — the source of that sour night-time heartburn.' }
    ]
  },
  typhoid: {
    name: 'Typhoid & Malaria',
    organ: 'intestines',
    tagline: 'Fever that begins in the gut and floods the blood',
    happening:
      'Typhoid bacteria enter through contaminated food and water, burrow through the gut wall and pour into the bloodstream. Malaria parasites join in, destroying red cells — together they produce the stubborn fevers that drain Nigerians for weeks.',
    causes: ['Contaminated water or food', 'Poor hand hygiene', 'Mosquito bites (malaria)', 'Weak digestive immunity', 'Untreated gut inflammation'],
    symptoms: ['Stepwise rising fever', 'Bitter tongue & mouth', 'Abdominal pain', 'Extreme weakness', 'Headache behind the eyes', 'Rose-coloured skin spots'],
    remedies: [
      { name: 'Neem (dogoyaro) therapy', note: 'Bitter leaves steeped as tea — a traditional fever-clearer across West Africa for generations.' },
      { name: 'Bitter leaf & scent leaf blend', note: 'Cools the blood, supports the gut wall and drives out the bitter-mouth feeling.' },
      { name: 'Lime, garlic & ginger infusion', note: 'An antimicrobial trio that cleanses the digestive tract and revives appetite.' },
      { name: 'Moringa rebuild', note: 'Restores iron and nutrients the parasites stole from your blood.' },
      { name: 'Hygiene & water protocol', note: 'We teach the household habits that stop re-infection for good.' }
    ],
    hotspots: [
      { pos: [0.3, 0.12, 0.5], title: 'Bacteria breaching the gut wall', body: 'Salmonella tunnels through the intestinal lining into nearby lymph nodes.' },
      { pos: [-0.68, -0.12, 0.4], title: 'Inflamed colon', body: 'Toxin build-up irritates the large intestine — cramps and urgent stools follow.' },
      { pos: [0.02, -0.8, 0.5], title: 'Absorption blocked', body: 'A wounded gut cannot absorb iron or vitamins — the root of the weakness you feel.' }
    ]
  },
  hypertension: {
    name: 'Hypertension',
    organ: 'heart',
    tagline: 'When the river of life pushes too hard',
    happening:
      'Narrowed, stiffened arteries force the heart to pump against resistance. Pressure rises silently, thickening the heart muscle and scoring the vessel walls — until something gives.',
    causes: ['Salt-heavy, oil-heavy diet', 'Chronic stress & anxiety', 'Physical inactivity', 'Excess weight', 'Hereditary tendency'],
    symptoms: ['Throbbing headaches', 'Dizziness on standing', 'Chest flutter or tightness', 'Blurred vision', 'Nosebleeds', 'Often no symptom at all'],
    remedies: [
      { name: 'Garlic capsule protocol', note: 'The Prophet ﷺ spoke of garlic’s strength — modern trials agree it relaxes vessels naturally.' },
      { name: 'Unsweetened hibiscus (zobo) tea', note: 'Our chilled daily prescription shown to ease systolic pressure gently.' },
      { name: 'Olive oil & olive leaf', note: 'A prophetic staple — polyphenols keep arteries elastic and calm.' },
      { name: 'Ruqyah & breathing therapy', note: 'Calming the heart spiritually and physiologically — stress is half the disease.' },
      { name: 'Hijama circulation program', note: 'Targeted cupping to release stagnation and lighten the cardiac load.' }
    ],
    hotspots: [
      { pos: [0.08, -0.3, 0.7], title: 'Overworked left chamber', body: 'Pumping against narrow arteries thickens this wall — an early warning sign.' },
      { pos: [0.28, 1.02, 0.2], title: 'Stiff aortic arch', body: 'Years of pressure scar the great artery, raising your numbers further.' },
      { pos: [-0.42, 0.85, 0.3], title: 'Vessels under strain', body: 'Tiny vessels in eyes and kidneys suffer first — silence is not safety.' }
    ]
  },
  diabetes: {
    name: 'Type-2 Diabetes',
    organ: 'pancreas',
    tagline: 'The sugar gatekeeper losing its key',
    happening:
      'Your pancreas makes insulin — the key that lets sugar leave the blood and feed your cells. Years of refined sugar and sedentary living wear the keys out, so sugar lingers in the blood, corroding nerves, kidneys and eyes.',
    causes: ['Refined sugar & carbohydrate overload', 'Sedentary lifestyle', 'Excess abdominal weight', 'Family history', 'Chronic sleep debt'],
    symptoms: ['Unquenchable thirst', 'Frequent urination at night', 'Slow-healing wounds', 'Blurry vision', 'Tiredness after meals', 'Tingling feet'],
    remedies: [
      { name: 'Fenugreek (helba) seeds', note: 'Soaked overnight and taken at dawn — a prophetic seed proven to steady blood sugar.' },
      { name: 'Black seed oil', note: 'Taken twice daily to improve insulin sensitivity, as studied in clinical trials.' },
      { name: 'Bitter melon & cinnamon blend', note: 'Nature’s insulin mimics, blended into our morning metabolic tonic.' },
      { name: 'Prophetic portion-fasting', note: 'One-third food, one-third water, one-third air — the Sunnah plate rebuilt for glucose control.' },
      { name: 'Walking sunnah schedule', note: 'Post-meal walks timed to flatten sugar spikes — simple, free, powerful.' }
    ],
    hotspots: [
      { pos: [0.78, 0.18, 0.4], title: 'Exhausted beta cells', body: 'Insulin factories here burn out after years of sugar floods.' },
      { pos: [0.0, -0.04, 0.35], title: 'Insulin output falling', body: 'Production dips below demand — sugar creeps up in every meal’s aftermath.' },
      { pos: [-0.75, 0.24, 0.35], title: 'Fatty tail infiltration', body: 'Fat crowds the gland, strangling what function remains.' }
    ]
  },
  kidney: {
    name: 'Kidney Disease',
    organ: 'kidneys',
    tagline: 'Filters of life, clogging quietly',
    happening:
      'Kidneys filter 50 gallons of blood daily. Stones, toxins, high blood pressure and sugar gradually choke their tiny filters, so waste lingers in your body — swelling your legs, fogging your mind and tiring your bones.',
    causes: ['Chronic dehydration', 'High salt intake', 'Uncontrolled BP & sugar', 'Recurrent infections', 'Painkiller overuse'],
    symptoms: ['Flank or lower-back pain', 'Foamy or bloody urine', 'Swollen feet & face', 'Difficulty or pain passing urine', 'Persistent fatigue', 'Metallic taste'],
    remedies: [
      { name: 'Stone-breaker flush', note: 'Chanca piedra (“stone breaker”) tea protocol that softens and sweeps gravel naturally.' },
      { name: 'Corn silk & parsley decoction', note: 'A gentle diuretic cleanse that soothes inflamed filters and eases flow.' },
      { name: 'Watermelon & barley water', note: 'The Prophet ﷺ paired watermelon with dates — our hydrating kidney-cooling ritual.' },
      { name: 'Salt-reset nutrition', note: 'A flavourful low-salt herb plan so your kidneys rest while they heal.' },
      { name: 'BP & sugar co-management', note: 'Because kidneys fail when these two run wild — we treat all three together.' }
    ],
    hotspots: [
      { pos: [0.7, 0.16, 0.4], title: 'Clogged micro-filters', body: 'Nephrons choke on protein and sugar debris — foam in urine is their cry.' },
      { pos: [-0.36, -0.46, 0.35], title: 'Stone in the ureter', body: 'A crystal lodged mid-passage — the cause of waves of sharp flank pain.' },
      { pos: [0.0, -1.1, 0.55], title: 'Irritated bladder', body: 'Backed-up waste burns the bladder wall, urging you day and night.' }
    ]
  }
}

export const CONDITION_ORDER = ['hepatitis-b', 'ulcer', 'typhoid', 'hypertension', 'diabetes', 'kidney']

export const ORGAN_META = {
  liver: { label: 'The Liver', sub: 'Your chemical factory & blood purifier' },
  stomach: { label: 'The Stomach', sub: 'Where digestion begins — and breaks' },
  intestines: { label: 'The Intestines', sub: 'The gateway between food and blood' },
  heart: { label: 'The Heart', sub: 'The engine of the river of life' },
  pancreas: { label: 'The Pancreas', sub: 'The quiet guardian of blood sugar' },
  kidneys: { label: 'The Kidneys', sub: 'Twin filters working day and night' }
}
