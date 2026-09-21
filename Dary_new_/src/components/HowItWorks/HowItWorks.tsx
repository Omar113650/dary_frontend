import { useLocale } from '../../utils/LocaleContext';
import './HowItWorks.css';

export default function HowItWorks() {
  const { t } = useLocale();

  const steps = [
    {
      num: '1',
      title: t.how_step1,
      desc: t.how_step1_desc,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      num: '2',
      title: t.how_step2,
      desc: t.how_step2_desc,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      num: '3',
      title: t.how_step3,
      desc: t.how_step3_desc,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  return (
    <section className="how-section section" aria-label="How DARY Works">
      <div className="container">
        <div className="section-header">
          <span className="section-tagline">{t.how_tagline}</span>
          <h2 className="section-title">{t.how_title}</h2>
        </div>

        <div className="how-grid">
          {steps.map((step) => (
            <div className="how-card" key={step.num}>
              <div className="how-step-indicator">
                <span className="how-step-num">0{step.num}</span>
              </div>
              <div className="how-icon-wrap" aria-hidden="true">
                {step.icon}
              </div>
              <h3 className="how-card-title">{step.title}</h3>
              <p className="how-card-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
