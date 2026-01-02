// Static article data for Learn tab
// Articles are filtered by baby's age and category

// Age stage labels for display
export const AGE_STAGES = {
    newborn: { label: 'NEWBORN', color: '#6b9b7a', ageRange: [0, 2] },
    infant: { label: 'INFANT', color: '#7b8eb8', ageRange: [3, 6] },
    baby: { label: 'BABY', color: '#b87b8e', ageRange: [7, 12] },
    toddler: { label: 'TODDLER', color: '#b8a07b', ageRange: [13, 24] },
};

// Get stage from age range
export const getStageFromAge = (ageRange) => {
    const minAge = ageRange[0];
    if (minAge <= 2) return 'newborn';
    if (minAge <= 6) return 'infant';
    if (minAge <= 12) return 'baby';
    return 'toddler';
};

export const CATEGORIES = {
    all: { label: 'All', icon: 'all' },
    sleep: { label: 'Sleep', icon: 'sleep' },
    feeding: { label: 'Feeding', icon: 'feeding' },
    health: { label: 'Health', icon: 'health' },
    development: { label: 'Development', icon: 'development' },
    safety: { label: 'Safety', icon: 'safety' },
};

export const articles = [
    {
        id: 'sleep-newborn-patterns',
        title: 'Understanding Newborn Sleep Patterns',
        summary: 'Why newborns sleep in short bursts and what to expect in the first months.',
        category: 'sleep',
        ageRange: [0, 3],
        tags: ['newborn', 'sleep', 'science'],
        readingTime: 4,
        source: 'AAP Guidelines',
        image: '/articles/article_sleep_newborn.png',
        content: `
# Understanding Newborn Sleep Patterns

Newborns typically sleep 16-17 hours per day, but in short bursts of 2-4 hours at a time. This pattern is completely normal and driven by biology.

## Why Short Sleep Cycles?

**1. Small Stomachs**
Newborns have tiny stomachs (about the size of a cherry at birth!) and need to feed every 2-3 hours.

**2. Immature Circadian Rhythm**
Babies aren't born knowing day from night. Their internal clock develops over the first 3-4 months.

**3. REM Sleep**
Newborns spend about 50% of sleep in REM (active sleep), compared to 20% for adults. This light sleep is important for brain development but means more frequent waking.

## What to Expect by Week

| Age | Total Sleep | Longest Stretch |
|-----|-------------|-----------------|
| 0-2 weeks | 16-18 hrs | 2-3 hours |
| 2-4 weeks | 15-17 hrs | 3-4 hours |
| 1-2 months | 14-16 hrs | 4-5 hours |
| 2-3 months | 14-16 hrs | 5-6 hours |

## Tips for Tired Parents

- **Sleep when baby sleeps** - This classic advice exists for a reason
- **Share night duties** - Take shifts if possible
- **Keep nights boring** - Low lights, quiet voices, no play
- **Safe sleep always** - Back to sleep, firm flat surface, nothing in crib

## When to Expect Longer Stretches

Most babies start sleeping longer stretches (5-6+ hours) between 3-6 months. Every baby is different, and regression is normal during growth spurts and developmental leaps.

> **Remember**: This exhausting phase is temporary. Your baby's sleep will consolidate as their brain and body mature.
        `
    },
    {
        id: 'safe-sleep-abc',
        title: 'Safe Sleep: The ABCs Every Parent Should Know',
        summary: 'Evidence-based safe sleep guidelines to reduce SIDS risk.',
        category: 'safety',
        ageRange: [0, 12],
        tags: ['safety', 'sleep', 'sids'],
        readingTime: 3,
        source: 'AAP Safe Sleep Guidelines 2022',
        image: '/articles/article_safe_sleep.png',
        content: `
# Safe Sleep: The ABCs

The American Academy of Pediatrics recommends the ABCs of safe sleep to reduce the risk of SIDS and other sleep-related deaths.

## A - Alone

Baby should sleep **alone** in their own sleep space.
- No bed-sharing with adults or other children
- No blankets, pillows, bumpers, or toys in sleep area
- No loose bedding

## B - Back

Baby should always be placed on their **back** to sleep.
- Every sleep, every time (naps and nighttime)
- Once baby can roll both ways (usually 4-6 months), you don't need to reposition them
- Tummy time when awake helps strengthen neck muscles

## C - Crib

Baby should sleep in a safety-approved **crib**, bassinet, or play yard.
- Firm, flat mattress with fitted sheet only
- No inclined sleepers, car seats, swings, or bouncers for sleep
- Meet current safety standards (CPSC certified)

## Additional Recommendations

✅ **Do:**
- Use a pacifier at sleep time (after breastfeeding is established)
- Keep room at comfortable temperature (68-72°F)
- Room-share for first 6-12 months (baby in own sleep space in your room)
- Breastfeed if possible (associated with reduced SIDS risk)

❌ **Avoid:**
- Smoking during pregnancy and after birth
- Alcohol or sedating medications if bed-sharing
- Overheating or over-bundling baby
- Weighted blankets or weighted sleepwear

## The Bottom Line

A bare crib with a firm mattress and fitted sheet is the safest sleep environment. It may look sparse, but it's the safest gift you can give your baby.
        `
    },
    {
        id: 'breastfeeding-basics',
        title: 'Breastfeeding Basics for New Parents',
        summary: 'Getting started with breastfeeding: positions, latch, and troubleshooting.',
        category: 'feeding',
        ageRange: [0, 6],
        tags: ['newborn', 'feeding', 'breastfeeding'],
        readingTime: 5,
        source: 'La Leche League International',
        image: '/articles/article_breastfeeding.png',
        content: `
# Breastfeeding Basics

Breastfeeding is natural but not always easy at first. Most challenges can be overcome with knowledge, support, and patience.

## Getting a Good Latch

A proper latch is key to successful breastfeeding and preventing pain.

**Signs of a good latch:**
- Baby's mouth is wide open (like a yawn)
- Lips are flanged outward (not tucked in)
- Baby's chin touches the breast
- You hear swallowing, not clicking
- It feels like tugging, not pinching

## Popular Positions

### Cradle Hold
Classic position with baby's head in the crook of your elbow.

### Football Hold
Baby tucked under your arm like a football. Great for:
- C-section recovery
- Large breasts
- Twins

### Side-Lying
Both you and baby lie on your sides facing each other. Perfect for night feeds.

## How Often to Feed

- **Newborns**: 8-12 times in 24 hours (every 2-3 hours)
- **1-2 months**: 7-9 times daily
- **3-6 months**: 6-8 times daily

Watch baby, not the clock. Feed on demand when you see hunger cues:
- Rooting (turning head, opening mouth)
- Hand to mouth
- Smacking lips

## Common Challenges

| Issue | Solution |
|-------|----------|
| Sore nipples | Check latch, use lanolin cream, air dry |
| Engorgement | Frequent feeding, warm compress, hand express |
| Low supply concerns | Feed more often, ensure good latch, stay hydrated |
| Blocked duct | Warm compress, massage, different positions |

## When to Get Help

Reach out to a lactation consultant (IBCLC) if:
- Persistent pain lasting more than a few days
- Baby not gaining weight
- You see signs of infection (fever, red streaks)
- Baby seems unsatisfied after every feed

> **Remember**: Fed is best. Whether breast, bottle, or combo feeding, you're doing great.
        `
    },
    {
        id: 'starting-solids',
        title: 'When and How to Start Solid Foods',
        summary: 'Signs of readiness, first foods, and introducing allergens safely.',
        category: 'feeding',
        ageRange: [4, 8],
        tags: ['infant', 'feeding', 'solids'],
        readingTime: 5,
        source: 'WHO & AAP Guidelines',
        image: '/articles/article_solid_foods.png',
        content: `
# Starting Solid Foods

Around 6 months, breast milk or formula alone isn't enough. It's time to introduce solids!

## Signs of Readiness

Your baby is ready for solids when they can:
- ✅ Sit up with minimal support
- ✅ Hold their head steady
- ✅ Show interest in food (watching you eat, reaching)
- ✅ Open mouth when food approaches
- ✅ Lost the tongue-thrust reflex (pushing food out)

Most babies show these signs between **4-6 months**. The WHO recommends exclusive breastfeeding until 6 months.

## First Foods

There's no magic order! Start with single-ingredient foods:

**Good first foods:**
- Iron-fortified infant cereal
- Pureed vegetables (sweet potato, squash, peas)
- Pureed fruits (banana, avocado, pear)
- Pureed meats (chicken, beef - great iron source!)

Offer one new food every 3-5 days to watch for reactions.

## Introducing Allergens Early

**New research shows**: Introducing allergens early (around 6 months) may actually REDUCE allergy risk.

Common allergens to introduce:
- Peanuts (thinned peanut butter, not whole nuts)
- Eggs
- Dairy (yogurt, cheese)
- Tree nuts (nut butters)
- Fish
- Wheat
- Soy

Start with small amounts. If there's a family history of allergies, talk to your pediatrician first.

## Amounts by Age

| Age | Frequency | Amount |
|-----|-----------|--------|
| 6 months | 1-2x/day | 1-2 tbsp per sitting |
| 7-8 months | 2-3x/day | 2-4 tbsp per sitting |
| 9-12 months | 3x/day + snacks | 4-6 tbsp per sitting |

## Baby-Led Weaning vs. Purees

**Purees**: Traditional spoon-feeding of smooth foods
**Baby-Led Weaning (BLW)**: Baby self-feeds soft finger foods from the start

Both methods work! Many parents do a combo approach. Key is offering variety and letting baby explore.

## Foods to Avoid Before 1 Year

- 🍯 Honey (botulism risk)
- 🥛 Cow's milk as main drink (OK in cooking/small amounts)
- 🧂 Added salt and sugar
- 🍇 Whole grapes, hot dogs, nuts (choking hazards)
        `
    },
    {
        id: 'tummy-time',
        title: 'Tummy Time: Why It Matters and How to Do It',
        summary: 'Building strength and preventing flat head with daily tummy time.',
        category: 'development',
        ageRange: [0, 6],
        tags: ['newborn', 'infant', 'development', 'milestones'],
        readingTime: 3,
        source: 'AAP Guidelines',
        image: '/articles/article_tummy_time.png',
        content: `
# Tummy Time: Building Baby's Strength

Tummy time is when you place your awake baby on their stomach on a firm, flat surface. It's essential for development!

## Why Tummy Time Matters

**Physical Development:**
- Strengthens neck, shoulder, and arm muscles
- Develops core strength needed for rolling, sitting, crawling
- Prevents flat spots on head (positional plagiocephaly)

**Motor Skills:**
- Prepares baby for pushing up, rolling over
- Helps develop hand-eye coordination
- Builds foundation for crawling and walking

## When to Start

Start from day one! Even newborns benefit from tummy time.

**Recommended amounts:**
- **Newborns**: 1-2 minutes, 2-3 times daily
- **1 month**: 10 minutes total daily
- **2 months**: 15-20 minutes daily
- **3+ months**: 30-60 minutes daily (can be broken up)

## Tips for Tummy Time Success

### If Baby Hates It (Most Do at First!)

1. **Start on your chest** - Recline and place baby tummy-down on your chest
2. **Use a nursing pillow** - Prop baby slightly elevated
3. **Get down on their level** - Face-to-face interaction helps
4. **Make it fun** - Use mirrors, high-contrast toys, sing songs
5. **Time it right** - Try after diaper changes when baby is alert but not hungry

### Positions to Try

- **On your chest** (great for newborns)
- **Across your lap**
- **On a play mat with toys**
- **Over a boppy or rolled towel** (slight incline)
- **Football hold** while walking around

## Tracking Progress

| Age | What to Expect |
|-----|----------------|
| 1 month | Lifts head briefly |
| 2 months | Holds head at 45° |
| 3 months | Pushes up on forearms |
| 4 months | Pushes up on hands |
| 5-6 months | May start to roll! |

> **Tip**: Count tummy time in your daily routine - after diaper changes is a natural time to do it!
        `
    },
    {
        id: 'understanding-crying',
        title: 'Decoding Baby Cries: What Your Baby Is Telling You',
        summary: 'Learn to recognize different cry patterns and what they mean.',
        category: 'development',
        ageRange: [0, 6],
        tags: ['newborn', 'infant', 'communication'],
        readingTime: 4,
        source: 'Dunstan Baby Language Research',
        image: '/articles/article_baby_crying.png',
        content: `
# Decoding Baby Cries

All babies cry - it's their only way to communicate! Research suggests babies make distinct sounds for different needs.

## Common Cry Types

### "Neh" - Hunger
- Sounds like "neh" or "nah"
- Tongue pushes to roof of mouth (sucking reflex)
- **Solution**: Feed baby

### "Owh" - Tired
- Sounds like "owh" or yawn-like
- Oval-shaped mouth
- **Solution**: Help baby sleep

### "Heh" - Discomfort
- Sounds like "heh"
- Usually accompanied by squirming
- **Solution**: Check diaper, temperature, position

### "Eairh" - Gas/Lower Belly Pain
- Sounds like "eairh"
- Often with pulling legs up
- **Solution**: Burp, bicycle legs, tummy massage

### "Eh" - Burp Needed
- Short "eh" sound
- Usually after feeding
- **Solution**: Burp baby

## The Witching Hour

Many babies have a fussy period, often in the late afternoon/evening (5-11 PM). This is normal and peaks around 6 weeks.

**Survival tips:**
- Accept help during this time
- Try the 5 S's (see below)
- Take turns with partner
- Know it's temporary (usually improves by 3-4 months)

## The 5 S's for Soothing

Dr. Harvey Karp's calming technique:

1. **Swaddle** - Snug wrapping mimics womb
2. **Side/Stomach** - Hold baby on side (not for sleep!)
3. **Shush** - Loud shushing or white noise
4. **Swing** - Gentle rhythmic motion
5. **Suck** - Pacifier or finger

## When Crying May Signal More

Contact your pediatrician if:
- High-pitched, unusual cry
- Crying for 3+ hours (possible colic)
- Fever over 100.4°F
- Won't eat or wet diapers
- Looks ill or different than usual

> **Remember**: You cannot spoil a baby by responding to their cries. Responding builds trust and security.
        `
    },
    {
        id: 'diaper-rash-prevention',
        title: 'Preventing and Treating Diaper Rash',
        summary: 'Keep baby\'s bottom healthy with these evidence-based tips.',
        category: 'health',
        ageRange: [0, 24],
        tags: ['diaper', 'health', 'skin'],
        readingTime: 3,
        source: 'AAP HealthyChildren.org',
        image: '/articles/article_diaper_rash.png',
        content: `
# Preventing and Treating Diaper Rash

Diaper rash is incredibly common - most babies get it at some point. Here's how to prevent and treat it.

## Prevention Basics

### Change Frequently
- Newborns: Every 2-3 hours (8-12 changes/day)
- Older babies: Every 3-4 hours (6-8 changes/day)
- Always change after bowel movements

### Keep Clean and Dry
- Use warm water and soft cloth or fragrance-free wipes
- Pat dry (don't rub)
- Let baby air dry when possible
- Allow diaper-free time daily

### Use Barrier Protection
- Apply diaper cream with zinc oxide or petroleum jelly at each change
- Creates protective layer between skin and moisture

## Types of Diaper Rash

| Type | Appearance | Cause |
|------|------------|-------|
| **Irritant** | Red, may have bumps | Wetness/friction |
| **Yeast** | Bright red with satellite dots | Candida fungus |
| **Bacterial** | Pus-filled bumps, crusting | Strep/staph |
| **Allergic** | Red where product touches | Sensitivity to wipes/diapers |

## Treatment

### For Mild Irritant Rash
1. Change diapers more frequently
2. Clean gently with water only
3. Allow air-dry time
4. Apply thick layer of zinc oxide cream
5. Consider going up a diaper size (less friction)

### When to See the Doctor
- Rash doesn't improve in 3 days
- Blisters, pus, or open sores
- Fever
- Rash spreading outside diaper area
- Baby seems in significant pain

## Yeast Diaper Rash

Yeast rashes (candida) need antifungal treatment. Signs:
- Bright red color
- Small red dots spreading outward (satellite lesions)
- Worse in skin folds
- Doesn't improve with regular diaper cream

Ask your doctor about antifungal cream if you suspect yeast.

## Tips That Help

- 🧴 Thick paste > thin cream (create a barrier)
- 💨 Diaper-free time is healing time
- 📏 Loose fit is better than tight
- 🧼 Avoid fragranced products
- 🍑 Pat, don't wipe, on irritated skin
        `
    },
    {
        id: 'teething-guide',
        title: 'Baby\'s First Teeth: Teething Signs and Relief',
        summary: 'What to expect when baby starts teething and how to help.',
        category: 'health',
        ageRange: [4, 24],
        tags: ['infant', 'toddler', 'teeth', 'health'],
        readingTime: 4,
        source: 'American Dental Association',
        image: '/articles/article_teething.png',
        content: `
# Baby's First Teeth

Most babies get their first tooth between 4-7 months, but it can happen earlier or later. Here's what to expect.

## Teething Timeline

| Age | Teeth |
|-----|-------|
| 6-10 months | Bottom front teeth (central incisors) |
| 8-12 months | Top front teeth |
| 9-13 months | Top lateral incisors |
| 10-16 months | Bottom lateral incisors |
| 13-19 months | First molars |
| 16-23 months | Canines |
| 23-33 months | Second molars |

By age 3, most children have all 20 primary teeth.

## Signs of Teething

**Common signs:**
- Drooling (lots of it!)
- Chewing on everything
- Fussiness or irritability
- Swollen, tender gums
- Slight temperature (under 100.4°F)
- Disrupted sleep
- Decreased appetite

**NOT caused by teething:**
- Fever over 100.4°F
- Diarrhea
- Runny nose or cough
- Rash on body

If baby has these symptoms, teething isn't the cause - see your doctor.

## Teething Relief

### What Works

✅ **Cold items** - Refrigerated (not frozen) teething rings, cold washcloth

✅ **Pressure** - Clean finger or gum massager rubbed on gums

✅ **Chewing** - Safe teething toys, silicone feeders with cold fruit

✅ **Pain relief** - Infant acetaminophen or ibuprofen (6+ months) as directed

### What to Avoid

❌ **Benzocaine gels** (Orajel) - FDA warns against use under 2 years

❌ **Homeopathic teething tablets** - May contain harmful ingredients

❌ **Teething necklaces** (amber, silicone) - Choking/strangulation risk

❌ **Frozen items** - Too cold can hurt gums

## Caring for First Teeth

Even before teeth appear:
- Wipe gums with clean, damp cloth after feedings

Once teeth arrive:
- Brush twice daily with a rice-grain-sized smear of fluoride toothpaste
- Use a soft infant toothbrush
- Schedule first dental visit by age 1 or within 6 months of first tooth

## The Teething Myth

Teething is often blamed for everything, but research shows it causes only mild symptoms for 1-2 days around tooth eruption. If symptoms are severe or last longer, something else is likely going on.

> **Remember**: This too shall pass! Each tooth's teething phase is usually short-lived.
        `
    },
    {
        id: 'infant-cpr',
        title: 'Infant CPR: What Every Parent Should Know',
        summary: 'Basic life-saving skills for emergencies - for infants under 1 year.',
        category: 'safety',
        ageRange: [0, 12],
        tags: ['safety', 'emergency', 'cpr'],
        readingTime: 5,
        source: 'American Heart Association',
        image: '/articles/article_infant_cpr.png',
        content: `
# Infant CPR Basics

Every parent and caregiver should know infant CPR. While we hope you never need it, being prepared could save a life.

## ⚠️ Important Disclaimer

This article is for educational purposes only. **Take an in-person CPR class** from the American Heart Association or Red Cross for hands-on training.

## When to Perform CPR

Start CPR if infant:
- Is unresponsive (doesn't react when you tap their foot)
- Is not breathing or only gasping

## Infant CPR Steps (Under 1 Year)

### 1. Check Responsiveness
- Tap the bottom of baby's foot
- Shout baby's name
- If no response, have someone call 911 (or do it yourself on speaker)

### 2. Open the Airway
- Place baby on firm, flat surface
- Tilt head back slightly (neutral position)
- Lift chin gently

### 3. Check Breathing
- Look for chest rise
- Listen for breath sounds
- Feel for breath on your cheek
- Take no more than 10 seconds

### 4. Give Rescue Breaths (if not breathing)
- Cover baby's mouth AND nose with your mouth
- Give 2 gentle breaths (just enough to see chest rise)
- Each breath should take about 1 second

### 5. Start Chest Compressions
- Place 2 fingers in center of chest, just below nipple line
- Compress at least 1.5 inches deep
- Rate: 100-120 compressions per minute
- Let chest fully recoil between compressions

### 6. Continue CPR Cycle
- 30 compressions, then 2 breaths
- Continue until help arrives, baby responds, or you're too exhausted

## Infant Choking

### If baby is coughing/gagging:
- Stay calm, let them cough to clear it
- Don't pat their back unless they stop coughing

### If baby cannot cough, cry, or breathe:

**Back Blows:**
1. Place baby face-down on your forearm, supporting head
2. Give 5 firm back blows between shoulder blades with heel of hand

**Chest Thrusts:**
1. Turn baby face-up on your forearm
2. Give 5 chest thrusts (like CPR compressions)
3. Repeat back blows and chest thrusts until object comes out or baby becomes unresponsive

If baby becomes unresponsive, start CPR and look for object before giving breaths.

## Get Trained

📋 **Find a class near you:**
- American Heart Association: heart.org
- American Red Cross: redcross.org
- Many hospitals offer new parent classes

> **Remember**: Having basic knowledge is better than none. Hands-on training gives you confidence to act in an emergency.
        `
    },
    {
        id: 'sleep-training-methods',
        title: 'Sleep Training Methods Explained',
        summary: 'Overview of different approaches to help baby learn independent sleep.',
        category: 'sleep',
        ageRange: [4, 12],
        tags: ['infant', 'sleep', 'training'],
        readingTime: 6,
        source: 'Sleep Foundation & Pediatric Research',
        image: '/articles/article_sleep_training.png',
        content: `
# Sleep Training Methods

Sleep training helps babies learn to fall asleep independently. There's no one-size-fits-all approach - choose what feels right for your family.

## Is Baby Ready?

Most experts suggest waiting until **4-6 months** when:
- Baby can go longer between night feeds
- Circadian rhythm is developing
- Baby weighs enough to not need overnight calories

Always check with your pediatrician, especially for premature babies.

## Common Methods

### 1. Cry It Out (CIO) / Extinction

**How it works:** Put baby down awake, leave the room, and don't return until morning (unless feeding is needed).

**Pros:** Usually works fast (3-7 days)
**Cons:** Can be emotionally hard for parents

### 2. Ferber Method / Graduated Extinction

**How it works:** Put baby down awake, leave and return at increasing intervals (3 min, 5 min, 10 min). Brief check-ins only - don't pick up.

**Example schedule:**
| Night | First | Second | Third | Subsequent |
|-------|-------|--------|-------|------------|
| 1 | 3 min | 5 min | 10 min | 10 min |
| 2 | 5 min | 10 min | 12 min | 12 min |
| 3 | 10 min | 12 min | 15 min | 15 min |

**Pros:** Gradual, less intense than full CIO
**Cons:** Check-ins can sometimes increase crying

### 3. Chair Method / Sleep Lady Shuffle

**How it works:** Sit in a chair next to crib until baby falls asleep. Move chair farther away each night until you're out of the room.

**Pros:** You're present throughout, gentler
**Cons:** Takes longer (2-3 weeks), requires patience

### 4. Pick Up/Put Down

**How it works:** When baby cries, pick up and soothe until calm, then put back down. Repeat as needed.

**Pros:** Very responsive
**Cons:** Can take weeks, exhausting for parents

### 5. Fading / Bedtime Fading

**How it works:** Gradually reduce your involvement over time. If you rock to sleep, rock less each night. Move bedtime later temporarily to build sleep pressure.

**Pros:** Very gradual, low crying
**Cons:** Takes longest (3-4 weeks)

## Keys to Success

Regardless of method:

✅ **Consistent bedtime routine** (15-30 minutes)
- Bath, massage, pajamas, feeding, book, song, sleep

✅ **Right timing** (watch wake windows)
- 4-6 months: 2-3 hours before bed
- 6-9 months: 2.5-3.5 hours before bed

✅ **Sleep environment**
- Dark room
- White noise
- Cool temperature (68-72°F)

✅ **Commit to the plan** - Consistency is more important than which method

## What Research Says

Studies consistently show:
- Sleep training methods are effective
- No evidence of harm to attachment or development
- Cry-based methods work faster but aren't the only option
- Parent mental health often improves afterward

## It's Okay to Change Your Mind

If something doesn't feel right:
- Try a gentler approach
- Wait a few weeks and try again
- Some babies sleep train easily, others take longer
- There's no "right" way

> **Remember**: You know your baby best. Safe, consistent sleep habits are the goal, regardless of how you get there.
        `
    }
];

// Helper function to get articles for a baby's age
export const getArticlesForAge = (ageInMonths) => {
    return articles.filter(article =>
        ageInMonths >= article.ageRange[0] && ageInMonths <= article.ageRange[1]
    );
};

// Helper function to get articles by category
export const getArticlesByCategory = (category) => {
    if (category === 'all') return articles;
    return articles.filter(article => article.category === category);
};

// Helper function to calculate baby's age in months
export const calculateAgeInMonths = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());
    return Math.max(0, months);
};
