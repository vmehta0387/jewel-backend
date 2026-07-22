import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import loginLogo from '../../assets/login-logo.png';

const contents = [
  'Information We Collect',
  'How We Use Information',
  'Android Permissions',
  'Third-Party Services',
  'Data Sharing',
  'Data Security',
  'Data Retention',
  "Children's Privacy",
  'Changes',
  'Contact',
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f3efe8] text-[#201a16]">
      <header className="border-b border-[#e7ded2] bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/login" className="inline-flex items-center gap-3">
            <img src={loginLogo} alt="BLITZ New York City" className="h-14 w-auto object-contain" />
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-[#d9c8ad] px-4 py-2 text-sm font-bold text-[#8f672f] transition hover:border-[#b1843f] hover:bg-[#fff7ea]"
          >
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <article className="rounded-[28px] border border-[#e8ded1] bg-white p-6 shadow-[0_24px_70px_-48px_rgba(20,15,10,0.5)] sm:p-9 lg:p-11">
            <div className="mb-8 border-b border-[#eee5da] pb-7">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#b1843f]">
                BLITZ NYC
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-[#171311] sm:text-5xl">
                Privacy Policy
              </h1>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-[#766b60] sm:grid-cols-3">
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Effective Date</span>
                  July 21, 2026
                </p>
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Last Updated</span>
                  July 21, 2026
                </p>
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Developer</span>
                  Clarion USA Inc.
                </p>
              </div>
            </div>

            <PolicySection title="Introduction">
              <p>
                Clarion USA Inc. ("we", "our", "us") operates the BLITZ NYC mobile application
                ("Application"), an enterprise jewelry sales and product management platform for
                authorized business users. This Privacy Policy explains how information is collected,
                used, disclosed, stored and protected.
              </p>
            </PolicySection>

            <PolicySection title="1. Information We Collect">
              <h3>Employee Information</h3>
              <PolicyList items={['Name', 'Business Email', 'Phone Number', 'Profile Photo', 'Company', 'Branch', 'Job Title', 'User Role', 'Username and encrypted credentials']} />
              <h3>Customer Information</h3>
              <PolicyList items={['Customer Name', 'Email Address', 'Phone Number']} />
              <h3>Business Information</h3>
              <p>
                Companies, branches, users, quotations, orders, pricing, product catalog, reports,
                reward data, product images, CAD/STL files and related business records.
              </p>
              <h3>Usage Information</h3>
              <p>
                Login history, audit logs, session information, application version and technical
                diagnostics required to operate and secure the service.
              </p>
            </PolicySection>

            <PolicySection title="2. How We Use Information">
              <PolicyList items={['Authenticate users', 'Provide platform functionality', 'Manage quotations, orders and pricing', 'Generate reports', 'Maintain security and audit trails', 'Provide support', 'Comply with legal obligations']} />
            </PolicySection>

            <PolicySection title="3. Android Permissions">
              <PolicyList
                items={[
                  'Camera: Capture product images.',
                  'Photos/Media: Upload images and CAD/STL documents.',
                  'Notifications: Business alerts and updates.',
                  'Microphone: Only if audio features are used.',
                  'Contacts: Only if business contact features are enabled.',
                  'Phone: Initiate calls from within the app.',
                  'Location: Not collected.',
                ]}
              />
            </PolicySection>

            <PolicySection title="4. Third-Party Services">
              <p>
                Application infrastructure is hosted on Amazon Web Services (AWS). Analytics may be
                used to improve application performance. We do not sell personal information.
              </p>
            </PolicySection>

            <PolicySection title="5. Data Sharing">
              <p>
                Information is shared only with authorized users in your organization, AWS as
                infrastructure provider, or where required by law. We do not sell or rent personal
                information.
              </p>
            </PolicySection>

            <PolicySection title="6. Data Security">
              <p>
                We use HTTPS/TLS, password encryption, JWT authentication, role-based access control,
                audit logging and reasonable administrative and technical safeguards.
              </p>
            </PolicySection>

            <PolicySection title="7. Data Retention">
              <p>
                Information is retained while accounts remain active, according to company policy and
                legal requirements. Accounts are managed by Super Administrators.
              </p>
            </PolicySection>

            <PolicySection title="8. Children's Privacy">
              <p>The Application is intended for business users and is not directed to children under 13.</p>
            </PolicySection>

            <PolicySection title="9. Changes">
              <p>
                We may update this Privacy Policy periodically. The latest version will be published
                on this page.
              </p>
            </PolicySection>

            <PolicySection title="10. Contact">
              <address className="not-italic text-[#5b5148]">
                Clarion USA Inc.
                <br />
                50 W 47TH Street, Suite 1513
                <br />
                New York, NY 10036-8795, USA
                <br />
                Email:{' '}
                <a className="font-bold text-[#9a6f33] hover:text-[#6f4a18]" href="mailto:info@clariondiamonds.com">
                  info@clariondiamonds.com
                </a>
                <br />
                Phone: +1 (646) 821-4040
                <br />
                Website:{' '}
                <a
                  className="font-bold text-[#9a6f33] hover:text-[#6f4a18]"
                  href="http://www.clariondiamonds.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  clariondiamonds.com
                </a>
              </address>
            </PolicySection>
          </article>

          <aside className="rounded-[24px] border border-[#e8ded1] bg-white p-6 shadow-[0_18px_55px_-42px_rgba(20,15,10,0.45)] lg:sticky lg:top-6">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#b1843f]">
              Contents
            </p>
            <ol className="space-y-2 text-sm font-semibold text-[#655b52]">
              {contents.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-xl px-3 py-2 transition hover:bg-[#fff7ea]">
                  <span className="font-black text-[#b1843f]">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#f0e7dc] py-7 last:border-b-0 last:pb-0">
      <h2 className="mb-4 text-2xl font-black tracking-tight text-[#171311]">{title}</h2>
      <div className="space-y-4 text-[15px] leading-7 text-[#5b5148] [&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-black [&_h3]:text-[#2a211b]">
        {children}
      </div>
    </section>
  );
}

function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-[#eee5da] bg-[#fbf8f3] px-4 py-3 font-semibold text-[#5b5148]">
          {item}
        </li>
      ))}
    </ul>
  );
}
