import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import loginLogo from '../../assets/login-logo.png';

const contents = [
  'Scope',
  'Information We Collect',
  'How We Use Information',
  'Administrator Managed Accounts',
  'Information Sharing',
  'Data Security',
  'Data Retention',
  'Your Privacy Rights',
  'Account Deletion',
  "Children's Privacy",
  'Third-Party Services',
  'Changes to this Privacy Policy',
  'Contact Us',
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
                  July 22, 2026
                </p>
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Last Updated</span>
                  July 22, 2026
                </p>
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Application</span>
                  Blitz NYC
                </p>
              </div>
            </div>

            <PolicySection title="Introduction">
              <p>
                Blitz NYC ("we", "our", "us") respects your privacy and is committed to
                protecting your personal information. This Privacy Policy explains how information
                is collected, used, stored, protected and deleted when you use our mobile
                application and related services.
              </p>
            </PolicySection>

            <PolicySection title="1. Scope">
              <p>
                This Privacy Policy applies to all users of the Blitz NYC mobile application,
                website, and related services.
              </p>
            </PolicySection>

            <PolicySection title="2. Information We Collect">
              <PolicyList
                items={[
                  'Employee Name',
                  'Business Email Address',
                  'Business Phone Number',
                  'Profile Photo',
                  'Company Name',
                  'Branch Information',
                  'Job Title',
                  'User Role',
                  'Customer Name',
                  'Customer Email Address',
                  'Customer Phone Number',
                  'Product Images',
                  'CAD, STL and Other Business Documents uploaded by authorized users',
                ]}
              />
            </PolicySection>

            <PolicySection title="3. How We Use Information">
              <PolicyList
                items={[
                  'Create and manage user accounts.',
                  'Authenticate users.',
                  'Provide application services.',
                  'Improve application functionality.',
                  'Maintain security.',
                  'Respond to customer support requests.',
                  'Comply with applicable laws.',
                ]}
              />
            </PolicySection>

            <PolicySection title="4. Administrator Managed Accounts">
              <div className="rounded-2xl border-l-4 border-[#b1843f] bg-[#fff7ea] p-5 text-[#4d4238]">
                <p>Blitz NYC is designed for organizations.</p>
                <p>
                  Users <strong>cannot create accounts themselves.</strong> Every account is
                  created and managed by an authorized Organization Administrator.
                </p>
                <p>
                  If you require access to the application, please contact your Organization
                  Administrator.
                </p>
              </div>
            </PolicySection>

            <PolicySection title="5. Information Sharing">
              <p>We do not sell your personal information.</p>
              <p>Information may only be shared:</p>
              <PolicyList
                items={[
                  'With your Organization Administrator.',
                  'With service providers who help operate our services.',
                  'When required by law.',
                  'To protect our legal rights and security.',
                ]}
              />
            </PolicySection>

            <PolicySection title="6. Data Security">
              <PolicyList
                items={[
                  'Password encryption is implemented.',
                  'JWT-based authentication is used.',
                  'Role-based access control is enforced.',
                  'Access is restricted to authorized personnel.',
                ]}
              />
            </PolicySection>

            <PolicySection title="7. Data Retention">
              <p>
                Personal information is retained only for as long as necessary to:
              </p>
              <PolicyList
                items={[
                  'Provide our services.',
                  'Maintain organization records.',
                  'Meet legal obligations.',
                  'Resolve disputes.',
                  'Prevent fraud.',
                ]}
              />
            </PolicySection>

            <PolicySection title="8. Your Privacy Rights">
              <p>You may request:</p>
              <PolicyList
                items={[
                  'Access to your personal information.',
                  'Correction of inaccurate information.',
                  'Deletion of your account.',
                  'Deletion of associated personal information.',
                ]}
              />
            </PolicySection>

            <PolicySection title="9. Account Deletion">
              <h3>How to Request Account Deletion</h3>
              <ol className="list-decimal space-y-2 pl-5 font-semibold">
                <li>Contact your Organization Administrator.</li>
                <li>
                  Or contact us at{' '}
                  <a className="font-bold text-[#9a6f33] hover:text-[#6f4a18]" href="mailto:info@clariondiamonds.com">
                    info@clariondiamonds.com
                  </a>
                  .
                </li>
                <li>After identity verification, your request will be processed.</li>
              </ol>

              <h3>Data Deleted</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr>
                      <th className="border border-[#e4d7c7] bg-[#b1843f] px-4 py-3 font-black text-white">
                        Information
                      </th>
                      <th className="border border-[#e4d7c7] bg-[#b1843f] px-4 py-3 font-black text-white">
                        Deleted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['User Account', 'Yes'],
                      ['Profile Information', 'Yes'],
                      ['Email Address', 'Yes'],
                      ['Phone Number', 'Yes'],
                      ['User Generated Data', 'Yes (unless retention is legally required)'],
                    ].map(([information, deleted]) => (
                      <tr key={information}>
                        <td className="border border-[#e4d7c7] px-4 py-3 font-semibold">{information}</td>
                        <td className="border border-[#e4d7c7] px-4 py-3">{deleted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Data That May Be Retained</h3>
              <p>
                Some information may be retained for up to <strong>1-2 working days</strong> after
                account deletion for:
              </p>
              <PolicyList
                items={[
                  'Fraud prevention',
                  'Security investigations',
                  'Backup recovery',
                  'Legal compliance',
                ]}
              />
              <p>
                After the retention period expires, retained personal information is permanently
                deleted unless a longer retention period is required by applicable law.
              </p>
            </PolicySection>

            <PolicySection title="10. Children's Privacy">
              <p>
                Blitz NYC is intended solely for authorized employees and representatives of
                organizations aged 18 years or older. The application is not intended for children,
                and we do not knowingly collect personal information from individuals under 18 years
                of age.
              </p>
            </PolicySection>

            <PolicySection title="11. Third-Party Services">
              <p>
                The application may use trusted third-party services (such as cloud hosting,
                analytics, crash reporting, or push notifications) solely to operate and improve the
                application.
              </p>
            </PolicySection>

            <PolicySection title="12. Changes to this Privacy Policy">
              <p>
                We may update this Privacy Policy periodically. Changes become effective when
                published on this page.
              </p>
            </PolicySection>

            <PolicySection title="13. Contact Us">
              <address className="not-italic text-[#5b5148]">
                Developer:
                <br />
                Clarion USA Inc.
                <br />
                <br />
                Website:
                <br />
                <a
                  className="font-bold text-[#9a6f33] hover:text-[#6f4a18]"
                  href="https://www.clariondiamonds.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://www.clariondiamonds.com/
                </a>
                <br />
                <br />
                Support Email:
                <br />
                <a className="font-bold text-[#9a6f33] hover:text-[#6f4a18]" href="mailto:info@clariondiamonds.com">
                  info@clariondiamonds.com
                </a>
                <br />
                <br />
                Business Contact:
                <br />
                <a className="font-bold text-[#9a6f33] hover:text-[#6f4a18]" href="mailto:prateek@clariondiamonds.com">
                  prateek@clariondiamonds.com
                </a>
              </address>
            </PolicySection>

            <footer className="mt-10 border-t border-[#eee5da] pt-6 text-center text-sm font-semibold text-[#766b60]">
              &copy; 2026 Blitz NYC. All Rights Reserved.
            </footer>
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
