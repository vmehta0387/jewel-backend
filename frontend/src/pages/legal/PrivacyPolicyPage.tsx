import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import loginLogo from '../../assets/login-logo.png';

const contents = [
  'Overview',
  'User Registration',
  'Secure Sign In',
  'Jewelry Catalog',
  'Product Information',
  'Quotation Creation',
  'Sales Orders',
  'Spiff Rewards',
  'AI Assistant',
  'Notifications',
  'Account Deletion',
  'Security',
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
                BLITZ NYC
              </h1>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-[#766b60] sm:grid-cols-3">
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Application</span>
                  Blitz NYC
                </p>
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Audience</span>
                  Jewelry sales representatives
                </p>
                <p>
                  <span className="block text-xs uppercase text-[#a3978b]">Access</span>
                  Approved accounts only
                </p>
              </div>
            </div>

            <PolicySection title="Overview">
              <p>
                BLITZ NYC is a mobile application built for <strong>jewelry sales representatives</strong> to explore catalogs and manage sales activities.
              </p>
              <p>
                To use the application, sales representatives must first register by submitting their information. Every registration request is reviewed and approved by <strong>BLITZ NYC</strong>. Once approved, users can securely sign in and access the platform.
              </p>
              <p>
                BLITZ NYC publishes jewelry catalogs within the application. Registered sales representatives can browse the catalog, view product images, specifications, and pricing information. The pricing displayed in the application is intended to help sales representatives prepare quotations and sales orders. It is provided for business reference only and is not intended for direct online purchases.
              </p>
              <p>
                Sales representatives can create quotations, view quotation details and status, create sales orders, and earn <strong>Spiff Rewards</strong> based on the value of the sales orders they generate through the platform.
              </p>
              <p>
                The application also includes an <strong>AI-powered assistant</strong> that helps sales representatives quickly find matching jewelry from the available catalog. Sales representatives can describe the jewelry they are looking for by providing specifications such as jewelry type, style, metal, stone, or other product details. The AI assistant searches the available catalog and suggests the closest matching jewelry items.
              </p>
              <p>
                If a sales representative no longer wishes to use the application, they can submit an account deletion request directly from the app. BLITZ NYC reviews and verifies every request before permanently deleting the account.
              </p>
            </PolicySection>

            <PolicySection title="Features">
              <FeatureBlock title="User Registration">
                Register by submitting your information. Every registration request is reviewed and approved by BLITZ NYC before access to the platform is granted.
              </FeatureBlock>

              <FeatureBlock title="Secure Sign In">
                Securely sign in using your approved account credentials to access the application and all available features.
              </FeatureBlock>

              <FeatureBlock title="Jewelry Catalog">
                Browse jewelry catalogs published by BLITZ NYC with product images, specifications, and pricing information for reference and quotation purposes.
              </FeatureBlock>

              <FeatureBlock title="Product Information">
                View product images, specifications, and pricing information to better understand the jewelry available in the catalog.
              </FeatureBlock>

              <FeatureBlock title="Quotation Creation">
                Create quotations for customers and view quotation details and their current status directly within the application.
              </FeatureBlock>

              <FeatureBlock title="Sales Orders">
                Create sales orders from the jewelry catalog and view order details and current status at any time.
              </FeatureBlock>

              <FeatureBlock title="Spiff Rewards">
                Earn Spiff Rewards based on the value of the sales orders you generate through the platform.
              </FeatureBlock>

              <FeatureBlock title="AI Assistant">
                Describe the jewelry you need using specifications, and the AI assistant searches the catalog to suggest matching jewelry items.
              </FeatureBlock>

              <FeatureBlock title="Notifications">
                Receive notifications about quotation updates, sales order updates, approvals, and other important platform activities.
              </FeatureBlock>

              <FeatureBlock title="Account Deletion">
                Submit an account deletion request directly from the application. BLITZ NYC reviews every request before permanently deleting the account.
              </FeatureBlock>

              <FeatureBlock title="Security">
                Access is available only to registered and approved sales representatives. BLITZ NYC uses secure authentication to help protect user information and provide secure access to the platform.
              </FeatureBlock>
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

function FeatureBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#eee5da] bg-[#fbf8f3] p-5">
      <h3>{title}</h3>
      <p>{children}</p>
    </section>
  );
}
