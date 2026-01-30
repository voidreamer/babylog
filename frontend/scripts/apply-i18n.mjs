/**
 * Script to apply i18n modifications to all component files.
 * This does search-and-replace on each file to add useTranslation imports
 * and replace hardcoded strings with t() calls.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');

function readFile(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8');
}
function writeFile(rel, content) {
  fs.writeFileSync(path.join(SRC, rel), content, 'utf-8');
}

function addImport(content, importLine) {
  if (content.includes('useTranslation')) return content;
  // Add after last import
  const lastImportIdx = content.lastIndexOf('\nimport ');
  if (lastImportIdx === -1) return importLine + '\n' + content;
  const endOfLine = content.indexOf('\n', lastImportIdx + 1);
  return content.slice(0, endOfLine + 1) + importLine + '\n' + content.slice(endOfLine + 1);
}

function replace(content, pairs) {
  for (const [from, to] of pairs) {
    content = content.split(from).join(to);
  }
  return content;
}

// ============================================================
// Login.tsx
// ============================================================
{
  let c = readFile('pages/Login.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { login } = useAuth();", "const { login } = useAuth();\n    const { t } = useTranslation(['settings', 'common']);"],
    ["<h1 className=\"auth-title\">HeyBub</h1>", "<h1 className=\"auth-title\">{t('settings:login.title')}</h1>"],
    ["The simple way to track your baby's daily activities", "{t('settings:login.subtitle')}"],
    ["Sign in with Google", "{t('settings:login.signInWithGoogle')}"],
    ["{ icon: Utensils, text: 'Track feedings' },", "{ icon: Utensils, text: t('settings:login.trackFeedings') },"],
    ["{ icon: Moon, text: 'Monitor sleep' },", "{ icon: Moon, text: t('settings:login.monitorSleep') },"],
    ["{ icon: Droplets, text: 'Log diapers' },", "{ icon: Droplets, text: t('settings:login.logDiapers') },"],
    ["{ icon: TrendingUp, text: 'View growth charts' },", "{ icon: TrendingUp, text: t('settings:login.viewGrowthCharts') },"],
    ["Free with premium features", "{t('settings:login.freeWithPremium')}"],
  ]);
  writeFile('pages/Login.tsx', c);
  console.log('✅ Login.tsx');
}

// ============================================================
// Onboarding.tsx
// ============================================================
{
  let c = readFile('components/Onboarding.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { refresh } = useBaby();", "const { refresh } = useBaby();\n    const { t } = useTranslation(['onboarding', 'common']);"],
    ["<h1 className=\"onboarding-title\">Welcome to HeyBub!</h1>", "<h1 className=\"onboarding-title\">{t('onboarding:welcome')}</h1>"],
    ["Let's set up your baby's profile so you can start tracking.", "{t('onboarding:setupSubtitle')}"],
    ["Get Started <ArrowRight size={18} />", "{t('onboarding:getStarted')} <ArrowRight size={18} />"],
    ["<LogOut size={14} /> Sign out", "<LogOut size={14} /> {t('onboarding:signOut')}"],
    ["<h2 className=\"onboarding-title\">Choose Your Style</h2>", "<h2 className=\"onboarding-title\">{t('onboarding:chooseStyle')}</h2>"],
    ["Pick the look that feels right for you.", "{t('onboarding:pickLook')}"],
    ["<span className=\"theme-name\">Light</span>", "<span className=\"theme-name\">{t('onboarding:light')}</span>"],
    ["<span className=\"theme-desc\">Warm and bright</span>", "<span className=\"theme-desc\">{t('onboarding:lightDesc')}</span>"],
    ["<span className=\"theme-name\">Dark</span>", "<span className=\"theme-name\">{t('onboarding:dark')}</span>"],
    ["<span className=\"theme-desc\">Easy on the eyes</span>", "<span className=\"theme-desc\">{t('onboarding:darkDesc')}</span>"],
    ["Continue <ArrowRight size={18} />", "{t('onboarding:continue')} <ArrowRight size={18} />"],
    ["<h2 className=\"onboarding-form-title\">Add Your Baby</h2>", "<h2 className=\"onboarding-form-title\">{t('onboarding:addYourBaby')}</h2>"],
    ["<h1 className=\"onboarding-title\">All Set!</h1>", "<h1 className=\"onboarding-title\">{t('onboarding:allSet')}</h1>"],
    ["{babyName}'s profile is ready. Start tracking now!", "{t('onboarding:profileReady', { name: babyName })}"],
    ["Go to Dashboard <ArrowRight size={18} />", "{t('onboarding:goToDashboard')} <ArrowRight size={18} />"],
    ["toast.error('Failed to add baby')", "toast.error(t('common:errors.failedToSave'))"],
  ]);
  writeFile('components/Onboarding.tsx', c);
  console.log('✅ Onboarding.tsx');
}

// ============================================================
// Dashboard.tsx
// ============================================================
{
  let c = readFile('components/Dashboard.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function Dashboard() {", "export default function Dashboard() {\n    const { t } = useTranslation('common');"],
    ["<h2 className=\"empty-state-title\">No baby added yet</h2>", "<h2 className=\"empty-state-title\">{t('empty.noBabyAdded')}</h2>"],
    ["<p className=\"empty-state-text\">Add your baby to start tracking</p>", "<p className=\"empty-state-text\">{t('empty.addBabyToStart')}</p>"],
    ["toast.error('Failed to load dashboard', {", "toast.error(t('errors.failedToLoad'), {"],
    ["description: 'Please check your connection and try again.'", "description: t('errors.checkConnection')"],
  ]);
  writeFile('components/Dashboard.tsx', c);
  console.log('✅ Dashboard.tsx');
}

// ============================================================
// FeedingWidget.tsx
// ============================================================
{
  let c = readFile('components/FeedingWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function FeedingWidget(", "export default function FeedingWidget_("],
    ["export default function FeedingWidget_(", "export default function FeedingWidget("],
    ["const [saving, setSaving] = useState(false);", "const { t } = useTranslation('common');\n    const [saving, setSaving] = useState(false);"],
    ["toast.success('Feeding started');", "toast.success(t('feedingStarted'));"],
    ["toast.success(`Feeding logged (${durationMinutes} min)`);", "toast.success(t('feedingLogged', { duration: durationMinutes }));"],
    ["toast.error('Failed to save feeding');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">{isFeeding ? 'Feeding' : 'Feeding'}</span>", "<span className=\"widget-label\">{t('widgets.feeding')}</span>"],
    ["{saving ? 'Saving...' : 'Done'}", "{saving ? t('saving') : t('done')}"],
    ["<div className=\"widget-time-ago\">No feedings yet</div>", "<div className=\"widget-time-ago\">{t('noFeedingsYet')}</div>"],
  ]);
  writeFile('components/FeedingWidget.tsx', c);
  console.log('✅ FeedingWidget.tsx');
}

// ============================================================
// SleepWidget.tsx
// ============================================================
{
  let c = readFile('components/SleepWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [saving, setSaving] = useState(false);", "const { t } = useTranslation('common');\n    const [saving, setSaving] = useState(false);"],
    ["toast.success('Sleep started');", "toast.success(t('sleepStarted'));"],
    ["toast.error('Failed to start sleep');", "toast.error(t('errors.failedToSave'));"],
    ["toast.success('Baby is awake!');", "toast.success(t('babyIsAwake'));"],
    ["toast.error('Failed to end sleep');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">{isSleeping ? 'Sleeping' : 'Sleep'}</span>", "<span className=\"widget-label\">{isSleeping ? t('sleepStates.sleeping') : t('widgets.sleep')}</span>"],
    ["{saving ? 'Waking...' : 'Wake Up'}", "{saving ? t('waking') : t('wakeUp')}"],
    ["{saving ? 'Starting...' : 'Start Sleep'}", "{saving ? t('starting') : t('startSleep')}"],
  ]);
  writeFile('components/SleepWidget.tsx', c);
  console.log('✅ SleepWidget.tsx');
}

// ============================================================
// DiaperWidget.tsx
// ============================================================
{
  let c = readFile('components/DiaperWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [saving, setSaving] = useState<string | null>(null); // null or 'pee'|'poo'|'mixed'", "const { t } = useTranslation('common');\n    const [saving, setSaving] = useState<string | null>(null); // null or 'pee'|'poo'|'mixed'"],
    ["toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} diaper logged`);", "toast.success(t('diaperLogged', { type: t(`diaperTypes.${type}`) }));"],
    ["toast.error('Failed to log diaper');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">Diaper</span>", "<span className=\"widget-label\">{t('widgets.diaper')}</span>"],
    ["const typeMap: Record<string, string> = { pee: 'Pee', poo: 'Poo', mixed: 'Both' };", "const typeMap: Record<string, string> = { pee: t('diaperTypes.pee'), poo: t('diaperTypes.poo'), mixed: t('diaperTypes.mixed') };"],
    ["<div className=\"widget-time-ago\">No diapers yet</div>", "<div className=\"widget-time-ago\">{t('noDiapersYet')}</div>"],
    ["{saving === 'pee' ? '...' : 'Pee'}", "{saving === 'pee' ? '...' : t('diaperTypes.pee')}"],
    ["{saving === 'poo' ? '...' : 'Poo'}", "{saving === 'poo' ? '...' : t('diaperTypes.poo')}"],
    ["{saving === 'mixed' ? '...' : 'Both'}", "{saving === 'mixed' ? '...' : t('diaperTypes.mixed')}"],
  ]);
  writeFile('components/DiaperWidget.tsx', c);
  console.log('✅ DiaperWidget.tsx');
}

// ============================================================
// BathWidget.tsx
// ============================================================
{
  let c = readFile('components/BathWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success('Bath logged');", "toast.success(t('bathLogged'));"],
    ["toast.error('Failed to log bath');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">Bath</span>", "<span className=\"widget-label\">{t('widgets.bath')}</span>"],
    ["<div className=\"widget-time-ago\">No baths yet</div>", "<div className=\"widget-time-ago\">{t('noBathsYet')}</div>"],
    ["{saving ? 'Logging...' : 'Log Bath'}", "{saving ? t('saving') : t('logBathAction')}"],
  ]);
  writeFile('components/BathWidget.tsx', c);
  console.log('✅ BathWidget.tsx');
}

// ============================================================
// PumpingWidget.tsx
// ============================================================
{
  let c = readFile('components/PumpingWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success('Pumping started');", "toast.success(t('pumpingStarted'));"],
    ["toast.success(`Pumping logged (${durationMinutes} min)`);", "toast.success(t('pumpingLogged', { duration: durationMinutes }));"],
    ["toast.error('Failed to save pumping');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">Pumping</span>", "<span className=\"widget-label\">{t('widgets.pumping')}</span>"],
    ["{saving ? 'Saving...' : 'Done'}", "{saving ? t('saving') : t('done')}"],
    ["<div className=\"widget-time-ago\">No pumpings yet</div>", "<div className=\"widget-time-ago\">{t('noPumpingsYet')}</div>"],
  ]);
  writeFile('components/PumpingWidget.tsx', c);
  console.log('✅ PumpingWidget.tsx');
}

// ============================================================
// SupplementWidget.tsx
// ============================================================
{
  let c = readFile('components/SupplementWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success('Supplement logged');", "toast.success(t('supplementLogged'));"],
    ["toast.error('Failed to log supplement');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">Supplement</span>", "<span className=\"widget-label\">{t('widgets.supplement')}</span>"],
    ["<div className=\"widget-time-ago\">No supplements yet</div>", "<div className=\"widget-time-ago\">{t('noSupplementsYet')}</div>"],
  ]);
  writeFile('components/SupplementWidget.tsx', c);
  console.log('✅ SupplementWidget.tsx');
}

// ============================================================
// TummyTimeWidget.tsx
// ============================================================
{
  let c = readFile('components/TummyTimeWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success('Tummy time started');", "toast.success(t('tummyTimeStarted'));"],
    ["toast.success(`Tummy time logged (${durationMinutes} min)`);", "toast.success(t('tummyTimeLogged', { duration: durationMinutes }));"],
    ["toast.error('Failed to save tummy time');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">Tummy</span>", "<span className=\"widget-label\">{t('widgets.tummy')}</span>"],
    ["{saving ? 'Saving...' : 'Done'}", "{saving ? t('saving') : t('done')}"],
    ["<div className=\"widget-time-ago\">No tummy time yet</div>", "<div className=\"widget-time-ago\">{t('noTummyTimeYet')}</div>"],
  ]);
  writeFile('components/TummyTimeWidget.tsx', c);
  console.log('✅ TummyTimeWidget.tsx');
}

// ============================================================
// PottyWidget.tsx
// ============================================================
{
  let c = readFile('components/PottyWidget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success(`Potty ${result} logged`);", "toast.success(t('pottyLogged', { result: t(`pottyResults.${result}`) }));"],
    ["toast.error('Failed to log potty');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"widget-label\">Potty</span>", "<span className=\"widget-label\">{t('widgets.potty')}</span>"],
    ["<div className=\"widget-time-ago\">No potty logs yet</div>", "<div className=\"widget-time-ago\">{t('noPottyYet')}</div>"],
    ["{saving === 'success' ? '...' : 'Yes'}", "{saving === 'success' ? '...' : t('yes')}"],
    ["{saving === 'attempt' ? '...' : 'Try'}", "{saving === 'attempt' ? '...' : t('pottyResults.attempt')}"],
  ]);
  writeFile('components/PottyWidget.tsx', c);
  console.log('✅ PottyWidget.tsx');
}

// ============================================================
// FeedingModal.tsx
// ============================================================
{
  let c = readFile('components/FeedingModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const isEditing = !!editEvent;\n    const [mode, setMode] = useState('quick');", "const isEditing = !!editEvent;\n    const { t } = useTranslation('common');\n    const [mode, setMode] = useState('quick');"],
    ["toast.error('Amount must be between 0 and 500 ml');", "toast.error(t('validationErrors.amountRange'));"],
    ["toast.error('Notes must be less than 500 characters');", "toast.error(t('validationErrors.notesLength'));"],
    ["toast.error('Duration must be between 0 and 120 minutes');", "toast.error(t('validationErrors.durationRange'));"],
    ["toast.error('Failed to save feeding');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><Baby size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Feeding</h2>", "<h2 className=\"modal-title\"><Baby size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editFeeding') : t('logFeeding')}</h2>"],
    ["<Pencil size={16} /> Quick Log", "<Pencil size={16} /> {t('quickLog')}"],
    ["<Timer size={16} /> Timer", "<Timer size={16} /> {t('timer')}"],
    ["<label className=\"form-label\">Method</label>", "<label className=\"form-label\">{t('method')}</label>"],
    ["<User size={16} /> Breast", "<User size={16} /> {t('feedingTypes.breast')}"],
    ["<Baby size={16} /> Bottle", "<Baby size={16} /> {t('feedingTypes.bottle')}"],
    ["<label className=\"form-label\">Bottle Contents</label>", "<label className=\"form-label\">{t('bottleContents')}</label>"],
    [">Breast Milk<", ">{t('feedingTypes.breastMilk')}<"],
    [">Formula<", ">{t('feedingTypes.formula')}<"],
    ["Started at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}", "{t('startedAt', { time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}"],
    ["▶️ Start Feeding", "▶️ {t('startFeeding')}"],
    ["⏹️ Stop", "⏹️ {t('stop')}"],
    ["<label className=\"form-label\">Amount (ml)</label>", "<label className=\"form-label\">{t('amountMl')}</label>"],
    ["<label className=\"form-label\">Notes</label>", "<label className=\"form-label\">{t('notes')}</label>"],
    ["placeholder=\"Optional notes...\"", "placeholder={t('notesOptional')}"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Duration (min)</label>", "<label className=\"form-label\">{t('durationMin')}</label>"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save Feeding'}", "{saving ? t('saving') : t('saveFeeding')}"],
  ]);
  writeFile('components/FeedingModal.tsx', c);
  console.log('✅ FeedingModal.tsx');
}

// ============================================================
// SleepModal.tsx
// ============================================================
{
  let c = readFile('components/SleepModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const isEditing = !!editEvent;", "const isEditing = !!editEvent;\n    const { t } = useTranslation('common');"],
    ["toast.error('Failed to log sleep');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><Moon size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Sleep</h2>", "<h2 className=\"modal-title\"><Moon size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editSleep') : t('logSleep')}</h2>"],
    ["<label className=\"form-label\">Start Time</label>", "<label className=\"form-label\">{t('startTime')}</label>"],
    ["<label className=\"form-label\">End Time</label>", "<label className=\"form-label\">{t('endTime')}</label>"],
    ["<label className=\"form-label\">Notes</label>", "<label className=\"form-label\">{t('notes')}</label>"],
    ["placeholder=\"Optional notes...\"", "placeholder={t('notesOptional')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Log Sleep')}", "{saving ? t('saving') : (isEditing ? t('form.saveChanges') : t('logSleep'))}"],
  ]);
  writeFile('components/SleepModal.tsx', c);
  console.log('✅ SleepModal.tsx');
}

// ============================================================
// DiaperModal.tsx
// ============================================================
{
  let c = readFile('components/DiaperModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const isEditing = !!editEvent;\n    const [type, setType]", "const isEditing = !!editEvent;\n    const { t } = useTranslation('common');\n    const [type, setType]"],
    ["toast.error('Failed to save diaper change');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><Droplets size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Diaper Change</h2>", "<h2 className=\"modal-title\"><Droplets size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editDiaper') : t('logDiaper')}</h2>"],
    ["<label className=\"form-label\">Type</label>", "<label className=\"form-label\">{t('type')}</label>"],
    ["<Droplets size={16} /> Pee", "<Droplets size={16} /> {t('diaperTypes.pee')}"],
    ["<CircleDot size={16} /> Poo", "<CircleDot size={16} /> {t('diaperTypes.poo')}"],
    ["<RefreshCw size={16} /> Both", "<RefreshCw size={16} /> {t('diaperTypes.mixed')}"],
    ["<label className=\"form-label\">Color</label>", "<label className=\"form-label\">{t('color')}</label>"],
    ["<label className=\"form-label\">Consistency</label>", "<label className=\"form-label\">{t('consistency')}</label>"],
    ["<label className=\"form-label\">Amount</label>", "<label className=\"form-label\">{t('amount')}</label>"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Notes</label>", "<label className=\"form-label\">{t('notes')}</label>"],
    ["placeholder=\"Optional notes...\"", "placeholder={t('notesOptional')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save Diaper Change'}", "{saving ? t('saving') : t('saveDiaperChange')}"],
  ]);
  writeFile('components/DiaperModal.tsx', c);
  console.log('✅ DiaperModal.tsx');
}

// ============================================================
// BathModal.tsx
// ============================================================
{
  let c = readFile('components/BathModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();\n    const isEditing", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');\n    const isEditing"],
    ["toast.error('Failed to save bath');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><ShowerHead size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Bath</h2>", "<h2 className=\"modal-title\"><ShowerHead size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editBath') : t('logBath')}</h2>"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Notes (optional)</label>", "<label className=\"form-label\">{t('notes')} ({t('optional')})</label>"],
    ["placeholder=\"Products used, etc.\"", "placeholder={t('productsUsed')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save'}", "{saving ? t('saving') : t('save')}"],
  ]);
  writeFile('components/BathModal.tsx', c);
  console.log('✅ BathModal.tsx');
}

// ============================================================
// PumpingModal.tsx
// ============================================================
{
  let c = readFile('components/PumpingModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const isEditing = !!editEvent;\n    const [mode, setMode]", "const isEditing = !!editEvent;\n    const { t } = useTranslation('common');\n    const [mode, setMode]"],
    ["toast.error('Failed to save pumping');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><Milk size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Pumping</h2>", "<h2 className=\"modal-title\"><Milk size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editPumping') : t('logPumping')}</h2>"],
    ["<Pencil size={16} /> Quick Log", "<Pencil size={16} /> {t('quickLog')}"],
    ["<Timer size={16} /> Timer", "<Timer size={16} /> {t('timer')}"],
    ["▶️ Start Pumping", "▶️ {t('startPumping')}"],
    ["⏹️ Stop", "⏹️ {t('stop')}"],
    ["<label className=\"form-label\">Amount (ml)</label>", "<label className=\"form-label\">{t('amountMl')}</label>"],
    ["<label className=\"form-label\">Notes</label>", "<label className=\"form-label\">{t('notes')}</label>"],
    ["placeholder=\"Optional notes...\"", "placeholder={t('notesOptional')}"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Duration (min)</label>", "<label className=\"form-label\">{t('durationMin')}</label>"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save Pumping'}", "{saving ? t('saving') : t('savePumping')}"],
  ]);
  writeFile('components/PumpingModal.tsx', c);
  console.log('✅ PumpingModal.tsx');
}

// ============================================================
// SupplementModal.tsx
// ============================================================
{
  let c = readFile('components/SupplementModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();\n    const isEditing", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');\n    const isEditing"],
    ["toast.error('Failed to save supplement');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><Pill size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Supplement</h2>", "<h2 className=\"modal-title\"><Pill size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editSupplement') : t('logSupplement')}</h2>"],
    ["<label className=\"form-label\">Supplement</label>", "<label className=\"form-label\">{t('supplement')}</label>"],
    ["<label className=\"form-label\">Dosage (optional)</label>", "<label className=\"form-label\">{t('dosageOptional')}</label>"],
    ["placeholder=\"e.g., 400 IU, 1ml\"", "placeholder={t('dosagePlaceholder')}"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Notes (optional)</label>", "<label className=\"form-label\">{t('notes')} ({t('optional')})</label>"],
    ["placeholder=\"Any notes...\"", "placeholder={t('anyNotes')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save'}", "{saving ? t('saving') : t('save')}"],
  ]);
  // Replace supplement option labels
  c = c.replace(
    "{ value: 'vitamin_d', label: 'Vitamin D'",
    "{ value: 'vitamin_d', label: t('supplementTypes.vitamin_d')"
  ).replace(
    "{ value: 'iron', label: 'Iron'",
    "{ value: 'iron', label: t('supplementTypes.iron')"
  ).replace(
    "{ value: 'dha', label: 'DHA/Omega-3'",
    "{ value: 'dha', label: t('supplementTypes.dha')"
  ).replace(
    "{ value: 'probiotic', label: 'Probiotic'",
    "{ value: 'probiotic', label: t('supplementTypes.probiotic')"
  ).replace(
    "{ value: 'multivitamin', label: 'Multivitamin'",
    "{ value: 'multivitamin', label: t('supplementTypes.multivitamin')"
  ).replace(
    "{ value: 'other', label: 'Other'",
    "{ value: 'other', label: t('supplementTypes.other')"
  );
  writeFile('components/SupplementModal.tsx', c);
  console.log('✅ SupplementModal.tsx');
}

// ============================================================
// TummyTimeModal.tsx
// ============================================================
{
  let c = readFile('components/TummyTimeModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();\n    const isEditing", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');\n    const isEditing"],
    ["toast.error('Failed to save tummy time');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><Sun size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Tummy Time</h2>", "<h2 className=\"modal-title\"><Sun size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editTummyTime') : t('logTummyTime')}</h2>"],
    ["<label className=\"form-label\">Duration</label>", "<label className=\"form-label\">{t('duration')}</label>"],
    ["placeholder=\"Custom minutes\"", "placeholder={t('customMinutes')}"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Notes (optional)</label>", "<label className=\"form-label\">{t('notes')} ({t('optional')})</label>"],
    ["placeholder=\"Baby's mood, etc.\"", "placeholder={t('babysMood')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save'}", "{saving ? t('saving') : t('save')}"],
  ]);
  writeFile('components/TummyTimeModal.tsx', c);
  console.log('✅ TummyTimeModal.tsx');
}

// ============================================================
// PottyModal.tsx
// ============================================================
{
  let c = readFile('components/PottyModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();\n    const isEditing", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');\n    const isEditing"],
    ["toast.error('Failed to save potty');", "toast.error(t('errors.failedToSave'));"],
    ["<h2 className=\"modal-title\"><CircleDot size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Potty</h2>", "<h2 className=\"modal-title\"><CircleDot size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editPotty') : t('logPotty')}</h2>"],
    ["<label className=\"form-label\">Result</label>", "<label className=\"form-label\">{t('result')}</label>"],
    ["<label className=\"form-label\">Type (optional)</label>", "<label className=\"form-label\">{t('pottyType')}</label>"],
    ["<label className=\"form-label\">Time</label>", "<label className=\"form-label\">{t('time')}</label>"],
    ["<label className=\"form-label\">Notes (optional)</label>", "<label className=\"form-label\">{t('notes')} ({t('optional')})</label>"],
    ["placeholder=\"Any notes...\"", "placeholder={t('anyNotes')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : 'Save'}", "{saving ? t('saving') : t('save')}"],
  ]);
  writeFile('components/PottyModal.tsx', c);
  console.log('✅ PottyModal.tsx');
}

// ============================================================
// ErrorBoundary.tsx
// ============================================================
{
  let c = readFile('components/ErrorBoundary.tsx');
  // ErrorBoundary is a class component, can't use hooks. We'll leave the text as-is
  // since it's a rare error state. The t() function would need a HOC wrapper.
  // Skip this one - error boundaries don't support hooks.
  console.log('⏭️  ErrorBoundary.tsx (class component, skipped - no hooks)');
}

// ============================================================
// LoadingSpinner.tsx
// ============================================================
{
  // LoadingSpinner takes text as prop - already flexible. Skip.
  console.log('⏭️  LoadingSpinner.tsx (text via props, already flexible)');
}

// ============================================================
// OfflineIndicator.tsx
// ============================================================
{
  let c = readFile('components/OfflineIndicator.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export function OfflineIndicator({ online, syncing, pendingCount, onSync }: OfflineIndicatorProps) {", "export function OfflineIndicator({ online, syncing, pendingCount, onSync }: OfflineIndicatorProps) {\n    const { t } = useTranslation('common');"],
    ["<span>You're offline</span>", "<span>{t('offline.youreOffline')}</span>"],
    ["• {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending", "• {t('offline.changesPending', { count: pendingCount })}"],
    ["<span>Syncing changes...</span>", "<span>{t('offline.syncingChanges')}</span>"],
    ["<span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} to sync</span>", "<span>{t('offline.changesToSync', { count: pendingCount })}</span>"],
    [">Sync now<", ">{t('offline.syncNow')}<"],
  ]);
  writeFile('components/OfflineIndicator.tsx', c);
  console.log('✅ OfflineIndicator.tsx');
}

// ============================================================
// QuickActions.tsx
// ============================================================
{
  let c = readFile('components/QuickActions.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function QuickActions(", "export default function QuickActions("],
    ["return (", "const { t } = useTranslation('dashboard');\n    return ("],
    ["<span>Feeding</span>", "<span>{t('quickActions.feeding')}</span>"],
    ["<span>Diaper</span>", "<span>{t('quickActions.diaper')}</span>"],
    ["<span>Sleep</span>", "<span>{t('quickActions.sleep')}</span>"],
    ["<span>Pump</span>", "<span>{t('quickActions.pump')}</span>"],
  ]);
  writeFile('components/QuickActions.tsx', c);
  console.log('✅ QuickActions.tsx');
}

// ============================================================
// WidgetSettings.tsx
// ============================================================
{
  let c = readFile('components/WidgetSettings.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [isOpen, setIsOpen] = useState(false);", "const { t } = useTranslation(['dashboard', 'common']);\n    const [isOpen, setIsOpen] = useState(false);"],
    ["<span className=\"widget-settings-btn-title\">Edit Activities</span>", "<span className=\"widget-settings-btn-title\">{t('dashboard:widgetSettings.editActivities')}</span>"],
    ["{disabledCount > 0 ? `${disabledCount} hidden` : 'All visible'}", "{disabledCount > 0 ? t('dashboard:widgetSettings.hidden', { count: disabledCount }) : t('dashboard:widgetSettings.allVisible')}"],
    ["<h3>Dashboard Activities</h3>", "<h3>{t('dashboard:widgetSettings.dashboardActivities')}</h3>"],
    ["Tap to show or hide activities on your dashboard", "{t('dashboard:widgetSettings.tapToToggle')}"],
    ["<span className=\"widget-settings-toggle-label\">Quick Actions</span>", "<span className=\"widget-settings-toggle-label\">{t('dashboard:widgetSettings.quickActions')}</span>"],
    ["One-tap buttons on widgets", "{t('dashboard:widgetSettings.quickActionsHint')}"],
  ]);
  writeFile('components/WidgetSettings.tsx', c);
  console.log('✅ WidgetSettings.tsx');
}

// ============================================================
// DailySummary.tsx
// ============================================================
{
  let c = readFile('components/DailySummary.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function DailySummary({ summary, visibleWidgets", "export default function DailySummary_({ summary, visibleWidgets"],
    ["export default function DailySummary_({ summary, visibleWidgets", "export default function DailySummary({ summary, visibleWidgets"],
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation(['dashboard', 'common']);"],
    ["<span>Daily Summary</span>", "<span>{t('dashboard:dailySummary.title')}</span>"],
    [">Today<", ">{t('dashboard:dailySummary.today')}<"],
    [">Yesterday<", ">{t('dashboard:dailySummary.yesterday')}<"],
    ["<div className=\"daily-summary-loading\">Loading...</div>", "<div className=\"daily-summary-loading\">{t('common:loading')}</div>"],
    ["No data for {activeTab === 'today' ? 'today' : 'yesterday'}", "{t('dashboard:dailySummary.noData', { period: activeTab === 'today' ? t('dashboard:dailySummary.today') : t('dashboard:dailySummary.yesterday') })}"],
    ["label: 'feedings'", "label: t('dashboard:dailySummary.feedings')"],
    ["label: 'diapers'", "label: t('dashboard:dailySummary.diapers')"],
    ["label: 'sleep'", "label: t('dashboard:dailySummary.sleep')"],
    ["label: 'pumps'", "label: t('dashboard:dailySummary.pumps')"],
    ["label: 'potty'", "label: t('dashboard:dailySummary.potty')"],
    ["label: 'tummy time'", "label: t('dashboard:dailySummary.tummyTime')"],
    ["label: data.bath_count === 1 ? 'bath' : 'baths'", "label: t('dashboard:dailySummary.bath', { count: data.bath_count })"],
  ]);
  writeFile('components/DailySummary.tsx', c);
  console.log('✅ DailySummary.tsx');
}

// ============================================================
// BabyGreeting.tsx
// ============================================================
{
  let c = readFile('components/BabyGreeting.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { babies, selectedBaby, selectBaby, removeBaby, refresh } = useBaby();", "const { babies, selectedBaby, selectBaby, removeBaby, refresh } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success(`${formData.name} added!`);", "toast.success(t('baby.babyAdded', { name: formData.name }));"],
    ["toast.error('Failed to add baby');", "toast.error(t('errors.failedToSave'));"],
    ["toast.success(`${formData.name} updated!`);", "toast.success(t('baby.babyUpdated', { name: formData.name }));"],
    ["toast.error('Failed to update baby');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"greeting-text\">Welcome!</span>", "<span className=\"greeting-text\">{t('baby.welcome')}</span>"],
    ["Add your first baby to get started", "{t('baby.addFirstBaby')}"],
    ["<h2 className=\"modal-title\">Add Baby</h2>", "<h2 className=\"modal-title\">{t('baby.addBaby')}</h2>"],
    ["<span>Share {selectedBaby.name}</span>", "<span>{t('baby.shareBaby', { name: selectedBaby.name })}</span>"],
    ["<span>Edit {selectedBaby.name}</span>", "<span>{t('baby.editBaby', { name: selectedBaby.name })}</span>"],
    ["<span>Add Baby</span>", "<span>{t('baby.addBaby')}</span>"],
    ["<span>Delete {selectedBaby.name}</span>", "<span>{t('baby.deleteBaby', { name: selectedBaby.name })}</span>"],
    ["`Delete ${selectedBaby.name}? This removes all data and cannot be undone.`", "t('baby.deleteConfirmShort', { name: selectedBaby.name })"],
    ["<h2 className=\"modal-title\">Edit {selectedBaby.name}</h2>", "<h2 className=\"modal-title\">{t('baby.editBaby', { name: selectedBaby.name })}</h2>"],
    ["<span className=\"baby-dropdown-shared\">Shared</span>", "<span className=\"baby-dropdown-shared\">{t('baby.shared')}</span>"],
  ]);
  writeFile('components/BabyGreeting.tsx', c);
  console.log('✅ BabyGreeting.tsx');
}

// ============================================================
// AddBabyForm.tsx
// ============================================================
{
  let c = readFile('components/AddBabyForm.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [name, setName]", "const { t } = useTranslation('common');\n    const [name, setName]"],
    ["<label className=\"form-label\">Baby's Name *</label>", "<label className=\"form-label\">{t('form.babysName')} *</label>"],
    ["placeholder=\"Enter name\"", "placeholder={t('form.enterName')}"],
    ["<label className=\"form-label\">Birth Date *</label>", "<label className=\"form-label\">{t('form.birthDate')} *</label>"],
    ["<label className=\"form-label\">Gender</label>", "<label className=\"form-label\">{t('form.gender')}</label>"],
    [">Boy<", ">{t('gender.boy')}<"],
    [">Girl<", ">{t('gender.girl')}<"],
    ["<p className=\"form-hint\">Optional - helps with accurate growth charts</p>", "<p className=\"form-hint\">{t('form.genderHint')}</p>"],
    ["<span>Birth Measurements (optional)</span>", "<span>{t('form.birthMeasurements')}</span>"],
    ["<Scale size={14} /> Weight (kg)", "<Scale size={14} /> {t('form.weight')}"],
    ["<Ruler size={14} /> Height (cm)", "<Ruler size={14} /> {t('form.height')}"],
    [">Cancel<", ">{t('cancel')}<"],
    ["{saving ? 'Saving...' : submitLabel}", "{saving ? t('saving') : submitLabel}"],
  ]);
  writeFile('components/AddBabyForm.tsx', c);
  console.log('✅ AddBabyForm.tsx');
}

// ============================================================
// BabySelector.tsx
// ============================================================
{
  let c = readFile('components/BabySelector.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { babies, selectedBaby, selectBaby, refresh, removeBaby } = useBaby();", "const { babies, selectedBaby, selectBaby, refresh, removeBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    [">+ Add Baby<", ">{t('baby.addBaby')}<"],
    ["<h2 className=\"modal-title\">Add Your Baby</h2>", "<h2 className=\"modal-title\">{t('baby.addBaby')}</h2>"],
    ["toast.success(`${formData.name} added!`);", "toast.success(t('baby.babyAdded', { name: formData.name }));"],
    ["toast.error('Failed to add baby');", "toast.error(t('errors.failedToSave'));"],
    ["<span className=\"baby-name\">{selectedBaby?.name || 'Select Baby'}</span>", "<span className=\"baby-name\">{selectedBaby?.name || t('baby.selectBaby')}</span>"],
    [">Shared<", ">{t('baby.shared')}<"],
    [">Share {selectedBaby?.name}<", ">{t('baby.shareBaby', { name: selectedBaby?.name })}<"],
    ["`Are you sure you want to delete ${selectedBaby.name}? This will remove all feeding, diaper, sleep, and health records. This cannot be undone.`", "t('baby.deleteConfirm', { name: selectedBaby.name })"],
    [">Delete {selectedBaby?.name}<", ">{t('baby.deleteBaby', { name: selectedBaby?.name })}<"],
    [">+ Add Another Baby<", ">{t('baby.addAnotherBaby')}<"],
    ["<h2 className=\"modal-title\">Add Baby</h2>", "<h2 className=\"modal-title\">{t('baby.addBaby')}</h2>"],
  ]);
  writeFile('components/BabySelector.tsx', c);
  console.log('✅ BabySelector.tsx');
}

// ============================================================
// ShareModal.tsx
// ============================================================
{
  let c = readFile('components/ShareModal.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [email, setEmail]", "const { t } = useTranslation('common');\n    const [email, setEmail]"],
    ["<h2>Share {baby.name}</h2>", "<h2>{t('baby.shareBaby', { name: baby.name })}</h2>"],
    ["<label>Add by email</label>", "<label>{t('shareModal.addByEmail')}</label>"],
    ["placeholder=\"partner@example.com\"", "placeholder={t('shareModal.emailPlaceholder')}"],
    ["{loading ? '...' : 'Share'}", "{loading ? '...' : t('share')}"],
    ["<label>Shared with</label>", "<label>{t('shareModal.sharedWith')}</label>"],
    [">Remove<", ">{t('remove')}<"],
    ["Enter an email to share access to {baby.name} with another person.", "{t('shareModal.sharePrompt', { name: baby.name })}"],
    [">Done<", ">{t('shareModal.done')}<"],
  ]);
  writeFile('components/ShareModal.tsx', c);
  console.log('✅ ShareModal.tsx');
}

// ============================================================
// TimePicker.tsx
// ============================================================
{
  let c = readFile('components/TimePicker.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const dateValue = value instanceof Date", "const { t } = useTranslation('common');\n    const dateValue = value instanceof Date"],
    [">Now<", ">{t('now')}<"],
  ]);
  writeFile('components/TimePicker.tsx', c);
  console.log('✅ TimePicker.tsx');
}

// ============================================================
// Timeline.tsx
// ============================================================
{
  let c = readFile('components/Timeline.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function Timeline({ events, onRefresh }: TimelineProps) {", "export default function Timeline({ events, onRefresh }: TimelineProps) {\n    const { t } = useTranslation('common');"],
    ["<p className=\"empty-state-text\">No events logged today</p>", "<p className=\"empty-state-text\">{t('empty.noEventsToday')}</p>"],
  ]);
  writeFile('components/Timeline.tsx', c);
  console.log('✅ Timeline.tsx');
}

// ============================================================
// TimelineCalendar.tsx
// ============================================================
{
  let c = readFile('components/TimelineCalendar.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('common');"],
    ["toast.success('Deleted successfully');", "toast.success(t('deletedSuccessfully'));"],
    ["toast.error('Failed to delete');", "toast.error(t('errors.failedToDelete'));"],
    ["<h2 className=\"empty-state-title\">No baby selected</h2>", "<h2 className=\"empty-state-title\">{t('empty.noBabySelected')}</h2>"],
    ["<p>No events recorded</p>", "<p>{t('empty.noEventsRecorded')}</p>"],
    ["<span>Add activities from the dashboard to see them here</span>", "<span>{t('empty.addFromDashboard')}</span>"],
    ["<h3>Delete {EVENT_CONFIG[confirmDelete.event_type]?.label || 'Event'}?</h3>", "<h3>{t('deleteEvent', { type: EVENT_CONFIG[confirmDelete.event_type]?.label || '' })}</h3>"],
    ["<p>This action cannot be undone.</p>", "<p>{t('deleteCannotUndo')}</p>"],
    [">Cancel<", ">{t('cancel')}<"],
    [">Delete<", ">{t('delete')}<"],
    ["<Pencil size={14} /> Edit", "<Pencil size={14} /> {t('edit')}"],
    ["<Trash2 size={14} /> Delete", "<Trash2 size={14} /> {t('delete')}"],
  ]);
  writeFile('components/TimelineCalendar.tsx', c);
  console.log('✅ TimelineCalendar.tsx');
}

// ============================================================
// Learn.tsx
// ============================================================
{
  let c = readFile('components/Learn.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('health');"],
    ["<TrendingUp size={24} /> Insights", "<TrendingUp size={24} /> {t('insights.title')}"],
    ["<Sparkles size={14} /> For {selectedBaby.name}, {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'} old", "<Sparkles size={14} /> {t('insights.forBaby', { name: selectedBaby.name, age: babyAgeMonths, ageUnit: t('insights.month', { count: babyAgeMonths }) })}"],
  ]);
  writeFile('components/Learn.tsx', c);
  console.log('✅ Learn.tsx');
}

// ============================================================
// BabyInsights.tsx
// ============================================================
{
  let c = readFile('components/BabyInsights.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation('health');"],
    ["<p>Select a baby to see insights</p>", "<p>{t('insights.selectBaby')}</p>"],
    ["<p>Analyzing patterns...</p>", "<p>{t('insights.analyzingPatterns')}</p>"],
    ["<h3>Collecting Data</h3>", "<h3>{t('insights.collectingData')}</h3>"],
    ["Keep tracking for a few more days! We need at least 3-5 days of data\n                    to identify patterns and make predictions.", "{t('insights.collectingDataDesc')}"],
    ["<span>Data points: {analytics?.data_points?.feedings || 0} feedings, {analytics?.data_points?.sleeps || 0} sleeps</span>", "<span>{t('insights.dataPoints', { feedings: analytics?.data_points?.feedings || 0, sleeps: analytics?.data_points?.sleeps || 0 })}</span>"],
  ]);
  writeFile('components/BabyInsights.tsx', c);
  console.log('✅ BabyInsights.tsx');
}

// ============================================================
// ComingUp.tsx
// ============================================================
{
  let c = readFile('components/ComingUp.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["if (!items.length) return null;", "const { t } = useTranslation('common');\n    if (!items.length) return null;"],
    ["<h3>Coming Up</h3>", "<h3>{t('comingUp.title')}</h3>"],
    ["{item.type === 'medication' ? 'Active' :\n                                    item.type === 'vaccination' ? 'Vaccine' : 'Visit'}", "{item.type === 'medication' ? t('comingUp.active') :\n                                    item.type === 'vaccination' ? t('comingUp.vaccine') : t('comingUp.visit')}"],
  ]);
  writeFile('components/ComingUp.tsx', c);
  console.log('✅ ComingUp.tsx');
}

// ============================================================
// PrivacyPolicy.tsx
// ============================================================
{
  let c = readFile('pages/PrivacyPolicy.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {", "export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {\n    const { t } = useTranslation('settings');"],
    ["<span>Back</span>", "<span>{t('privacy.back')}</span>"],
    ["<h1 className=\"legal-title\">Privacy Policy</h1>", "<h1 className=\"legal-title\">{t('privacy.title')}</h1>"],
    ["<p className=\"legal-updated\">Last updated: January 2026</p>", "<p className=\"legal-updated\">{t('privacy.lastUpdated')}</p>"],
  ]);
  writeFile('pages/PrivacyPolicy.tsx', c);
  console.log('✅ PrivacyPolicy.tsx');
}

// ============================================================
// Health.tsx (page)
// ============================================================
{
  let c = readFile('pages/Health.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const { selectedBaby } = useBaby();", "const { selectedBaby } = useBaby();\n    const { t } = useTranslation(['health', 'common']);"],
    ["toast.error('Failed to load health data');", "toast.error(t('common:errors.failedToLoad'));"],
    ["<h2 className=\"empty-state-title\">No baby selected</h2>", "<h2 className=\"empty-state-title\">{t('health:noBabySelected')}</h2>"],
  ]);
  writeFile('pages/Health.tsx', c);
  console.log('✅ Health.tsx');
}

// ============================================================
// GrowthCard.tsx
// ============================================================
{
  let c = readFile('components/health/GrowthCard.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [showChart, setShowChart]", "const { t } = useTranslation('health');\n    const [showChart, setShowChart]"],
    ["toast.error('Please enter at least one measurement');", "toast.error(t('growth.enterOneMeasurement'));"],
    ["toast.success('Growth recorded!');", "toast.success(t('growth.growthRecorded'));"],
    [">Growth<", ">{t('growth.title')}<"],
    ["{showChart ? 'Hide Chart' : 'Full Chart'}", "{showChart ? t('growth.hideChart') : t('growth.fullChart')}"],
    [">Weight<", ">{t('growth.weight')}<"],
    [">Height<", ">{t('growth.height')}<"],
    [">Head<", ">{t('growth.head')}<"],
    [">Log Measurement<", ">{t('growth.logMeasurement')}<"],
    [">Save<", ">{t('common:save', { ns: 'common' })}<"],
    // placeholders
    ["placeholder=\"kg\"", "placeholder={t('growth.weight')}"],
    ["placeholder=\"cm\"", "placeholder={t('growth.height')}"],
    ["placeholder=\"head\"", "placeholder={t('growth.head')}"],
  ]);
  writeFile('components/health/GrowthCard.tsx', c);
  console.log('✅ GrowthCard.tsx');
}

// ============================================================
// MilestonesCard.tsx
// ============================================================
{
  let c = readFile('components/health/MilestonesCard.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [isAdding, setIsAdding] = useState(false);", "const { t } = useTranslation('health');\n    const [isAdding, setIsAdding] = useState(false);"],
    ["toast.error('Please describe the milestone');", "toast.error(t('milestones.whatMilestone'));"],
    ["toast.success('Milestone added!');", "toast.success(t('milestones.milestoneAdded'));"],
    ["toast.success('Milestone deleted');", "toast.success(t('milestones.milestoneDeleted'));"],
    [">Milestones<", ">{t('milestones.title')}<"],
    ["{milestones.length} total", "{t('milestones.total', { count: milestones.length })}"],
    ["<p className=\"health-card-empty\">No milestones recorded yet</p>", "<p className=\"health-card-empty\">{t('milestones.noMilestones')}</p>"],
    [">Add Milestone<", ">{t('milestones.addMilestone')}<"],
    ["placeholder=\"What milestone? (e.g., First steps)\"", "placeholder={t('milestones.whatMilestone')}"],
  ]);
  writeFile('components/health/MilestonesCard.tsx', c);
  console.log('✅ MilestonesCard.tsx');
}

// ============================================================
// TeethingCard.tsx
// ============================================================
{
  let c = readFile('components/health/TeethingCard.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [selectedTooth, setSelectedTooth]", "const { t } = useTranslation('health');\n    const [selectedTooth, setSelectedTooth]"],
    ["toast.success(`${selectedTooth.name} marked as emerged!`);", "toast.success(t('teething.markedEmerged', { name: selectedTooth.name }));"],
    ["toast.success('Tooth record removed');", "toast.success(t('teething.toothRemoved'));"],
    [">Teething<", ">{t('teething.title')}<"],
    ["{teethCount}/20 teeth", "{t('teething.teethCount', { count: teethCount })}"],
    ["<div className=\"teeth-label\">Upper</div>", "<div className=\"teeth-label\">{t('teething.upper')}</div>"],
    ["<div className=\"teeth-label\">Lower</div>", "<div className=\"teeth-label\">{t('teething.lower')}</div>"],
    [">Mark {selectedTooth.name} as Emerged<", ">{t('teething.markEmerged', { name: selectedTooth.name })}<"],
    [">Mark Emerged<", ">{t('teething.emerged')}<"],
    [">Remove Record<", ">{t('teething.removeRecord')}<"],
    ["<span className=\"legend-item\"><span className=\"legend-dot emerged\" /> Emerged</span>", "<span className=\"legend-item\"><span className=\"legend-dot emerged\" /> {t('teething.emerged')}</span>"],
    ["<span className=\"legend-item\"><span className=\"legend-dot expected\" /> Expected</span>", "<span className=\"legend-item\"><span className=\"legend-dot expected\" /> {t('teething.expected')}</span>"],
    ["<span className=\"legend-item\"><span className=\"legend-dot future\" /> Future</span>", "<span className=\"legend-item\"><span className=\"legend-dot future\" /> {t('teething.future')}</span>"],
  ]);
  writeFile('components/health/TeethingCard.tsx', c);
  console.log('✅ TeethingCard.tsx');
}

// ============================================================
// AllergiesCard.tsx
// ============================================================
{
  let c = readFile('components/health/AllergiesCard.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [isAdding, setIsAdding] = useState(false);", "const { t } = useTranslation('health');\n    const [isAdding, setIsAdding] = useState(false);"],
    ["toast.error('Please enter the allergen');", "toast.error(t('allergies.enterAllergen'));"],
    ["toast.success('Allergy recorded');", "toast.success(t('allergies.allergyRecorded'));"],
    ["toast.success('Allergy removed');", "toast.success(t('allergies.allergyRemoved'));"],
    [">Allergies<", ">{t('allergies.title')}<"],
    ["{allergies.length} known", "{t('allergies.known', { count: allergies.length })}"],
    ["<p className=\"health-card-empty\">No known allergies</p>", "<p className=\"health-card-empty\">{t('allergies.noAllergies')}</p>"],
    [">Add Allergy<", ">{t('allergies.addAllergy')}<"],
    ["placeholder=\"Allergen (e.g., Peanuts)\"", "placeholder={t('allergies.allergenPlaceholder')}"],
    ["placeholder=\"Reaction (e.g., hives, swelling)\"", "placeholder={t('allergies.reactionPlaceholder')}"],
    ["placeholder=\"Additional notes...\"", "placeholder={t('allergies.additionalNotes')}"],
  ]);
  writeFile('components/health/AllergiesCard.tsx', c);
  console.log('✅ AllergiesCard.tsx');
}

// ============================================================
// SickDaysCard.tsx
// ============================================================
{
  let c = readFile('components/health/SickDaysCard.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [isAdding, setIsAdding] = useState(false);", "const { t } = useTranslation('health');\n    const [isAdding, setIsAdding] = useState(false);"],
    ["toast.error('Please add at least one symptom, temperature, or note');", "toast.error(t('sickDays.addSymptom'));"],
    ["toast.success('Sick day logged');", "toast.success(t('sickDays.sickDayLogged'));"],
    ["toast.success('Sick day removed');", "toast.success(t('sickDays.sickDayRemoved'));"],
    [">Sick Days<", ">{t('sickDays.title')}<"],
    ["{sickDays.length} recorded", "{t('sickDays.recorded', { count: sickDays.length })}"],
    ["<p className=\"health-card-empty\">No sick days recorded - great!</p>", "<p className=\"health-card-empty\">{t('sickDays.noSickDays')}</p>"],
    [">Log Sick Day<", ">{t('sickDays.logSickDay')}<"],
    ["placeholder=\"Temp °C\"", "placeholder={t('sickDays.tempPlaceholder')}"],
    ["placeholder=\"Additional notes...\"", "placeholder={t('sickDays.additionalNotes')}"],
  ]);
  writeFile('components/health/SickDaysCard.tsx', c);
  console.log('✅ SickDaysCard.tsx');
}

// ============================================================
// RecordsSection.tsx
// ============================================================
{
  let c = readFile('components/health/RecordsSection.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["const [activeTab, setActiveTab] = useState('visits');", "const { t } = useTranslation('health');\n    const [activeTab, setActiveTab] = useState('visits');"],
    [">Visits<", ">{t('records.visits')}<"],
    [">Vaccines<", ">{t('records.vaccines')}<"],
    [">Meds<", ">{t('records.meds')}<"],
  ]);
  // VisitsPanel
  c = c.replace(
    "function VisitsPanel({ baby, visits, onDataChanged }: { baby: any; visits: any[]; onDataChanged?: () => void }) {",
    "function VisitsPanel({ baby, visits, onDataChanged }: { baby: any; visits: any[]; onDataChanged?: () => void }) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Visit recorded');", "toast.success(t('records.visitRecorded'));"],
    ["toast.success('Visit deleted');", "toast.success(t('records.visitDeleted'));"],
    ["<p className=\"records-empty\">No doctor visits recorded</p>", "<p className=\"records-empty\">{t('records.noVisits')}</p>"],
    [">Add Visit<", ">{t('records.addVisit')}<"],
    ["{saving ? 'Saving...' : 'Save Visit'}", "{saving ? '...' : t('records.visitForm.saveVisit')}"],
  ]);
  // VaccinationsPanel
  c = c.replace(
    "function VaccinationsPanel({ baby, vaccinations, onDataChanged }: { baby: any; vaccinations: any[]; onDataChanged?: () => void }) {",
    "function VaccinationsPanel({ baby, vaccinations, onDataChanged }: { baby: any; vaccinations: any[]; onDataChanged?: () => void }) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Vaccination recorded');", "toast.success(t('records.vaccinationRecorded'));"],
    ["toast.success('Vaccination deleted');", "toast.success(t('records.vaccinationDeleted'));"],
    ["<p className=\"records-empty\">No vaccinations recorded</p>", "<p className=\"records-empty\">{t('records.noVaccinations')}</p>"],
    [">Add Vaccination<", ">{t('records.addVaccination')}<"],
    ["{saving ? 'Saving...' : 'Save Vaccination'}", "{saving ? '...' : t('records.vaccineForm.saveVaccination')}"],
  ]);
  // MedicationsPanel
  c = c.replace(
    "function MedicationsPanel({ baby, medications, onDataChanged }: { baby: any; medications: any[]; onDataChanged?: () => void }) {",
    "function MedicationsPanel({ baby, medications, onDataChanged }: { baby: any; medications: any[]; onDataChanged?: () => void }) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Medication added');", "toast.success(t('records.medicationAdded'));"],
    ["toast.success('Medication deleted');", "toast.success(t('records.medicationDeleted'));"],
    ["toast.success(med.is_active ? 'Medication stopped' : 'Medication reactivated');", "toast.success(med.is_active ? t('records.medicationStopped') : t('records.medicationReactivated'));"],
    ["<p className=\"records-empty\">No medications recorded</p>", "<p className=\"records-empty\">{t('records.noMedications')}</p>"],
    [">Add Medication<", ">{t('records.addMedication')}<"],
    [">Stop<", ">{t('records.stop')}<"],
    [">Restart<", ">{t('records.restart')}<"],
    ["<h4 className=\"meds-section-title\">Active</h4>", "<h4 className=\"meds-section-title\">{t('records.active')}</h4>"],
    ["<h4 className=\"meds-section-title\">Past</h4>", "<h4 className=\"meds-section-title\">{t('records.past')}</h4>"],
    ["<h4 className=\"reminders-title\">Upcoming</h4>", "<h4 className=\"reminders-title\">{t('records.upcoming')}</h4>"],
  ]);
  writeFile('components/health/RecordsSection.tsx', c);
  console.log('✅ RecordsSection.tsx');
}

// ============================================================
// HealthModals.tsx
// ============================================================
{
  let c = readFile('components/health/HealthModals.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  // VisitModal
  c = c.replace(
    "export function VisitModal({ babyId, editData, onClose, onSave }: VisitModalProps) {",
    "export function VisitModal({ babyId, editData, onClose, onSave }: VisitModalProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Visit updated');", "toast.success(t('records.modals.visitUpdated'));"],
    ["toast.success('Visit logged');", "toast.success(t('records.modals.visitLogged'));"],
    ["<ClipboardList size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Doctor Visit", "<ClipboardList size={20} style={{ marginRight: '8px' }} /> {editData ? t('records.modals.editDoctorVisit') : t('records.modals.logDoctorVisit')}"],
  ]);
  // VaccModal
  c = c.replace(
    "export function VaccModal({ babyId, editData, onClose, onSave }: VaccModalProps) {",
    "export function VaccModal({ babyId, editData, onClose, onSave }: VaccModalProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Vaccination updated');", "toast.success(t('records.modals.vaccinationUpdated'));"],
    ["toast.success('Vaccination logged');", "toast.success(t('records.modals.vaccinationLogged'));"],
    ["<Syringe size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Vaccination", "<Syringe size={20} style={{ marginRight: '8px' }} /> {editData ? t('records.modals.editVaccination') : t('records.modals.logVaccination')}"],
  ]);
  // MedModal
  c = c.replace(
    "export function MedModal({ babyId, editData, onClose, onSave }: MedModalProps) {",
    "export function MedModal({ babyId, editData, onClose, onSave }: MedModalProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Medication updated');", "toast.success(t('records.modals.medicationUpdated'));"],
    ["toast.success('Medication added');", "toast.success(t('records.modals.medicationAdded'));"],
    ["<Pill size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Add'} Medication", "<Pill size={20} style={{ marginRight: '8px' }} /> {editData ? t('records.modals.editMedication') : t('records.modals.addMedication')}"],
  ]);
  // MilestoneModal
  c = c.replace(
    "export function MilestoneModal({ babyId, editData, onClose, onSave }: MilestoneModalProps) {",
    "export function MilestoneModal({ babyId, editData, onClose, onSave }: MilestoneModalProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Milestone updated');", "toast.success(t('milestones.milestoneUpdated'));"],
    ["toast.success('Milestone logged');", "toast.success(t('milestones.milestoneLogged'));"],
    ["<Star size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Milestone", "<Star size={20} style={{ marginRight: '8px' }} /> {editData ? t('milestones.editMilestone') : t('milestones.logMilestone')}"],
  ]);
  // GrowthModal
  c = c.replace(
    "export function GrowthModal({ babyId, editData, onClose, onSave }: GrowthModalProps) {",
    "export function GrowthModal({ babyId, editData, onClose, onSave }: GrowthModalProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["toast.success('Growth record updated');", "toast.success(t('growth.growthRecordUpdated'));"],
    ["toast.success('Growth record logged');", "toast.success(t('growth.growthRecordLogged'));"],
    ["<TrendingUp size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Growth", "<TrendingUp size={20} style={{ marginRight: '8px' }} /> {editData ? t('growth.editGrowth') : t('growth.logGrowth')}"],
  ]);
  writeFile('components/health/HealthModals.tsx', c);
  console.log('✅ HealthModals.tsx');
}

// ============================================================
// InsightsSections.tsx
// ============================================================
{
  let c = readFile('components/insights/InsightsSections.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  // PredictionsSection
  c = c.replace(
    "export function PredictionsSection({ predictions, isPremium }: PredictionsSectionProps) {",
    "export function PredictionsSection({ predictions, isPremium }: PredictionsSectionProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["<span>Predictions</span>", "<span>{t('insights.predictions.title')}</span>"],
    ["<span className=\"insight-card-label\">Next Feeding</span>", "<span className=\"insight-card-label\">{t('insights.predictions.nextFeeding')}</span>"],
    ["<span className=\"insight-card-label\">Next Nap</span>", "<span className=\"insight-card-label\">{t('insights.predictions.nextNap')}</span>"],
    ["<span className=\"insight-card-alert\">May be hungry!</span>", "<span className=\"insight-card-alert\">{t('insights.predictions.mayBeHungry')}</span>"],
    ["<span className=\"insight-card-label\">Sleep Pressure</span>", "<span className=\"insight-card-label\">{t('insights.predictions.sleepPressure')}</span>"],
    ["<span>Upgrade to see predictions</span>", "<span>{t('insights.predictions.upgradeToSee')}</span>"],
  ]);
  // PatternsSection
  c = c.replace(
    "export function PatternsSection({ patterns, isPremium }: PatternsSectionProps) {",
    "export function PatternsSection({ patterns, isPremium }: PatternsSectionProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["<span>Patterns</span>", "<span>{t('insights.patterns.title')}</span>"],
    ["<span>Upgrade to see patterns</span>", "<span>{t('insights.patterns.upgradeToSee')}</span>"],
  ]);
  // TrendsSection
  c = c.replace(
    "export function TrendsSection({ trends, isPremium }: TrendsSectionProps) {",
    "export function TrendsSection({ trends, isPremium }: TrendsSectionProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["<span>14-Day Trends</span>", "<span>{t('insights.trends.title')}</span>"],
    ["<span>Upgrade to see trends</span>", "<span>{t('insights.trends.upgradeToSee')}</span>"],
  ]);
  // BenchmarksSection
  c = c.replace(
    "export function BenchmarksSection({ benchmarks, today_vs_average }: BenchmarksSectionProps) {",
    "export function BenchmarksSection({ benchmarks, today_vs_average }: BenchmarksSectionProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["<span>Age Guidelines</span>", "<span>{t('insights.benchmarks.title')}</span>"],
    ["<span>Diapers Today</span>", "<span>{t('insights.benchmarks.diapersToday')}</span>"],
    ["<span>Sleep Today</span>", "<span>{t('insights.benchmarks.sleepToday')}</span>"],
    ["<span>Feedings Today</span>", "<span>{t('insights.benchmarks.feedingsToday')}</span>"],
  ]);
  // TodayVsAverageSection
  c = c.replace(
    "export function TodayVsAverageSection({ today_vs_average }: TodayVsAverageSectionProps) {",
    "export function TodayVsAverageSection({ today_vs_average }: TodayVsAverageSectionProps) {\n    const { t } = useTranslation('health');"
  );
  c = replace(c, [
    ["<span>Today vs. Your Average</span>", "<span>{t('insights.todayVsAverage.title')}</span>"],
    ["<span className=\"comparison-label\">Feedings</span>", "<span className=\"comparison-label\">{t('insights.todayVsAverage.feedings')}</span>"],
    ["<span className=\"comparison-label\">Diapers</span>", "<span className=\"comparison-label\">{t('insights.todayVsAverage.diapers')}</span>"],
    ["<span className=\"comparison-label\">Sleep</span>", "<span className=\"comparison-label\">{t('insights.todayVsAverage.sleep')}</span>"],
  ]);
  writeFile('components/insights/InsightsSections.tsx', c);
  console.log('✅ InsightsSections.tsx');
}

// ============================================================
// GrowthChart.tsx (top-level component)
// ============================================================
{
  let c = readFile('components/GrowthChart.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function GrowthChart({ records, birthDate, metric = 'weight', gender = 'boy' }: GrowthChartProps) {", "export default function GrowthChart({ records, birthDate, metric = 'weight', gender = 'boy' }: GrowthChartProps) {\n    const { t } = useTranslation('health');"],
    ["Add baby's birth date to see growth chart", "{t('growth.addBirthDate')}"],
    ["No {metric} data recorded yet", "{metric === 'weight' ? t('growth.noWeightData') : t('growth.noHeightData')}"],
    ["<h4>{label} for Age</h4>", "<h4>{metric === 'weight' ? t('growth.weightForAge') : t('growth.heightForAge')}</h4>"],
    ["WHO standards ({gender === 'girl' ? 'Girls' : 'Boys'})", "{t('growth.whoStandards', { gender: gender === 'girl' ? t('growth.girls') : t('growth.boys') })}"],
    ["Your baby", "{t('growth.yourBaby')}"],
    [">50th percentile<", ">{t('growth.50thPercentile')}<"],
    [">3rd-97th range<", ">{t('growth.3rdTo97thRange')}<"],
  ]);
  writeFile('components/GrowthChart.tsx', c);
  console.log('✅ GrowthChart.tsx');
}

// ============================================================
// Widget.tsx (generic widget)
// ============================================================
{
  let c = readFile('components/Widget.tsx');
  c = addImport(c, "import { useTranslation } from 'react-i18next';");
  c = replace(c, [
    ["export default function Widget({ type, label, value, detail, isSleeping, onClick, lastTime }: WidgetProps) {", "export default function Widget({ type, label, value, detail, isSleeping, onClick, lastTime }: WidgetProps) {\n    const { t } = useTranslation('common');"],
    ["<span className=\"widget-empty-text\">Tap to log</span>", "<span className=\"widget-empty-text\">{t('empty.tapToLog')}</span>"],
  ]);
  writeFile('components/Widget.tsx', c);
  console.log('✅ Widget.tsx');
}

console.log('\n🎉 All component modifications complete!');
