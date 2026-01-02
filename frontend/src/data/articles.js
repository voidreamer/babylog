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
    },
    {
        id: 'postpartum-recovery',
        title: 'Postpartum Recovery: What to Expect',
        summary: 'Physical and emotional healing after birth for new mothers.',
        category: 'health',
        ageRange: [0, 3],
        tags: ['postpartum', 'mother', 'recovery', 'health'],
        readingTime: 5,
        source: 'ACOG Guidelines',
        image: '/articles/article_breastfeeding.png',
        content: `
# Postpartum Recovery

Your body just did something amazing. Here's what to expect as it heals.

## Physical Recovery Timeline

**Week 1-2:**
- Vaginal bleeding (lochia) - heaviest initially
- Cramping as uterus contracts
- Breast engorgement when milk comes in
- Fatigue and soreness

**Week 3-6:**
- Bleeding decreases
- Stitches (if any) heal
- Energy slowly returns
- 6-week checkup with provider

## C-Section Recovery

- Longer healing time (6-8 weeks)
- Avoid lifting heavy objects
- Support incision when coughing
- Watch for signs of infection

## Emotional Changes

Baby blues (2 weeks) vs postpartum depression (longer):
- Crying spells and mood swings are normal initially
- If feelings persist beyond 2 weeks, talk to your doctor
- You're not alone - 1 in 5 mothers experiences PPD

## When to Call Your Doctor

- Fever over 100.4°F
- Heavy bleeding (soaking a pad in an hour)
- Severe headache or vision changes
- Thoughts of harming yourself or baby

> **Remember**: Take care of yourself so you can take care of your baby.
        `
    },
    {
        id: 'baby-bonding',
        title: 'Building Your Bond with Baby',
        summary: 'Simple ways to strengthen the parent-child connection.',
        category: 'development',
        ageRange: [0, 12],
        tags: ['bonding', 'attachment', 'development', 'newborn'],
        readingTime: 4,
        source: 'Zero to Three',
        image: '/articles/article_baby_crying.png',
        content: `
# Building Your Bond

Bonding happens naturally through everyday care. Here's how to strengthen it.

## Skin-to-Skin Contact

Benefits of holding baby against your bare chest:
- Regulates baby's temperature and heart rate
- Promotes breastfeeding
- Releases oxytocin (the "love hormone")
- Calms both parent and baby

## Eye Contact and Talking

- Babies can see clearly at 8-12 inches (perfect distance when feeding)
- Talk, sing, narrate your day
- Respond to coos and sounds
- Mimic baby's expressions

## Responsive Care

When you respond to baby's needs:
- They learn to trust you
- Neural connections form
- Secure attachment develops
- This doesn't spoil them!

## For Partners

Bonding isn't just for birth mothers:
- Do skin-to-skin too
- Handle feeding, diaper changes, baths
- Find your own special rituals
- Bonding takes time - be patient

> **Remember**: There's no "right" way to bond. Just being present and responsive is enough.
        `
    },
    {
        id: 'baby-bath-time',
        title: 'Baby Bath Time: Step-by-Step Guide',
        summary: 'How to safely bathe your newborn or infant.',
        category: 'health',
        ageRange: [0, 12],
        tags: ['bath', 'hygiene', 'newborn', 'safety'],
        readingTime: 4,
        source: 'AAP Guidelines',
        image: '/articles/article_safe_sleep.png',
        content: `
# Baby Bath Time

Newborns only need baths 2-3 times per week. Here's how to do it safely.

## Before the Bath

Gather everything first:
- Baby tub or sink with liner
- Warm water (test with elbow)
- Mild baby soap
- Soft washcloth
- Hooded towel
- Clean diaper and clothes

## Step-by-Step

1. Fill tub with 2-3 inches of warm water
2. Support baby's head and neck
3. Lower baby in feet first
4. Keep one hand on baby at all times
5. Wash from cleanest to dirtiest areas
6. Rinse thoroughly
7. Wrap immediately in towel

## Safety Rules

- Never leave baby unattended
- Water temperature 98-100°F
- Support head and neck at all times
- Skip submersion until cord stump falls off

## Umbilical Cord Care

Until it falls off (1-3 weeks):
- Sponge baths only
- Keep cord area dry
- Fold diaper below it
- Let it fall off naturally

> **Remember**: Babies are slippery when wet! A secure grip is essential.
        `
    },
    {
        id: 'car-seat-safety',
        title: 'Car Seat Safety: Installation and Use',
        summary: 'Keeping baby safe on every car ride.',
        category: 'safety',
        ageRange: [0, 24],
        tags: ['car seat', 'travel', 'safety'],
        readingTime: 5,
        source: 'NHTSA',
        image: '/articles/article_infant_cpr.png',
        content: `
# Car Seat Safety

Car crashes are a leading cause of death for children. Proper car seat use reduces risk by 71-82%.

## Choosing the Right Seat

**Infant Carrier (rear-facing only):**
- Birth to 22-35 lbs
- Convenient bucket design
- Must face rear

**Convertible Seat:**
- Birth to 65+ lbs
- Stays in car
- Grows with child

## Rear-Facing is Safest

Keep baby rear-facing as long as possible:
- Minimum until age 1 AND 20 lbs
- Ideally until they outgrow rear-facing limits
- Protects head, neck, spine in crash

## Installation Tips

- Read both car seat AND vehicle manuals
- Less than 1 inch movement at belt path
- Recline angle appropriate for age
- Harness straps at or below shoulders (rear-facing)
- Chest clip at armpit level

## Common Mistakes

- Seat installed too loosely
- Harness straps too loose
- Chest clip too low
- Too many bulky clothes
- Moving to next stage too soon

## Get It Checked

Free car seat inspection stations available:
- Fire stations
- Police departments
- Hospitals
- Search "car seat check near me"

> **Remember**: The safest car seat is the one that fits your child, your car, and that you use correctly every time.
        `
    },
    {
        id: 'baby-massage',
        title: 'Baby Massage: Benefits and Techniques',
        summary: 'Gentle touch for bonding and relaxation.',
        category: 'development',
        ageRange: [0, 12],
        tags: ['massage', 'bonding', 'sleep', 'colic'],
        readingTime: 3,
        source: 'International Association of Infant Massage',
        image: '/articles/article_tummy_time.png',
        content: `
# Baby Massage

Gentle massage can soothe baby, improve sleep, and strengthen your bond.

## Benefits

- Promotes relaxation and better sleep
- May help with colic and gas
- Strengthens parent-baby bond
- Supports healthy weight gain
- Good for baby's body awareness

## When to Massage

Best times:
- 45 minutes after feeding
- Before bath or bedtime
- When baby is calm but alert
- Avoid when baby is hungry, tired, or fussy

## Simple Techniques

**Legs and Feet:**
- Gentle strokes from thigh to ankle
- Roll leg between palms
- Circle thumbs on soles of feet

**Tummy (for gas):**
- "I Love You" strokes
- Bicycle legs gently
- Clockwise circles

**Back:**
- Long strokes from shoulders to bottom
- Small circles along spine (not on spine)

## Tips

- Use unscented, edible oil (coconut, almond)
- Keep room warm
- Start with 5 minutes, build up
- Follow baby's cues
- Stop if baby becomes fussy

> **Remember**: The goal is connection, not perfection.
        `
    },
    {
        id: 'hunger-cues',
        title: 'Reading Baby\'s Hunger Cues',
        summary: 'Know when baby is hungry before they cry.',
        category: 'feeding',
        ageRange: [0, 6],
        tags: ['feeding', 'hunger', 'newborn', 'cues'],
        readingTime: 3,
        source: 'La Leche League',
        image: '/articles/article_breastfeeding.png',
        content: `
# Reading Hunger Cues

Crying is a late hunger cue. Learning earlier signs makes feeding easier.

## Early Hunger Cues

- Stirring, waking up
- Opening and closing mouth
- Turning head side to side
- Smacking or licking lips
- Sucking on hands or fingers

## Active Hunger Cues

- Rooting (turning toward touch on cheek)
- Trying to position for nursing
- Fidgeting or squirming
- Faster breathing
- Making sounds

## Late Hunger Cues

- Crying
- Agitated movements
- Color turns red

## Why Early Feeding Matters

- Easier latch when calm
- Less stressful for both
- Better digestion
- Helps establish milk supply

## Fullness Cues

Baby is done when they:
- Turn away from breast/bottle
- Close mouth
- Relax body
- Fall asleep
- Release nipple

> **Remember**: Feed on demand, not on schedule. Babies know when they're hungry.
        `
    },
    {
        id: 'pumping-tips',
        title: 'Breast Pumping: A Complete Guide',
        summary: 'Tips for successful pumping and milk storage.',
        category: 'feeding',
        ageRange: [0, 12],
        tags: ['pumping', 'breastfeeding', 'work', 'feeding'],
        readingTime: 6,
        source: 'CDC Guidelines',
        image: '/articles/article_breastfeeding.png',
        content: `
# Breast Pumping Guide

Whether returning to work or building a stash, here's what you need to know.

## Choosing a Pump

| Type | Best For |
|------|----------|
| Hospital-grade | NICU, low supply, exclusive pumping |
| Double electric | Regular pumping, working moms |
| Manual | Occasional use, travel |
| Wearable | Hands-free convenience |

## Getting Started

- Wait 3-4 weeks until breastfeeding is established
- Pump after feeding or between feeds
- Morning typically yields most milk
- Start with 10-15 minute sessions

## Increasing Output

- Pump more often (supply = demand)
- Use hands-on pumping technique
- Try power pumping (20 on, 10 off, repeat)
- Stay hydrated
- Look at photos/videos of baby

## Milk Storage Guidelines

| Location | Duration |
|----------|----------|
| Room temp | 4 hours |
| Refrigerator | 4 days |
| Freezer | 6-12 months |

## Returning to Work

- Start pumping 2-3 weeks before
- Pump at times you'd normally feed
- Bring photos of baby
- Know your pumping rights (most employers must provide time/space)

> **Remember**: Any amount of breast milk is beneficial. Don't stress about ounces.
        `
    },
    {
        id: 'formula-feeding',
        title: 'Formula Feeding: Safe Preparation',
        summary: 'How to prepare and store infant formula safely.',
        category: 'feeding',
        ageRange: [0, 12],
        tags: ['formula', 'feeding', 'bottle', 'safety'],
        readingTime: 4,
        source: 'CDC Guidelines',
        image: '/articles/article_solid_foods.png',
        content: `
# Formula Feeding Safely

Fed is best! Here's how to prepare formula safely.

## Types of Formula

- **Powder:** Most economical, requires mixing
- **Concentrate:** Mix with equal parts water
- **Ready-to-feed:** Most convenient, no mixing

## Preparation Steps

1. Wash hands thoroughly
2. Clean and sterilize bottles
3. Measure water first, then powder
4. Use the scoop provided (not packed)
5. Mix well - shake or swirl
6. Test temperature on wrist

## Water Safety

- Use cold tap water (or bottled)
- Run tap 30 seconds before using
- Some areas require boiled water - check with pediatrician
- Never microwave formula

## Storage Guidelines

| Type | Room Temp | Refrigerator |
|------|-----------|--------------|
| Prepared | 2 hours | 24 hours |
| Ready-to-feed (opened) | 2 hours | 48 hours |
| Powder (opened) | N/A | Use within 1 month |

## Feeding Tips

- Hold baby semi-upright (~45 degrees)
- Keep bottle horizontal (paced feeding)
- Let baby take breaks
- Discard unused formula after 1 hour

> **Remember**: Follow package instructions exactly. Diluting or concentrating formula is dangerous.
        `
    },
    {
        id: 'burping-baby',
        title: 'Burping Your Baby: Tips and Positions',
        summary: 'Help baby release trapped air comfortably.',
        category: 'feeding',
        ageRange: [0, 6],
        tags: ['burping', 'feeding', 'gas', 'spit-up'],
        readingTime: 3,
        source: 'AAP Guidelines',
        image: '/articles/article_baby_crying.png',
        content: `
# Burping Baby

Babies swallow air while feeding. Burping helps release it before it causes discomfort.

## When to Burp

- After every 2-3 ounces (bottle)
- When switching breasts
- After feeding is complete
- If baby seems uncomfortable during feeding

## Burping Positions

### Over the Shoulder
- Support baby's bottom
- Pat or rub back gently
- Protect clothes with burp cloth!

### Sitting Up
- Sit baby on your lap
- Support chin and chest with hand
- Lean baby slightly forward
- Pat or rub back

### Face Down on Lap
- Lay baby across your knees
- Support head higher than chest
- Pat or rub back

## Tips for Success

- Be patient - can take a few minutes
- Gentle but firm pats
- Try a different position if one doesn't work
- Some babies burp easily, others rarely need it
- Spitting up a little is normal

## When to Worry

Contact doctor if baby:
- Projectile vomits
- Seems in pain after eating
- Refuses to eat
- Shows signs of reflux

> **Remember**: Not every baby needs to burp. If nothing comes up after a few minutes, they may be fine.
        `
    },
    {
        id: 'sleep-regressions',
        title: 'Sleep Regressions: When and Why',
        summary: 'Understanding sleep disruptions at common ages.',
        category: 'sleep',
        ageRange: [3, 24],
        tags: ['sleep', 'regression', 'development'],
        readingTime: 4,
        source: 'Sleep Foundation',
        image: '/articles/article_sleep_training.png',
        content: `
# Sleep Regressions

Just when you think you've got it figured out... sleep regressions are temporary disruptions in sleep patterns.

## Common Regression Ages

### 4 Months
- Most significant - permanent sleep changes
- Baby's sleep cycles mature
- Increased night waking
- Shorter naps

### 8-10 Months
- Separation anxiety peaks
- Learning to crawl/stand
- May practice skills in crib
- Lasts 3-6 weeks

### 12 Months
- Transition from 2 naps to 1
- Walking development
- Increased independence

### 18-24 Months
- Language explosion
- Nightmares may begin
- Testing boundaries

## Survival Tips

- Stick to routines
- Offer extra comfort temporarily
- Avoid creating new habits you'll need to break
- Remember: it's temporary!

## What Doesn't Help

- Bed sharing suddenly
- Night weaning during regression
- Changing everything at once
- Panicking

> **Remember**: Regressions are actually signs of developmental progress. They pass!
        `
    },
    {
        id: 'developmental-play',
        title: 'Play Ideas for Every Age',
        summary: 'Simple activities to support baby\'s development.',
        category: 'development',
        ageRange: [0, 12],
        tags: ['play', 'development', 'activities', 'milestones'],
        readingTime: 4,
        source: 'Zero to Three',
        image: '/articles/article_tummy_time.png',
        content: `
# Developmental Play by Age

The best toy for your baby? You! Here are age-appropriate play ideas.

## 0-3 Months

**Focus:** Vision, hearing, neck strength
- High-contrast black/white images
- Face-to-face interaction
- Tummy time (start with 1-2 minutes)
- Gentle songs and talking
- Touch different textures

## 4-6 Months

**Focus:** Reaching, grasping, rolling
- Toys to grab and mouth
- Rattles and crinkly toys
- Mirror play
- Peek-a-boo
- Reading board books together

## 7-9 Months

**Focus:** Sitting, crawling, object permanence
- Containers to fill and empty
- Stacking toys
- "Where did it go?" games
- Crawling obstacle courses
- Musical instruments

## 10-12 Months

**Focus:** Standing, cruising, cause and effect
- Push toys for walking
- Shape sorters
- Simple puzzles
- Ball rolling back and forth
- Water play (supervised!)

## Play Tips

- Follow baby's lead
- Short sessions are fine
- Less is more with toys
- Narrate what you're doing
- Let them explore safely

> **Remember**: Play is learning! There's no wrong way as long as baby is safe and engaged.
        `
    },
    {
        id: 'baby-skin-care',
        title: 'Baby Skin Care Basics',
        summary: 'Keeping baby\'s delicate skin healthy.',
        category: 'health',
        ageRange: [0, 12],
        tags: ['skin', 'health', 'eczema', 'bath'],
        readingTime: 3,
        source: 'AAP Guidelines',
        image: '/articles/article_diaper_rash.png',
        content: `
# Baby Skin Care

Baby skin is 30% thinner than adult skin. Here's how to protect it.

## General Tips

- Less is more - don't overdo products
- Fragrance-free is best
- Pat dry, don't rub
- Short baths (5-10 minutes)
- Moisturize while skin is damp

## Common Skin Conditions

### Cradle Cap
- Scaly patches on scalp
- Harmless but common
- Gentle brushing and oil helps
- Usually resolves by 12 months

### Baby Acne
- Small bumps on face
- Appears 2-4 weeks
- No treatment needed
- Clears on its own

### Eczema
- Dry, red, itchy patches
- Often on cheeks, creases
- Moisturize frequently
- May need prescription cream

## What to Avoid

- Too-frequent baths
- Harsh soaps
- Scented products
- Overly warm water
- Scratchy fabrics

## When to See a Doctor

- Rash with fever
- Spreading rapidly
- Oozing or crusted
- Baby seems uncomfortable

> **Remember**: Most baby skin issues are harmless and temporary.
        `
    },
    {
        id: 'when-to-call-doctor',
        title: 'When to Call the Pediatrician',
        summary: 'Know which symptoms need immediate attention.',
        category: 'health',
        ageRange: [0, 24],
        tags: ['health', 'emergency', 'fever', 'illness'],
        readingTime: 4,
        source: 'AAP Guidelines',
        image: '/articles/article_infant_cpr.png',
        content: `
# When to Call the Pediatrician

Trust your instincts - you know your baby best. Here are definite reasons to call.

## Call Immediately (or Go to ER)

- Fever 100.4°F+ in baby under 3 months
- Difficulty breathing
- Blue lips or skin
- Unresponsive or very difficult to wake
- Seizure
- Signs of dehydration (no wet diapers 6+ hours)

## Call Same Day

- Fever in baby 3+ months
- Persistent vomiting
- Diarrhea with blood or mucus
- Ear pulling with fussiness
- Rash with fever
- Cough lasting over a week
- Refusing to eat

## Can Wait for Office Hours

- Mild cold symptoms
- Minor diaper rash
- Questions about development
- Spitting up (if gaining weight)
- Mild fussiness

## What to Have Ready

When you call, know:
- Baby's temperature
- Symptoms and when they started
- Eating and diaper output
- Any medications given
- Your pharmacy info

## Trust Yourself

If something feels wrong, call. Doctors would rather hear from a concerned parent than miss something serious.

> **Remember**: You don't need to have all the answers. That's what your pediatrician is for.
        `
    },
    {
        id: 'baby-language',
        title: 'Baby\'s First Words: Language Development',
        summary: 'How babies learn to communicate and how to help.',
        category: 'development',
        ageRange: [0, 24],
        tags: ['language', 'speech', 'milestones', 'development'],
        readingTime: 4,
        source: 'AAP Guidelines',
        image: '/articles/article_baby_crying.png',
        content: `
# Language Development

First words are exciting! Here's what to expect and how to encourage language.

## Timeline

| Age | What to Expect |
|-----|----------------|
| 0-3 months | Coos, gurgles |
| 4-6 months | Babbling (ba-ba, ma-ma) |
| 7-12 months | Responds to name, simple words |
| 12-18 months | First words, follows commands |
| 18-24 months | 50+ words, 2-word phrases |

## How to Encourage Language

### Talk Constantly
- Narrate your day
- Describe what you see
- Name objects
- Use simple words first

### Read Together
- Start from birth!
- Point to pictures
- Let baby touch pages
- Make reading fun

### Respond
- Answer coos and babbles
- Expand on what they say
- Celebrate attempts
- Make eye contact

### Sing
- Nursery rhymes
- Simple songs
- Repetition is good
- Add hand motions

## Warning Signs

Talk to your pediatrician if baby:
- Doesn't babble by 9 months
- No words by 16 months
- Doesn't respond to name
- Loses language skills

> **Remember**: All babies develop differently. But early intervention helps if there are concerns.
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
