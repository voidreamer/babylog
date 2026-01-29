/* eslint-disable @typescript-eslint/no-explicit-any */
import { Shield, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacyPolicyProps { onBack?: () => void; }
export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
    const { t } = useTranslation('settings');
    return (
        <div className="legal-page">
            <div className="legal-header">
                {onBack && (
                    <button className="btn-link legal-back" onClick={onBack}>
                        <ArrowLeft size={18} />
                        <span>{t('privacy.back')}</span>
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
                    <h2>1. Information We Collect</h2>
                    <p>
                        HeyBub collects information you provide directly when using our baby tracking app:
                    </p>
                    <ul>
                        <li><strong>Account Information:</strong> Email address and name via Google Sign-In</li>
                        <li><strong>Baby Information:</strong> Baby names, birth dates, and gender</li>
                        <li><strong>Activity Data:</strong> Feeding, diaper, sleep, and other tracking data you log</li>
                        <li><strong>Health Records:</strong> Doctor visits, vaccinations, medications, and growth data</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>2. How We Use Your Information</h2>
                    <p>We use your data solely to:</p>
                    <ul>
                        <li>Provide the baby tracking service</li>
                        <li>Display your logged activities and summaries</li>
                        <li>Enable sharing with caregivers you authorize</li>
                        <li>Improve app functionality and fix bugs</li>
                    </ul>
                    <p><strong>We do not sell your data to third parties.</strong></p>
                </section>

                <section className="legal-section">
                    <h2>3. Data Storage & Security</h2>
                    <p>
                        Your data is stored securely using:
                    </p>
                    <ul>
                        <li>AWS cloud infrastructure with encryption at rest</li>
                        <li>Secure authentication via AWS Cognito</li>
                        <li>HTTPS encryption for all data transmission</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>4. Data Sharing</h2>
                    <p>
                        We only share your data when:
                    </p>
                    <ul>
                        <li>You explicitly share a baby profile with another caregiver</li>
                        <li>Required by law or legal process</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. Your Rights</h2>
                    <p>You can:</p>
                    <ul>
                        <li>Access all your stored data through the app</li>
                        <li>Delete your baby profiles and associated data</li>
                        <li>Revoke sharing access at any time</li>
                        <li>Request account deletion by contacting us</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Children's Privacy</h2>
                    <p>
                        This app is designed for parents/caregivers to track infant care.
                        We do not knowingly collect information from children under 13.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>7. Changes to This Policy</h2>
                    <p>
                        We may update this policy periodically. We will notify users of
                        significant changes through the app.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>8. Contact Us</h2>
                    <p>
                        For privacy questions or concerns, contact us at:
                        <br />
                        <strong>privacy@heybub.app</strong>
                    </p>
                </section>
            </div>
        </div>
    );
}
