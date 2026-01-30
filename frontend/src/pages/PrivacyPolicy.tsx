/* eslint-disable @typescript-eslint/no-explicit-any */
import { Shield, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacyPolicyProps { onBack?: () => void; }
export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
    const { t } = useTranslation('auth');
    return (
        <div className="legal-page">
            <div className="legal-header">
                {onBack && (
                    <button className="btn-link legal-back" onClick={onBack}>
                        <ArrowLeft size={18} />
                        <span>{t('common:back')}</span>
                    </button>
                )}
                <div className="legal-icon">
                    <Shield size={32} />
                </div>
                <h1 className="legal-title">{t('privacy.title')}</h1>
                <p className="legal-updated">{t('privacy.lastUpdated')}</p>
            </div>

            <div className="legal-content">
                <section className="legal-section">
                    <h2>{t('privacy.section1Title')}</h2>
                    <p>
                        {t('privacy.section1Intro')}
                    </p>
                    <ul>
                        <li><strong>{t('privacy.section1Item1')}</strong> {t('privacy.section1Item1Desc')}</li>
                        <li><strong>{t('privacy.section1Item2')}</strong> {t('privacy.section1Item2Desc')}</li>
                        <li><strong>{t('privacy.section1Item3')}</strong> {t('privacy.section1Item3Desc')}</li>
                        <li><strong>{t('privacy.section1Item4')}</strong> {t('privacy.section1Item4Desc')}</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section2Title')}</h2>
                    <p>{t('privacy.section2Intro')}</p>
                    <ul>
                        <li>{t('privacy.section2Item1')}</li>
                        <li>{t('privacy.section2Item2')}</li>
                        <li>{t('privacy.section2Item3')}</li>
                        <li>{t('privacy.section2Item4')}</li>
                    </ul>
                    <p><strong>{t('privacy.section2NoSell')}</strong></p>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section3Title')}</h2>
                    <p>
                        {t('privacy.section3Intro')}
                    </p>
                    <ul>
                        <li>{t('privacy.section3Item1')}</li>
                        <li>{t('privacy.section3Item2')}</li>
                        <li>{t('privacy.section3Item3')}</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section4Title')}</h2>
                    <p>
                        {t('privacy.section4Intro')}
                    </p>
                    <ul>
                        <li>{t('privacy.section4Item1')}</li>
                        <li>{t('privacy.section4Item2')}</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section5Title')}</h2>
                    <p>{t('privacy.section5Intro')}</p>
                    <ul>
                        <li>{t('privacy.section5Item1')}</li>
                        <li>{t('privacy.section5Item2')}</li>
                        <li>{t('privacy.section5Item3')}</li>
                        <li>{t('privacy.section5Item4')}</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section6Title')}</h2>
                    <p>
                        {t('privacy.section6Text')}
                    </p>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section7Title')}</h2>
                    <p>
                        {t('privacy.section7Text')}
                    </p>
                </section>

                <section className="legal-section">
                    <h2>{t('privacy.section8Title')}</h2>
                    <p>
                        {t('privacy.section8Text')}
                        <br />
                        <strong>{t('privacy.section8Email')}</strong>
                    </p>
                </section>
            </div>
        </div>
    );
}
