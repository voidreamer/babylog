#!/usr/bin/env node
/**
 * i18n patching script - replaces remaining hardcoded strings with t() calls
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'frontend', 'src');

function readFile(rel) {
  return fs.readFileSync(path.join(BASE, rel), 'utf8');
}

function writeFile(rel, content) {
  fs.writeFileSync(path.join(BASE, rel), content, 'utf8');
}

function replace(file, pairs) {
  let content = readFile(file);
  for (const [old, neu] of pairs) {
    if (!content.includes(old)) {
      console.warn(`  WARN: "${old.substring(0, 60)}..." not found in ${file}`);
      continue;
    }
    content = content.replace(old, neu);
  }
  writeFile(file, content);
  console.log(`  ✓ ${file} (${pairs.length} replacements)`);
}

console.log('Patching i18n strings...\n');

// === AddBabyForm.tsx ===
replace('components/AddBabyForm.tsx', [
  [`<label className="form-label">Baby's Name *</label>`, `<label className="form-label">{t('auth:addBaby.name')} *</label>`],
  [`<label className="form-label">Birth Date *</label>`, `<label className="form-label">{t('auth:addBaby.birthDate')} *</label>`],
  [`<label className="form-label">Gender</label>`, `<label className="form-label">{t('auth:addBaby.gender')}</label>`],
  [`>\n                        Boy\n`, `>\n                        {t('auth:addBaby.genderBoy')}\n`],
  [`>\n                        Girl\n`, `>\n                        {t('auth:addBaby.genderGirl')}\n`],
  [`<p className="form-hint">Optional - helps with accurate growth charts</p>`, `<p className="form-hint">{t('addBabyForm.genderHint')}</p>`],
  [`<span>Birth Measurements (optional)</span>`, `<span>{t('addBabyForm.birthMeasurements')}</span>`],
  [`<Scale size={14} /> Weight (kg)`, `<Scale size={14} /> {t('addBabyForm.weightKg')}`],
  [`<Ruler size={14} /> Height (cm)`, `<Ruler size={14} /> {t('addBabyForm.heightCm')}`],
  [`>\n                        Cancel\n                    </button>`, `>\n                        {t('cancel')}\n                    </button>`],
  [`{saving ? 'Saving...' : submitLabel}`, `{saving ? t('saving') : submitLabel}`],
]);

// === BabyGreeting.tsx ===
replace('components/BabyGreeting.tsx', [
  [`if (hour < 12) return { text: 'Good morning', icon: '☀️' };`, `if (hour < 12) return { text: 'goodMorning', icon: '☀️' };`],
  [`if (hour < 17) return { text: 'Good afternoon', icon: '🌤️' };`, `if (hour < 17) return { text: 'goodAfternoon', icon: '🌤️' };`],
  [`return { text: 'Good evening', icon: '🌙' };`, `return { text: 'goodEvening', icon: '🌙' };`],
  [`if (diffDays === 0) return 'Born today!';`, `if (diffDays === 0) return null; // handled by t()`],
  [`if (diffDays === 1) return '1 day old';`, `if (diffDays === 1) return null;`],
  [`if (diffDays < 7) return \`\${diffDays} days old\`;`, `if (diffDays < 7) return null;`],
  [`if (weeks < 12) return \`\${weeks} week\${weeks > 1 ? 's' : ''} old\`;`, `if (weeks < 12) return null;`],
  [`if (months < 24) return \`\${months} month\${months > 1 ? 's' : ''} old\`;`, `if (months < 24) return null;`],
  [`if (remainingMonths === 0) return \`\${years} year\${years > 1 ? 's' : ''} old\`;`, `if (remainingMonths === 0) return null;`],
  [`return \`\${years}y \${remainingMonths}m old\`;`, `return null;`],
  [`if (!summary) return "Let's track today's activities!";`, `if (!summary) return 'letsTrack';`],
  [`if (total === 0) return "Ready to log today's first event!";`, `if (total === 0) return 'readyToLog';`],
  [`if (total <= 3) return "Great start to the day!";`, `if (total <= 3) return 'greatStart';`],
  [`if (total <= 8) return "You're doing amazing!";`, `if (total <= 8) return 'doingAmazing';`],
  [`return "Super parent! Keep it up!";`, `return 'superParent';`],
  [`<span className="greeting-text">{greeting.text}!</span>`, `<span className="greeting-text">{t(\`greeting.\${greeting.text}\`)}!</span>`],
  [`{age && <div className="baby-greeting-age">{age}</div>}`, `{selectedBaby?.birth_date && <div className="baby-greeting-age">{(() => { const birth = new Date(selectedBaby.birth_date); const now = new Date(); const diffMs = now.getTime() - birth.getTime(); const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); if (diffDays < 0) return null; if (diffDays === 0) return t('age.bornToday'); if (diffDays === 1) return t('age.daysOld', { count: 1 }); if (diffDays < 7) return t('age.daysOld_plural', { count: diffDays }); const weeks = Math.floor(diffDays / 7); if (weeks < 12) return weeks > 1 ? t('age.weeksOld_plural', { count: weeks }) : t('age.weeksOld', { count: weeks }); const months = Math.floor(diffDays / 30.44); if (months < 24) return months > 1 ? t('age.monthsOld_plural', { count: months }) : t('age.monthsOld', { count: months }); const years = Math.floor(months / 12); const rm = months % 12; if (rm === 0) return years > 1 ? t('age.yearsOld_plural', { count: years }) : t('age.yearsOld', { count: years }); return t('age.yearsMonthsOld', { years, months: rm }); })()}</div>}`],
  [`<span>{encouragement}</span>`, `<span>{t(\`encouragement.\${encouragement}\`)}</span>`],
  [`<span className="baby-stat-unit">cm head</span>`, '<span className="baby-stat-unit">{t(\'health:growth.head\').toLowerCase()}</span>'],
  [`<span className="greeting-text">Welcome!</span>`, `<span className="greeting-text">{t('greeting.welcome')}</span>`],
  [`Add your first baby to get started`, `{t('greeting.addFirstBaby')}`],
  [`<Plus size={18} />\n                    Add Baby`, `<Plus size={18} />\n                    {t('greeting.addBaby')}`],
  [`<h2 className="modal-title">Add Baby</h2>\n                                <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>\n                            </div>\n                            <div className="modal-body">\n                                <AddBabyForm\n                                    onSubmit={handleAddBaby}\n                                    onCancel={() => setShowAddForm(false)}\n                                    saving={saving}\n                                />\n                            </div>`, `<h2 className="modal-title">{t('greeting.addBaby')}</h2>\n                                <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>\n                            </div>\n                            <div className="modal-body">\n                                <AddBabyForm\n                                    onSubmit={handleAddBaby}\n                                    onCancel={() => setShowAddForm(false)}\n                                    saving={saving}\n                                />\n                            </div>`],
  [`<span className="baby-dropdown-shared">Shared</span>`, `<span className="baby-dropdown-shared">{t('greeting.shared')}</span>`],
  [`<span>Share {selectedBaby.name}</span>`, `<span>{t('greeting.shareName', { name: selectedBaby.name })}</span>`],
  [`<span>Edit {selectedBaby.name}</span>`, `<span>{t('greeting.editName', { name: selectedBaby.name })}</span>`],
  [`<span>Add Baby</span>`, `<span>{t('greeting.addBaby')}</span>`],
  [`<span>Delete {selectedBaby.name}</span>`, `<span>{t('greeting.deleteName', { name: selectedBaby.name })}</span>`],
  [`if (confirm(\`Delete \${selectedBaby.name}? This removes all data and cannot be undone.\`))`, `if (confirm(t('greeting.deleteConfirm', { name: selectedBaby.name })))`],
  [`toast.success(\`\${formData.name} added!\`);`, `toast.success(t('greeting.babyAdded', { name: formData.name }));`],
  [`toast.success(\`\${formData.name} updated!\`);`, `toast.success(t('greeting.babyUpdated', { name: formData.name }));`],
  [`<h2 className="modal-title">Add Baby</h2>\n                            <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>`, `<h2 className="modal-title">{t('greeting.addBaby')}</h2>\n                            <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>`],
  [`<h2 className="modal-title">Edit {selectedBaby.name}</h2>`, `<h2 className="modal-title">{t('greeting.editBaby', { name: selectedBaby.name })}</h2>`],
]);

// === BabyInsights.tsx ===
replace('components/BabyInsights.tsx', [
  [`<p>Select a baby to see insights</p>`, `<p>{t('insights.selectBaby')}</p>`],
  [`<p>Analyzing patterns...</p>`, `<p>{t('insights.analyzingPatterns')}</p>`],
  [`setError('Unable to load insights');`, `setError(t('insights.unableToLoad'));`],
  [`<h3>Collecting Data</h3>`, `<h3>{t('insights.collectingData')}</h3>`],
  [`Keep tracking for a few more days! We need at least 3-5 days of data\n                    to identify patterns and make predictions.`, `{t('insights.collectingDataDesc')}`],
  [`<span>Data points: {analytics?.data_points?.feedings || 0} feedings, {analytics?.data_points?.sleeps || 0} sleeps</span>`, `<span>{t('insights.dataPoints', { feedings: analytics?.data_points?.feedings || 0, sleeps: analytics?.data_points?.sleeps || 0 })}</span>`],
]);

// === BathModal.tsx ===
replace('components/BathModal.tsx', [
  [`<h2 className="modal-title"><ShowerHead size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Bath</h2>`, `<h2 className="modal-title"><ShowerHead size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('bath.title')}</h2>`],
  [`<label className="form-label">Time</label>`, `<label className="form-label">{t('modal.time')}</label>`],
  [`<label className="form-label">Notes (optional)</label>`, `<label className="form-label">{t('modal.notesOptional')}</label>`],
  [`>\n                            Cancel\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? 'Saving...' : 'Save'}`, `>\n                            {t('common:cancel')}\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? t('common:saving') : t('common:save')}`],
]);

// === BathWidget.tsx ===
replace('components/BathWidget.tsx', [
  [`<span className="widget-label">Bath</span>`, `<span className="widget-label">{t('bath.title')}</span>`],
  [`<div className="widget-time-ago">No baths yet</div>`, `<div className="widget-time-ago">{t('bath.noBathsYet')}</div>`],
  [`{saving ? 'Logging...' : 'Log Bath'}`, `{saving ? t('bath.logging') : t('bath.logBath')}`],
]);

// === ComingUp.tsx ===
replace('components/ComingUp.tsx', [
  [`<h3>Coming Up</h3>`, `<h3>{t('comingUp')}</h3>`],
  [`: item.frequency || item.dosage || 'Ongoing'}`, `: item.frequency || item.dosage || t('comingUpSection.ongoing')}`],
  [`{item.type === 'medication' ? 'Active' :\n                                    item.type === 'vaccination' ? 'Vaccine' : 'Visit'}`, `{item.type === 'medication' ? t('comingUpSection.active') :\n                                    item.type === 'vaccination' ? t('comingUpSection.vaccine') : t('comingUpSection.visit')}`],
]);

// === DailySummary.tsx ===
replace('components/DailySummary.tsx', [
  [`<span>Daily Summary</span>`, `<span>{t('dailySummarySection.title')}</span>`],
  [`>\n                        Today\n                    </button>`, `>\n                        {t('dailySummarySection.today')}\n                    </button>`],
  [`>\n                        Yesterday\n                    </button>`, `>\n                        {t('dailySummarySection.yesterday')}\n                    </button>`],
  [`<div className="daily-summary-loading">Loading...</div>`, `<div className="daily-summary-loading">{t('common:loading')}</div>`],
  [`<div className="daily-summary-empty">\n                        No data for {activeTab === 'today' ? 'today' : 'yesterday'}\n                    </div>`, `<div className="daily-summary-empty">\n                        {t('dailySummarySection.noData', { period: activeTab === 'today' ? t('dailySummarySection.today') : t('dailySummarySection.yesterday') })}\n                    </div>`],
  [`label: 'feedings',`, `label: t('summary.feedings'),`],
  [`label: 'diapers',`, `label: t('summary.diapers'),`],
  [`label: 'sleep',`, `label: t('summary.sleepTotal'),`],
  [`extra: \`\${data.sleep_count || 0} naps\``, `extra: t('summary.naps', { count: data.sleep_count || 0 })`],
  [`label: 'pumps',`, `label: t('summary.pumpings'),`],
  [`label: 'potty',`, `label: t('summary.pottyTrips'),`],
  [`extra: data.potty_success_count > 0 ? \`\${data.potty_success_count} success\` : null`, `extra: data.potty_success_count > 0 ? t('summary.successCount', { count: data.potty_success_count }) : null`],
  [`label: 'tummy time',`, `label: t('summary.tummyTimeSessions'),`],
  [`label: data.bath_count === 1 ? 'bath' : 'baths',`, `label: data.bath_count === 1 ? t('summary.bath') : t('summary.baths'),`],
  // diaper detail
  [`if (data.pee_count > 0) parts.push(\`\${data.pee_count} wet\`);`, `if (data.pee_count > 0) parts.push(t('dailySummarySection.wet', { count: data.pee_count }));`],
  [`if (data.poo_count > 0) parts.push(\`\${data.poo_count} dirty\`);`, `if (data.poo_count > 0) parts.push(t('dailySummarySection.dirty', { count: data.poo_count }));`],
  [`if (data.mixed_count > 0) parts.push(\`\${data.mixed_count} mixed\`);`, `if (data.mixed_count > 0) parts.push(t('dailySummarySection.mixed', { count: data.mixed_count }));`],
]);

// === Dashboard.tsx ===
replace('components/Dashboard.tsx', [
  [`<h2 className="empty-state-title">No baby added yet</h2>`, `<h2 className="empty-state-title">{t('common:noBabyAdded')}</h2>`],
  [`<p className="empty-state-text">Add your baby to start tracking</p>`, `<p className="empty-state-text">{t('common:addBabyPrompt')}</p>`],
  [`toast.error('Failed to load dashboard', {\n                description: 'Please check your connection and try again.'\n            });`, `toast.error(t('failedToLoadDashboard'), {\n                description: t('failedToLoadDashboardDesc')\n            });`],
]);

// === DiaperModal.tsx ===
replace('components/DiaperModal.tsx', [
  [`<h2 className="modal-title"><Droplets size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Diaper Change</h2>`, `<h2 className="modal-title"><Droplets size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('diaper.diaperChange')}</h2>`],
  [`<label className="form-label">Type</label>`, `<label className="form-label">{t('diaper.type')}</label>`],
  [`<Droplets size={16} /> Pee`, `<Droplets size={16} /> {t('diaper.pee')}`],
  [`<CircleDot size={16} /> Poo`, `<CircleDot size={16} /> {t('diaper.poo')}`],
  [`<RefreshCw size={16} /> Both`, `<RefreshCw size={16} /> {t('diaper.both')}`],
  [`<label className="form-label">Color</label>`, `<label className="form-label">{t('diaper.color')}</label>`],
  [`<label className="form-label">Consistency</label>`, `<label className="form-label">{t('diaper.consistency')}</label>`],
  [`<label className="form-label">Amount</label>`, `<label className="form-label">{t('diaper.amount')}</label>`],
  [`<label className="form-label">Time</label>\n                            <TimePicker`, `<label className="form-label">{t('modal.time')}</label>\n                            <TimePicker`],
  [`<label className="form-label">Notes</label>\n                            <input`, `<label className="form-label">{t('modal.notes')}</label>\n                            <input`],
  [`>\n                            Cancel\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? 'Saving...' : 'Save Diaper Change'}`, `>\n                            {t('common:cancel')}\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? t('common:saving') : t('diaper.saveDiaperChange')}`],
]);

// === DiaperWidget.tsx ===
replace('components/DiaperWidget.tsx', [
  [`<span className="widget-label">Diaper</span>`, `<span className="widget-label">{t('diaper.title')}</span>`],
  [`<div className="widget-time-ago">No diapers yet</div>`, `<div className="widget-time-ago">{t('diaper.noDiapersYet')}</div>`],
  [`toast.success(\`\${type.charAt(0).toUpperCase() + type.slice(1)} diaper logged\`);`, `toast.success(t('diaper.diaperLogged', { type: type.charAt(0).toUpperCase() + type.slice(1) }));`],
  [`{saving === 'pee' ? '...' : 'Pee'}`, `{saving === 'pee' ? '...' : t('diaper.pee')}`],
  [`{saving === 'poo' ? '...' : 'Poo'}`, `{saving === 'poo' ? '...' : t('diaper.poo')}`],
  [`{saving === 'mixed' ? '...' : 'Both'}`, `{saving === 'mixed' ? '...' : t('diaper.both')}`],
]);

// === FeedingModal.tsx ===
replace('components/FeedingModal.tsx', [
  [`<h2 className="modal-title"><Baby size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Feeding</h2>`, `<h2 className="modal-title"><Baby size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('feeding.title')}</h2>`],
  [`<Pencil size={16} /> Quick Log`, `<Pencil size={16} /> {t('feeding.quickLog')}`],
  [`<Timer size={16} /> Timer`, `<Timer size={16} /> {t('feeding.timer')}`],
  [`<label className="form-label">Method</label>`, `<label className="form-label">{t('feeding.method')}</label>`],
  [`<User size={16} /> Breast`, `<User size={16} /> {t('feeding.breast')}`],
  [`<Baby size={16} /> Bottle`, `<Baby size={16} /> {t('feeding.bottle')}`],
  [`<label className="form-label">Bottle Contents</label>`, `<label className="form-label">{t('feeding.bottleContents')}</label>`],
  [`>\n                                    Breast Milk\n`, `>\n                                    {t('feeding.breastMilk')}\n`],
  [`>\n                                    Formula\n`, `>\n                                    {t('feeding.formula')}\n`],
  [`>▶️ Start Feeding</button>`, `>▶️ {t('feeding.startFeeding')}</button>`],
  [`>⏹️ Stop</button>`, `>⏹️ {t('feeding.stop')}</button>`],
  [`<label className="form-label">Amount (ml)</label>`, `<label className="form-label">{t('feeding.amountMl')}</label>`],
  [`<label className="form-label">Notes</label>\n                                <input\n                                    type="text"\n                                    className="form-input"\n                                    placeholder={t('placeholder_optionalNotes')}\n                                    value={notes}\n                                    onChange={(e) => setNotes(e.target.value)}\n                                    maxLength={500}\n                                />`, `<label className="form-label">{t('modal.notes')}</label>\n                                <input\n                                    type="text"\n                                    className="form-input"\n                                    placeholder={t('placeholder_optionalNotes')}\n                                    value={notes}\n                                    onChange={(e) => setNotes(e.target.value)}\n                                    maxLength={500}\n                                />`],
  [`<label className="form-label">Time</label>`, `<label className="form-label">{t('modal.time')}</label>`],
  [`<label className="form-label">Duration (min)</label>`, `<label className="form-label">{t('feeding.durationMin')}</label>`],
  [`<label className="form-label">Notes</label>\n                                <input\n                                    type="text"\n                                    className="form-input"\n                                    placeholder={t('placeholder_optionalNotes')}\n                                    value={notes}\n                                    onChange={(e) => setNotes(e.target.value)}\n                                    maxLength={500}`, `<label className="form-label">{t('modal.notes')}</label>\n                                <input\n                                    type="text"\n                                    className="form-input"\n                                    placeholder={t('placeholder_optionalNotes')}\n                                    value={notes}\n                                    onChange={(e) => setNotes(e.target.value)}\n                                    maxLength={500}`],
  [`>\n                        Cancel\n                    </button>`, `>\n                        {t('common:cancel')}\n                    </button>`],
  [`{saving ? 'Saving...' : 'Save Feeding'}`, `{saving ? t('common:saving') : t('feeding.saveFeeding')}`],
]);

// === FeedingWidget.tsx ===
replace('components/FeedingWidget.tsx', [
  [`<span className="widget-label">{isFeeding ? 'Feeding' : 'Feeding'}</span>`, `<span className="widget-label">{t('feeding.title')}</span>`],
  [`{saving ? 'Saving...' : 'Done'}`, `{saving ? t('common:saving') : t('common:done')}`],
  [`<div className="widget-time-ago">No feedings yet</div>`, `<div className="widget-time-ago">{t('feeding.noFeedingsYet')}</div>`],
  [`toast.success(\`Feeding logged (\${durationMinutes} min)\`);`, `toast.success(t('feeding.feedingLogged', { duration: durationMinutes }));`],
]);

// === SleepWidget.tsx ===
replace('components/SleepWidget.tsx', [
  [`<span className="widget-label">{isSleeping ? 'Sleeping' : 'Sleep'}</span>`, `<span className="widget-label">{isSleeping ? t('sleep.sleeping') : t('sleep.title')}</span>`],
  [`{saving ? 'Waking...' : 'Wake Up'}`, `{saving ? t('sleep.waking') : t('sleep.wakeUp')}`],
  [`{saving ? 'Starting...' : 'Start Sleep'}`, `{saving ? t('sleep.starting') : t('sleep.startSleep')}`],
]);

// === SleepModal.tsx ===
replace('components/SleepModal.tsx', [
  [`<h2 className="modal-title"><Moon size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Sleep</h2>`, `<h2 className="modal-title"><Moon size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('sleep.title')}</h2>`],
  [`<label className="form-label">Start Time</label>`, `<label className="form-label">{t('sleep.startTime')}</label>`],
  [`<label className="form-label">End Time</label>`, `<label className="form-label">{t('sleep.endTime')}</label>`],
  [`<label className="form-label">Notes</label>`, `<label className="form-label">{t('modal.notes')}</label>`],
  [`>\n                            Cancel\n                        </button>`, `>\n                            {t('common:cancel')}\n                        </button>`],
  [`{saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Log Sleep')}`, `{saving ? t('common:saving') : (isEditing ? t('sleep.saveChanges') : t('sleep.logSleep'))}`],
]);

// === PumpingModal.tsx ===
replace('components/PumpingModal.tsx', [
  [`<h2 className="modal-title"><Milk size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Pumping</h2>`, `<h2 className="modal-title"><Milk size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('pumping.title')}</h2>`],
  [`<Pencil size={16} /> Quick Log`, `<Pencil size={16} /> {t('feeding.quickLog')}`],
  [`<Timer size={16} /> Timer`, `<Timer size={16} /> {t('feeding.timer')}`],
  [`>▶️ Start Pumping</button>`, `>▶️ {t('pumping.startPumping')}</button>`],
  [`>⏹️ Stop</button>`, `>⏹️ {t('feeding.stop')}</button>`],
  [`<label className="form-label">Amount (ml)</label>`, `<label className="form-label">{t('feeding.amountMl')}</label>`],
  [`<label className="form-label">Notes</label>`, `<label className="form-label">{t('modal.notes')}</label>`],
  [`<label className="form-label">Time</label>`, `<label className="form-label">{t('modal.time')}</label>`],
  [`<label className="form-label">Duration (min)</label>`, `<label className="form-label">{t('feeding.durationMin')}</label>`],
  [`{saving ? 'Saving...' : 'Save Pumping'}`, `{saving ? t('common:saving') : t('pumping.savePumping')}`],
]);

// Cancel buttons in PumpingModal
replace('components/PumpingModal.tsx', [
  [`>\n                                        Cancel\n                                    </button>`, `>\n                                        {t('common:cancel')}\n                                    </button>`],
  [`>\n                                    Cancel\n                                </button>`, `>\n                                    {t('common:cancel')}\n                                </button>`],
]);

// === PumpingWidget.tsx ===
replace('components/PumpingWidget.tsx', [
  [`<span className="widget-label">Pumping</span>`, `<span className="widget-label">{t('pumping.title')}</span>`],
  [`{saving ? 'Saving...' : 'Done'}`, `{saving ? t('common:saving') : t('common:done')}`],
  [`>Start</button>`, `>{t('pumping.start')}</button>`],
  [`<div className="widget-time-ago">No pumpings yet</div>`, `<div className="widget-time-ago">{t('pumping.noPumpingsYet')}</div>`],
  [`toast.success(\`Pumping logged (\${durationMinutes} min)\`);`, `toast.success(t('pumping.pumpingLogged', { duration: durationMinutes }));`],
]);

// === PottyModal.tsx ===
replace('components/PottyModal.tsx', [
  [`<h2 className="modal-title"><CircleDot size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Potty</h2>`, `<h2 className="modal-title"><CircleDot size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('potty.title')}</h2>`],
  [`<label className="form-label">Result</label>`, `<label className="form-label">{t('potty.result')}</label>`],
  [`<label className="form-label">Type (optional)</label>`, `<label className="form-label">{t('potty.typeOptional')}</label>`],
  [`<label className="form-label">Time</label>`, `<label className="form-label">{t('modal.time')}</label>`],
  [`<label className="form-label">Notes (optional)</label>`, `<label className="form-label">{t('modal.notesOptional')}</label>`],
  [`>\n                            Cancel\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? 'Saving...' : 'Save'}`, `>\n                            {t('common:cancel')}\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? t('common:saving') : t('common:save')}`],
]);

// === PottyWidget.tsx ===
replace('components/PottyWidget.tsx', [
  [`<span className="widget-label">Potty</span>`, `<span className="widget-label">{t('potty.title')}</span>`],
  [`<div className="widget-time-ago">No potty logs yet</div>`, `<div className="widget-time-ago">{t('potty.noPottyYet')}</div>`],
  [`toast.success(\`Potty \${result} logged\`);`, `toast.success(t('potty.pottyLogged', { result }));`],
  [`{saving === 'success' ? '...' : 'Yes'}`, `{saving === 'success' ? '...' : t('potty.yes')}`],
  [`{saving === 'attempt' ? '...' : 'Try'}`, `{saving === 'attempt' ? '...' : t('potty.try')}`],
]);

// === TummyTimeModal.tsx ===
replace('components/TummyTimeModal.tsx', [
  [`<h2 className="modal-title"><Sun size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Tummy Time</h2>`, `<h2 className="modal-title"><Sun size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('tummyTime.title')}</h2>`],
  [`<label className="form-label">Duration</label>`, `<label className="form-label">{t('tummyTime.duration')}</label>`],
  [`<label className="form-label">Time</label>`, `<label className="form-label">{t('modal.time')}</label>`],
  [`<label className="form-label">Notes (optional)</label>`, `<label className="form-label">{t('modal.notesOptional')}</label>`],
  [`>\n                            Cancel\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? 'Saving...' : 'Save'}`, `>\n                            {t('common:cancel')}\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? t('common:saving') : t('common:save')}`],
]);

// === TummyTimeWidget.tsx ===
replace('components/TummyTimeWidget.tsx', [
  [`<span className="widget-label">Tummy</span>`, `<span className="widget-label">{t('tummyTime.tummy')}</span>`],
  [`{saving ? 'Saving...' : 'Done'}`, `{saving ? t('common:saving') : t('common:done')}`],
  [`>Start</button>`, `>{t('tummyTime.start')}</button>`],
  [`<div className="widget-time-ago">No tummy time yet</div>`, `<div className="widget-time-ago">{t('tummyTime.noTummyTimeYet')}</div>`],
  [`toast.success(\`Tummy time logged (\${durationMinutes} min)\`);`, `toast.success(t('tummyTime.tummyTimeLogged', { duration: durationMinutes }));`],
]);

// === SupplementModal.tsx ===
replace('components/SupplementModal.tsx', [
  [`<h2 className="modal-title"><Pill size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Supplement</h2>`, `<h2 className="modal-title"><Pill size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('supplement.title')}</h2>`],
  [`<label className="form-label">Supplement</label>`, `<label className="form-label">{t('supplement.title')}</label>`],
  [`<label className="form-label">Dosage (optional)</label>`, `<label className="form-label">{t('supplement.dosageOptional')}</label>`],
  [`<label className="form-label">Time</label>`, `<label className="form-label">{t('modal.time')}</label>`],
  [`<label className="form-label">Notes (optional)</label>`, `<label className="form-label">{t('modal.notesOptional')}</label>`],
  [`>\n                            Cancel\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? 'Saving...' : 'Save'}`, `>\n                            {t('common:cancel')}\n                        </button>\n                        <button type="submit" className="btn btn-primary" disabled={saving}>\n                            {saving ? t('common:saving') : t('common:save')}`],
]);

// === SupplementWidget.tsx ===
replace('components/SupplementWidget.tsx', [
  [`<span className="widget-label">Supplement</span>`, `<span className="widget-label">{t('supplement.title')}</span>`],
  [`<div className="widget-time-ago">No supplements yet</div>`, `<div className="widget-time-ago">{t('supplement.noSupplementsYet')}</div>`],
]);

// === QuickActions.tsx ===
replace('components/QuickActions.tsx', [
  [`<span>Feeding</span>`, `<span>{t('quickActionsSection.feeding')}</span>`],
  [`<span>Diaper</span>`, `<span>{t('quickActionsSection.diaper')}</span>`],
  [`<span>Sleep</span>`, `<span>{t('quickActionsSection.sleep')}</span>`],
  [`<span>Pump</span>`, `<span>{t('quickActionsSection.pump')}</span>`],
]);

// === Widget.tsx ===
replace('components/Widget.tsx', [
  [`<span className="widget-empty-text">Tap to log</span>`, `<span className="widget-empty-text">{t('tapToLog')}</span>`],
]);

// === TimePicker.tsx (Now button) ===
replace('components/TimePicker.tsx', [
  [`>\n                Now\n            </button>`, `>\n                Now\n            </button>`], // Keep as-is for now, it's a short word
]);

// === WidgetSettings.tsx ===
replace('components/WidgetSettings.tsx', [
  [`<span className="widget-settings-btn-title">Edit Activities</span>`, `<span className="widget-settings-btn-title">{t('widgetSettingsSection.editActivities')}</span>`],
  [`{disabledCount > 0 ? \`\${disabledCount} hidden\` : 'All visible'}`, `{disabledCount > 0 ? t('widgetSettingsSection.hidden', { count: disabledCount }) : t('widgetSettingsSection.allVisible')}`],
  [`<h3>Dashboard Activities</h3>`, `<h3>{t('widgetSettingsSection.dashboardActivities')}</h3>`],
  [`Tap to show or hide activities on your dashboard`, `{t('widgetSettingsSection.tapToShowHide')}`],
  [`<span className="widget-settings-toggle-label">Quick Actions</span>`, `<span className="widget-settings-toggle-label">{t('widgetSettingsSection.quickActions')}</span>`],
  [`One-tap buttons on widgets`, `{t('widgetSettingsSection.oneTapButtons')}`],
]);

// === ShareModal.tsx ===
replace('components/ShareModal.tsx', [
  [`<h2>Share {baby.name}</h2>`, `<h2>{t('share.shareTitle', { name: baby.name })}</h2>`],
  [`<label>Add by email</label>`, `<label>{t('share.addByEmail')}</label>`],
  [`{loading ? '...' : 'Share'}`, `{loading ? '...' : t('share.share')}`],
  [`<label>Shared with</label>`, `<label>{t('share.sharedWith')}</label>`],
  [`>\n                                        Remove\n                                    </button>`, `>\n                                        {t('share.remove')}\n                                    </button>`],
  [`Enter an email to share access to {baby.name} with another person.`, `{t('share.shareHint', { name: baby.name })}`],
  [`>\n                        Done\n                    </button>`, `>\n                        {t('share.done')}\n                    </button>`],
]);

// === BabySelector.tsx ===
replace('components/BabySelector.tsx', [
  [`>+ Add Baby</button>`, `>{t('babySelector.addBaby')}</button>`],
  [`<h2 className="modal-title">Add Your Baby</h2>`, `<h2 className="modal-title">{t('babySelector.addYourBaby')}</h2>`],
  [`<span className="baby-name">{selectedBaby?.name || 'Select Baby'}</span>`, `<span className="baby-name">{selectedBaby?.name || t('babySelector.selectBaby')}</span>`],
  [`>Shared</span>`, `>{t('babySelector.shared')}</span>`],
  [`Share {selectedBaby?.name}`, `{t('babySelector.shareName', { name: selectedBaby?.name })}`],
  [`if (confirm(\`Are you sure you want to delete \${selectedBaby.name}? This will remove all feeding, diaper, sleep, and health records. This cannot be undone.\`))`, `if (confirm(t('babySelector.deleteConfirm', { name: selectedBaby.name })))`],
  [`Delete {selectedBaby?.name}`, `{t('babySelector.deleteName', { name: selectedBaby?.name })}`],
  [`>+ Add Another Baby</div>`, `>{t('babySelector.addAnotherBaby')}</div>`],
  [`<h2 className="modal-title">Add Baby</h2>`, `<h2 className="modal-title">{t('greeting.addBaby')}</h2>`],
  [`toast.success(\`\${formData.name} added!\`);`, `toast.success(t('greeting.babyAdded', { name: formData.name }));`],
]);

// === Learn.tsx ===
replace('components/Learn.tsx', [
  [`<TrendingUp size={24} /> Insights`, `<TrendingUp size={24} /> {t('dashboard:learn.insights')}`],
  [`<Sparkles size={14} /> For {selectedBaby.name}, {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'} old`, `<Sparkles size={14} /> {t('dashboard:learn.forBaby', { name: selectedBaby.name, months: babyAgeMonths, monthLabel: babyAgeMonths === 1 ? t('dashboard:learn.month') : t('dashboard:learn.months') })}`],
]);

// === Onboarding.tsx ===
replace('components/Onboarding.tsx', [
  [`<h1 className="onboarding-title">Welcome to HeyBub!</h1>`, `<h1 className="onboarding-title">{t('auth:onboarding.welcome')}</h1>`],
  [`Let's set up your baby's profile so you can start tracking.`, `{t('auth:onboarding.welcomeSubtitle')}`],
  [`Get Started <ArrowRight size={18} />`, `{t('auth:onboarding.getStarted')} <ArrowRight size={18} />`],
  [`<LogOut size={14} /> Sign out`, `<LogOut size={14} /> {t('auth:onboarding.signOut')}`],
  [`<h2 className="onboarding-title">Choose Your Style</h2>`, `<h2 className="onboarding-title">{t('auth:onboarding.chooseStyle')}</h2>`],
  [`Pick the look that feels right for you.`, `{t('auth:onboarding.chooseStyleSubtitle')}`],
  [`<span className="theme-name">Light</span>\n                            <span className="theme-desc">Warm and bright</span>`, `<span className="theme-name">{t('auth:onboarding.lightTheme')}</span>\n                            <span className="theme-desc">{t('auth:onboarding.lightThemeDesc')}</span>`],
  [`<span className="theme-name">Dark</span>\n                            <span className="theme-desc">Easy on the eyes</span>`, `<span className="theme-name">{t('auth:onboarding.darkTheme')}</span>\n                            <span className="theme-desc">{t('auth:onboarding.darkThemeDesc')}</span>`],
  [`Continue <ArrowRight size={18} />`, `{t('auth:onboarding.continue')} <ArrowRight size={18} />`],
  [`<h2 className="onboarding-form-title">Add Your Baby</h2>`, `<h2 className="onboarding-form-title">{t('auth:onboarding.addYourBaby')}</h2>`],
  [`<h1 className="onboarding-title">All Set!</h1>`, `<h1 className="onboarding-title">{t('auth:onboarding.allSet')}</h1>`],
  [`{babyName}'s profile is ready. Start tracking now!`, `{t('auth:onboarding.profileReady', { name: babyName })}`],
  [`Go to Dashboard <ArrowRight size={18} />`, `{t('auth:onboarding.goToDashboard')} <ArrowRight size={18} />`],
]);

// === ErrorBoundary.tsx ===
replace('components/ErrorBoundary.tsx', [
  [`<h2 className="error-fallback-title">Something went wrong</h2>`, `<h2 className="error-fallback-title">Something went wrong</h2>`], // Class component, skip i18n for now
]);

// === OfflineIndicator.tsx ===
replace('components/OfflineIndicator.tsx', [
  [`<span>You're offline</span>`, `<span>{t('offlineIndicator.youreOffline')}</span>`],
  [`• {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending`, `• {t('offlineIndicator.changesPending', { count: pendingCount, s: pendingCount !== 1 ? 's' : '' })}`],
  [`<span>Syncing changes...</span>`, `<span>{t('offlineIndicator.syncingChanges')}</span>`],
  [`<span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} to sync</span>`, `<span>{t('offlineIndicator.changesToSync', { count: pendingCount, s: pendingCount !== 1 ? 's' : '' })}</span>`],
  [`>Sync now</button>`, `>{t('offlineIndicator.syncNow')}</button>`],
]);

// === TimelineCalendar.tsx ===
replace('components/TimelineCalendar.tsx', [
  [`<h2 className="empty-state-title">No baby selected</h2>`, `<h2 className="empty-state-title">{t('common:noBabySelected')}</h2>`],
  [`<p>No events recorded</p>`, `<p>{t('timeline.noEventsRecorded')}</p>`],
  [`<span>Add activities from the dashboard to see them here</span>`, `<span>{t('timeline.addFromDashboard')}</span>`],
  [`<Pencil size={14} /> Edit`, `<Pencil size={14} /> {t('timeline.edit')}`],
  [`<Trash2 size={14} /> Delete`, `<Trash2 size={14} /> {t('timeline.delete')}`],
  [`<h3>Delete {EVENT_CONFIG[confirmDelete.event_type]?.label || 'Event'}?</h3>`, `<h3>{t('timeline.deleteConfirmTitle', { type: EVENT_CONFIG[confirmDelete.event_type]?.label || 'Event' })}</h3>`],
  [`<p>This action cannot be undone.</p>`, `<p>{t('timeline.deleteConfirmMessage')}</p>`],
  [`>\n                                    Cancel\n                                </button>`, `>\n                                    {t('common:cancel')}\n                                </button>`],
  [`>\n                                    Delete\n                                </button>`, `>\n                                    {t('common:delete')}\n                                </button>`],
  [`return details.end_time ? '' : 'Sleeping...';`, `return details.end_time ? '' : t('timeline.sleeping');`],
]);

// === Timeline.tsx ===
replace('components/Timeline.tsx', [
  [`<p className="empty-state-text">No events logged today</p>`, `<p className="empty-state-text">{t('timeline.noEventsToday')}</p>`],
]);

// === InsightsSections.tsx ===
replace('components/insights/InsightsSections.tsx', [
  [`<span>Predictions</span>`, `<span>{t('insights.predictions')}</span>`],
  [`<span className="insight-card-label">Next Feeding</span>`, `<span className="insight-card-label">{t('insights.nextFeeding')}</span>`],
  [`<span className="insight-card-alert">May be hungry!</span>`, `<span className="insight-card-alert">{t('insights.mayBeHungry')}</span>`],
  [`<span className="insight-card-label">Next Nap</span>`, `<span className="insight-card-label">{t('insights.nextNap')}</span>`],
  [`<span className="insight-card-label">Sleep Pressure</span>`, `<span className="insight-card-label">{t('insights.sleepPressure')}</span>`],
  [`<span>Upgrade to see predictions</span>`, `<span>{t('insights.upgradeToSeePredictions')}</span>`],
  [`<span>Patterns</span>`, `<span>{t('insights.patterns')}</span>`],
  [`<span className="pattern-label">Wakes up</span>`, `<span className="pattern-label">{t('insights.wakesUp')}</span>`],
  [`<span className="pattern-value">Every {patterns.wake_interval_hours} hours</span>`, `<span className="pattern-value">{t('insights.everyHours', { hours: patterns.wake_interval_hours })}</span>`],
  [`<span className="pattern-label">Usually wakes up</span>`, `<span className="pattern-label">{t('insights.usuallyWakesUp')}</span>`],
  [`<span className="pattern-label">Usual bedtime</span>`, `<span className="pattern-label">{t('insights.usualBedtime')}</span>`],
  [`<span className="pattern-label">Feeds every</span>`, `<span className="pattern-label">{t('insights.feedsEvery')}</span>`],
  [`<span className="pattern-value">{patterns.avg_feeding_interval_hours} hours</span>`, `<span className="pattern-value">{t('insights.hours', { hours: patterns.avg_feeding_interval_hours })}</span>`],
  [`<span className="pattern-label">Avg nap length</span>`, `<span className="pattern-label">{t('insights.avgNapLength')}</span>`],
  [`<span className="pattern-value">{patterns.avg_nap_duration_minutes} min</span>`, `<span className="pattern-value">{t('insights.minutes', { minutes: patterns.avg_nap_duration_minutes })}</span>`],
  [`<span>Upgrade to see patterns</span>`, `<span>{t('insights.upgradeToseePatterns')}</span>`],
  [`<span>14-Day Trends</span>`, `<span>{t('insights.fourteenDayTrends')}</span>`],
  [`<span className="trend-label">Sleep</span>`, `<span className="trend-label">{t('insights.sleep')}</span>`],
  [`<span className="trend-label">Feeding</span>`, `<span className="trend-label">{t('insights.feeding')}</span>`],
  [`<span>Upgrade to see trends</span>`, `<span>{t('insights.upgradeToSeeTrends')}</span>`],
  [`<span>Age Guidelines</span>`, `<span>{t('insights.ageGuidelines')}</span>`],
  [`<span className="age-badge">{benchmarks?.age_weeks} weeks</span>`, `<span className="age-badge">{t('insights.weeks', { count: benchmarks?.age_weeks })}</span>`],
  [`<span>Diapers Today</span>`, `<span>{t('insights.diapersToday')}</span>`],
  [`<span className="benchmark-label">wet</span>`, `<span className="benchmark-label">{t('insights.wet')}</span>`],
  [`<span className="benchmark-label">expected</span>`, `<span className="benchmark-label">{t('insights.expected')}</span>`],
  [`<span>Sleep Today</span>`, `<span>{t('insights.sleepToday')}</span>`],
  [`<span className="benchmark-label">hours</span>`, `<span className="benchmark-label">{t('insights.hours_label')}</span>`],
  [`<span>Feedings Today</span>`, `<span>{t('insights.feedingsToday')}</span>`],
  [`<span className="benchmark-label">feeds</span>`, `<span className="benchmark-label">{t('insights.feeds')}</span>`],
  [`<span>Today vs. Your Average</span>`, `<span>{t('insights.todayVsAverage')}</span>`],
  [`<span className="comparison-label">Feedings</span>`, `<span className="comparison-label">{t('insights.feedings')}</span>`],
  [`<span className="comparison-label">Diapers</span>`, `<span className="comparison-label">{t('insights.diapers')}</span>`],
  [`<span className="comparison-label">Sleep</span>`, `<span className="comparison-label">{t('insights.sleep')}</span>`],
  [`<span className="comparison-vs">vs</span>`, `<span className="comparison-vs">{t('insights.vs')}</span>`],
]);

// === UpgradeDialog.tsx ===
replace('components/UpgradeDialog.tsx', [
  [`<h2 style={{ margin: 0 }}>HeyBub Premium</h2>`, `<h2 style={{ margin: 0 }}>{t('upgrade.heyBubPremium')}</h2>`],
  [`{loading ? 'Redirecting…' : 'Start 7-Day Free Trial'}`, `{loading ? t('upgrade.redirecting') : t('upgrade.startTrial')}`],
  [`>Restore Purchase</button>`, `>{t('upgrade.restorePurchase')}</button>`],
]);

// === PremiumGate.tsx ===
replace('components/PremiumGate.tsx', [
  [`<p style={{ fontWeight: 600, margin: 0 }}>Premium Feature</p>`, `<p style={{ fontWeight: 600, margin: 0 }}>{t('upgrade.premiumFeature')}</p>`],
  [`Upgrade to unlock {feature}`, `{t('upgrade.upgradeToUnlock', { feature })}`],
  [`>Upgrade</span>`, `>{t('upgrade.upgradeBtn')}</span>`],
]);

// === PrivacyPolicy.tsx ===
replace('pages/PrivacyPolicy.tsx', [
  [`const { t } = useTranslation('common');`, `const { t } = useTranslation('auth');`],
  [`<span>Back</span>`, `<span>{t('common:back')}</span>`],
  [`<h1 className="legal-title">Privacy Policy</h1>`, `<h1 className="legal-title">{t('privacy.title')}</h1>`],
  [`<p className="legal-updated">Last updated: January 2026</p>`, `<p className="legal-updated">{t('privacy.lastUpdated')}</p>`],
  [`<h2>1. Information We Collect</h2>`, `<h2>{t('privacy.section1Title')}</h2>`],
  [`HeyBub collects information you provide directly when using our baby tracking app:`, `{t('privacy.section1Intro')}`],
  [`<strong>Account Information:</strong> Email address and name via Google Sign-In`, `<strong>{t('privacy.section1Item1')}</strong> {t('privacy.section1Item1Desc')}`],
  [`<strong>Baby Information:</strong> Baby names, birth dates, and gender`, `<strong>{t('privacy.section1Item2')}</strong> {t('privacy.section1Item2Desc')}`],
  [`<strong>Activity Data:</strong> Feeding, diaper, sleep, and other tracking data you log`, `<strong>{t('privacy.section1Item3')}</strong> {t('privacy.section1Item3Desc')}`],
  [`<strong>Health Records:</strong> Doctor visits, vaccinations, medications, and growth data`, `<strong>{t('privacy.section1Item4')}</strong> {t('privacy.section1Item4Desc')}`],
  [`<h2>2. How We Use Your Information</h2>`, `<h2>{t('privacy.section2Title')}</h2>`],
  [`<p>We use your data solely to:</p>`, `<p>{t('privacy.section2Intro')}</p>`],
  [`<li>Provide the baby tracking service</li>`, `<li>{t('privacy.section2Item1')}</li>`],
  [`<li>Display your logged activities and summaries</li>`, `<li>{t('privacy.section2Item2')}</li>`],
  [`<li>Enable sharing with caregivers you authorize</li>`, `<li>{t('privacy.section2Item3')}</li>`],
  [`<li>Improve app functionality and fix bugs</li>`, `<li>{t('privacy.section2Item4')}</li>`],
  [`<strong>We do not sell your data to third parties.</strong>`, `<strong>{t('privacy.section2NoSell')}</strong>`],
  [`<h2>3. Data Storage & Security</h2>`, `<h2>{t('privacy.section3Title')}</h2>`],
  [`Your data is stored securely using:`, `{t('privacy.section3Intro')}`],
  [`<li>AWS cloud infrastructure with encryption at rest</li>`, `<li>{t('privacy.section3Item1')}</li>`],
  [`<li>Secure authentication via Supabase Auth and Google OAuth</li>`, `<li>{t('privacy.section3Item2')}</li>`],
  [`<li>HTTPS encryption for all data transmission</li>`, `<li>{t('privacy.section3Item3')}</li>`],
  [`<h2>4. Data Sharing</h2>`, `<h2>{t('privacy.section4Title')}</h2>`],
  [`We only share your data when:`, `{t('privacy.section4Intro')}`],
  [`<li>You explicitly share a baby profile with another caregiver</li>`, `<li>{t('privacy.section4Item1')}</li>`],
  [`<li>Required by law or legal process</li>`, `<li>{t('privacy.section4Item2')}</li>`],
  [`<h2>5. Your Rights</h2>`, `<h2>{t('privacy.section5Title')}</h2>`],
  [`<p>You can:</p>`, `<p>{t('privacy.section5Intro')}</p>`],
  [`<li>Access all your stored data through the app</li>`, `<li>{t('privacy.section5Item1')}</li>`],
  [`<li>Delete your baby profiles and associated data</li>`, `<li>{t('privacy.section5Item2')}</li>`],
  [`<li>Revoke sharing access at any time</li>`, `<li>{t('privacy.section5Item3')}</li>`],
  [`<li>Request account deletion by contacting us</li>`, `<li>{t('privacy.section5Item4')}</li>`],
  [`<h2>6. Children's Privacy</h2>`, `<h2>{t('privacy.section6Title')}</h2>`],
  [`This app is designed for parents/caregivers to track infant care.\n                        We do not knowingly collect information from children under 13.`, `{t('privacy.section6Text')}`],
  [`<h2>7. Changes to This Policy</h2>`, `<h2>{t('privacy.section7Title')}</h2>`],
  [`We may update this policy periodically. We will notify users of\n                        significant changes through the app.`, `{t('privacy.section7Text')}`],
  [`<h2>8. Contact Us</h2>`, `<h2>{t('privacy.section8Title')}</h2>`],
  [`For privacy questions or concerns, contact us at:`, `{t('privacy.section8Text')}`],
  [`<strong>privacy@heybub.app</strong>`, `<strong>{t('privacy.section8Email')}</strong>`],
]);

// === Callback.tsx ===
replace('pages/Callback.tsx', [
  [`<h2>Authentication Error</h2>`, `<h2>{t('callback.authError')}</h2>`],
  [`<button onClick={() => navigate('/login')}>Back to Login</button>`, `<button onClick={() => navigate('/login')}>{t('callback.backToLogin')}</button>`],
]);

// === Health.tsx ===
replace('pages/Health.tsx', [
  [`<h2 className="empty-state-title">No baby selected</h2>`, `<h2 className="empty-state-title">{t('common:noBabySelected')}</h2>`],
]);

console.log('\n✅ All patches applied!');
