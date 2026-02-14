export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  ageMonthsMin: number;
  ageMonthsMax: number;
  category: 'feeding' | 'sleep' | 'development' | 'health' | 'safety' | 'play';
  source: string;
}

export const articles: Article[] = [
  // ─── 0-1 month ───
  {
    id: 'newborn-feeding-basics',
    title: 'Feeding Your Newborn',
    summary: 'How often and how much to feed in the first weeks.',
    content: 'Newborns need to eat every 2-3 hours, or 8-12 times per day. Breastfed babies may nurse for 10-20 minutes per breast. Formula-fed babies typically take 1-2 oz per feeding in the first week, increasing to 2-3 oz by 2 weeks. Watch for hunger cues: rooting, lip smacking, and hand-to-mouth movements.',
    ageMonthsMin: 0, ageMonthsMax: 1,
    category: 'feeding', source: 'AAP',
  },
  {
    id: 'newborn-sleep-patterns',
    title: 'Newborn Sleep Patterns',
    summary: 'What to expect from your baby\'s sleep in the first month.',
    content: 'Newborns sleep 14-17 hours per day in 2-4 hour stretches. They don\'t distinguish day from night yet. Always place baby on their back to sleep, on a firm flat surface with no loose bedding. Room sharing (not bed sharing) is recommended for at least the first 6 months.',
    ageMonthsMin: 0, ageMonthsMax: 1,
    category: 'sleep', source: 'AAP Safe Sleep Guidelines',
  },
  {
    id: 'newborn-umbilical-care',
    title: 'Umbilical Cord Care',
    summary: 'How to care for the cord stump until it falls off.',
    content: 'Keep the umbilical cord stump clean and dry. Fold diapers below the stump. It typically falls off in 1-3 weeks. Sponge bathe only until it falls off. Contact your doctor if you notice redness, swelling, pus, or a foul smell.',
    ageMonthsMin: 0, ageMonthsMax: 1,
    category: 'health', source: 'AAP',
  },
  {
    id: 'tummy-time-start',
    title: 'Starting Tummy Time',
    summary: 'Begin tummy time from day one to build strength.',
    content: 'Start tummy time from the first day home. Begin with 3-5 minutes, 2-3 times a day. Place baby on your chest or a firm surface while awake and supervised. Tummy time builds neck, shoulder, and arm strength needed for later milestones like rolling and crawling.',
    ageMonthsMin: 0, ageMonthsMax: 1,
    category: 'play', source: 'AAP',
  },

  // ─── 1-2 months ───
  {
    id: 'two-month-vaccines',
    title: 'Two-Month Vaccinations',
    summary: 'What to expect at the 2-month well visit.',
    content: 'At 2 months, babies receive several important vaccines: DTaP, IPV, Hib, PCV13, RV, and HepB (2nd dose). Side effects may include fussiness, mild fever, and soreness at injection sites. You can comfort your baby with extra feedings and skin-to-skin contact.',
    ageMonthsMin: 1, ageMonthsMax: 2,
    category: 'health', source: 'CDC Immunization Schedule',
  },
  {
    id: 'social-smiles',
    title: 'First Social Smiles',
    summary: 'Your baby\'s first real smiles are a big milestone.',
    content: 'Around 6-8 weeks, babies begin to smile in response to faces and voices — this is a true social smile, different from the reflexive smiles of the newborn period. Encourage smiling by talking, singing, and making eye contact with your baby.',
    ageMonthsMin: 1, ageMonthsMax: 2,
    category: 'development', source: 'CDC Milestones',
  },
  {
    id: 'colic-tips',
    title: 'Dealing with Colic',
    summary: 'Strategies for managing excessive crying.',
    content: 'Colic peaks around 6 weeks and usually improves by 3-4 months. Try the "5 S\'s": Swaddling, Side/stomach position (while held), Shushing, Swinging, and Sucking. Take breaks when you feel overwhelmed — it\'s okay to put baby in a safe place and step away briefly.',
    ageMonthsMin: 1, ageMonthsMax: 3,
    category: 'health', source: 'AAP',
  },

  // ─── 2-4 months ───
  {
    id: 'sleep-regression-4mo',
    title: '4-Month Sleep Regression',
    summary: 'Why your baby suddenly stopped sleeping well.',
    content: 'Around 3-4 months, many babies experience a sleep regression as their sleep cycles mature to be more adult-like. They may wake more frequently and resist naps. Maintain consistent bedtime routines, keep the room dark and cool, and consider starting gentle sleep training if appropriate for your family.',
    ageMonthsMin: 3, ageMonthsMax: 5,
    category: 'sleep', source: 'AAP',
  },
  {
    id: 'rolling-over',
    title: 'Rolling Over',
    summary: 'When to expect rolling and how to keep baby safe.',
    content: 'Most babies start rolling tummy-to-back around 3-4 months, and back-to-tummy by 5-6 months. Once baby shows signs of rolling, stop swaddling with arms in. Always place baby on their back to sleep, even if they roll over on their own — rolling babies can be left in the position they find.',
    ageMonthsMin: 3, ageMonthsMax: 6,
    category: 'development', source: 'CDC Milestones',
  },
  {
    id: 'teething-signs',
    title: 'Early Teething Signs',
    summary: 'Recognize the signs that teeth may be coming.',
    content: 'Some babies start teething as early as 3 months, though the first tooth typically appears around 6 months. Signs include increased drooling, gnawing on objects, irritability, and swollen gums. Teething does NOT cause high fever — contact your doctor if temperature exceeds 100.4°F (38°C).',
    ageMonthsMin: 3, ageMonthsMax: 8,
    category: 'health', source: 'AAP',
  },

  // ─── 4-6 months ───
  {
    id: 'starting-solids',
    title: 'Starting Solid Foods',
    summary: 'Signs of readiness and how to introduce first foods.',
    content: 'Most babies are ready for solids around 6 months. Signs of readiness: can sit with support, good head control, shows interest in food, and has lost the tongue-thrust reflex. Start with iron-fortified single-grain cereal or pureed vegetables/fruits. Introduce one new food every 3-5 days to watch for allergies.',
    ageMonthsMin: 4, ageMonthsMax: 7,
    category: 'feeding', source: 'AAP & WHO',
  },
  {
    id: 'sitting-up',
    title: 'Learning to Sit',
    summary: 'Supporting your baby\'s journey to independent sitting.',
    content: 'Babies typically begin sitting with support around 4-5 months and independently by 6-7 months. Practice by propping baby in a sitting position with pillows around them. Tummy time and reaching for toys while on their stomach builds the core strength needed for sitting.',
    ageMonthsMin: 4, ageMonthsMax: 7,
    category: 'development', source: 'CDC Milestones',
  },

  // ─── 6-9 months ───
  {
    id: 'baby-led-weaning',
    title: 'Baby-Led Weaning Basics',
    summary: 'Letting your baby self-feed with finger foods.',
    content: 'Baby-led weaning (BLW) involves offering soft finger foods instead of purees. Good starter foods: ripe avocado strips, steamed sweet potato sticks, banana, and soft-cooked broccoli. Cut foods into finger-length pieces that baby can grasp. Always supervise meals and learn the difference between gagging (normal) and choking (emergency).',
    ageMonthsMin: 6, ageMonthsMax: 9,
    category: 'feeding', source: 'AAP',
  },
  {
    id: 'separation-anxiety',
    title: 'Separation Anxiety',
    summary: 'Why your baby cries when you leave the room.',
    content: 'Separation anxiety typically peaks between 8-10 months. It\'s a normal sign of healthy attachment and developing object permanence. To help: practice brief separations, establish a consistent goodbye routine, don\'t sneak away, and reassure your baby you\'ll return. It usually resolves by 18-24 months.',
    ageMonthsMin: 6, ageMonthsMax: 12,
    category: 'development', source: 'AAP',
  },
  {
    id: 'crawling',
    title: 'Getting Ready to Crawl',
    summary: 'Supporting your baby\'s first mobile adventures.',
    content: 'Most babies crawl between 7-10 months, though some skip crawling entirely and go straight to cruising or walking. Encourage crawling by placing toys just out of reach during tummy time. Baby-proof your home: cover outlets, gate stairs, secure furniture, and move hazards out of reach.',
    ageMonthsMin: 6, ageMonthsMax: 10,
    category: 'development', source: 'CDC Milestones',
  },
  {
    id: 'childproofing',
    title: 'Childproofing Your Home',
    summary: 'Essential safety measures for mobile babies.',
    content: 'Before baby starts crawling, childproof your home: install safety gates at stairs, cover electrical outlets, secure heavy furniture to walls, use cabinet locks, remove small objects that pose choking hazards, and keep blind cords out of reach. Get on your hands and knees to see hazards from baby\'s perspective.',
    ageMonthsMin: 5, ageMonthsMax: 12,
    category: 'safety', source: 'AAP',
  },

  // ─── 9-12 months ───
  {
    id: 'first-words',
    title: 'First Words and Language',
    summary: 'Encouraging your baby\'s language development.',
    content: 'Most babies say their first meaningful word around 12 months, but they understand many words before that. Encourage language: narrate your day, read board books, sing songs, respond to babbling, and name objects your baby points to. By 12 months, baby should respond to their name and simple requests.',
    ageMonthsMin: 9, ageMonthsMax: 14,
    category: 'development', source: 'CDC Milestones',
  },
  {
    id: 'first-birthday-food',
    title: 'Transitioning to Table Foods',
    summary: 'Expanding your baby\'s diet near the first birthday.',
    content: 'By 9-12 months, babies can eat most family foods cut into small pieces. Introduce whole milk after 12 months (not before). Avoid honey until after age 1 due to botulism risk. Offer a variety of textures to develop chewing skills. The pincer grasp (thumb and forefinger) develops around 9 months, making self-feeding easier.',
    ageMonthsMin: 9, ageMonthsMax: 13,
    category: 'feeding', source: 'AAP & WHO',
  },
  {
    id: 'first-steps',
    title: 'First Steps and Walking',
    summary: 'When to expect walking and how to encourage it.',
    content: 'Most babies take their first independent steps between 9-15 months, with the average around 12 months. Cruising along furniture typically comes first. Go barefoot indoors when possible for better balance. Push toys can help build confidence. Don\'t use baby walkers — the AAP advises against them due to injury risk.',
    ageMonthsMin: 9, ageMonthsMax: 15,
    category: 'development', source: 'AAP',
  },
  {
    id: 'one-year-checkup',
    title: 'The One-Year Well Visit',
    summary: 'What to expect at your baby\'s 12-month appointment.',
    content: 'The 12-month well visit includes: growth measurements, developmental screening, blood tests for lead and anemia, and vaccinations (MMR, varicella, Hep A). Your doctor will discuss transitioning from formula/breast to whole milk, weaning from bottles, and dental health. Write down your questions beforehand.',
    ageMonthsMin: 11, ageMonthsMax: 13,
    category: 'health', source: 'AAP',
  },

  // ─── 12-18 months ───
  {
    id: 'toddler-tantrums',
    title: 'Understanding Tantrums',
    summary: 'Why toddlers have meltdowns and how to respond.',
    content: 'Tantrums are a normal part of development as toddlers experience big emotions without the language to express them. Stay calm, ensure safety, validate feelings ("I see you\'re frustrated"), and avoid giving in to unreasonable demands. Distraction works well for younger toddlers. Most tantrums last 1-3 minutes.',
    ageMonthsMin: 12, ageMonthsMax: 36,
    category: 'development', source: 'AAP',
  },
  {
    id: 'weaning-bottle',
    title: 'Weaning from the Bottle',
    summary: 'Tips for transitioning to cups around 12 months.',
    content: 'The AAP recommends weaning from bottles by 12-18 months. Start by offering a cup at meals around 6-9 months. Replace one bottle at a time, starting with the easiest one to drop (often the midday bottle). The bedtime bottle is usually the last to go. Use a straw cup or open cup — skip sippy cups if possible.',
    ageMonthsMin: 12, ageMonthsMax: 18,
    category: 'feeding', source: 'AAP',
  },
  {
    id: 'toddler-sleep',
    title: 'Toddler Sleep Needs',
    summary: 'How much sleep your toddler needs and nap transitions.',
    content: 'Toddlers (12-24 months) need 11-14 hours of sleep per day including naps. Most transition from two naps to one around 12-18 months. Signs it\'s time for one nap: refusing the morning nap, taking very long to fall asleep at nap time, or bedtime pushback. Keep a consistent sleep schedule even on weekends.',
    ageMonthsMin: 12, ageMonthsMax: 24,
    category: 'sleep', source: 'AAP',
  },

  // ─── 18-24 months ───
  {
    id: 'potty-readiness',
    title: 'Signs of Potty Training Readiness',
    summary: 'Is your toddler ready for potty training?',
    content: 'Most children are ready between 18-30 months. Signs of readiness: stays dry for 2+ hours, shows interest in the potty, can pull pants up/down, dislikes wet diapers, can follow simple instructions, and tells you when they need to go. Don\'t rush — early pushing often backfires.',
    ageMonthsMin: 18, ageMonthsMax: 30,
    category: 'development', source: 'AAP',
  },
  {
    id: 'language-explosion',
    title: 'The Language Explosion',
    summary: 'Your toddler\'s vocabulary is about to take off.',
    content: 'Between 18-24 months, most toddlers experience a "vocabulary explosion," going from about 50 words to 200+ words. They start combining two words ("more milk," "daddy go"). Read together daily, ask open-ended questions, and expand on what they say ("Yes, that\'s a big red truck!"). Talk to your doctor if your child has fewer than 50 words by 24 months.',
    ageMonthsMin: 18, ageMonthsMax: 24,
    category: 'development', source: 'CDC Milestones',
  },

  // ─── General / 0-24 months ───
  {
    id: 'vitamin-d-supplement',
    title: 'Vitamin D for Babies',
    summary: 'Why most babies need a daily vitamin D supplement.',
    content: 'The AAP recommends 400 IU of vitamin D daily for all breastfed and partially breastfed infants, starting in the first few days of life. Formula-fed babies receiving less than 32 oz/day also need supplementation. Vitamin D is essential for bone health and immune function. Continue until your child drinks 32 oz of vitamin D-fortified milk daily.',
    ageMonthsMin: 0, ageMonthsMax: 24,
    category: 'health', source: 'AAP',
  },
  {
    id: 'safe-sleep-always',
    title: 'Safe Sleep Guidelines',
    summary: 'ABCs of safe sleep: Alone, on Back, in Crib.',
    content: 'For every sleep: place baby Alone, on their Back, in a Crib with a firm flat mattress and fitted sheet only. No blankets, pillows, bumpers, or stuffed animals until at least 12 months. Keep room at 68-72°F (20-22°C). A wearable blanket/sleep sack is a safe alternative to loose blankets.',
    ageMonthsMin: 0, ageMonthsMax: 12,
    category: 'safety', source: 'AAP Safe Sleep Guidelines',
  },
  {
    id: 'reading-from-birth',
    title: 'Reading to Your Baby',
    summary: 'It\'s never too early to start reading together.',
    content: 'Reading aloud from birth supports language development, bonding, and early literacy. For newborns, it\'s about hearing your voice and rhythm. By 6 months, babies enjoy looking at high-contrast images and touching textured books. By 12 months, they can point to pictures and turn pages. Make reading part of your daily routine — even 5 minutes makes a difference.',
    ageMonthsMin: 0, ageMonthsMax: 24,
    category: 'play', source: 'AAP',
  },
  {
    id: 'screen-time',
    title: 'Screen Time Guidelines',
    summary: 'What the AAP recommends about screens for babies.',
    content: 'The AAP recommends NO screen time (except video chatting) for children under 18 months. From 18-24 months, only high-quality programming watched together with a caregiver. Young children learn best from face-to-face interaction, not screens. If you use screens, choose slow-paced, educational content and talk about what you\'re watching.',
    ageMonthsMin: 0, ageMonthsMax: 24,
    category: 'development', source: 'AAP',
  },
];

export function getArticlesForAge(ageMonths: number): Article[] {
  return articles.filter(a => ageMonths >= a.ageMonthsMin && ageMonths <= a.ageMonthsMax);
}

