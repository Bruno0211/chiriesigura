import type { Metadata } from 'next';
import s from '../phone.module.css';
import { FrameBar } from '../components/FrameBar';
import { CONTACT } from '@/lib/contact';

export const metadata: Metadata = { title: 'Privacy notice' };

export default function PrivacyPage() {
  return (
    <>
      <FrameBar zone="Privacy notice" />
      <main className={s.main}>
        <h1 id="step-heading" className={s.h1}>What we keep, and what we never keep</h1>
        <p className={s.lead}>
          ChirieSigură checks landlords and viewings through your mobile operator. This page lists every piece of data
          involved.
        </p>

        <section className={s.module} aria-labelledby="p-kept">
          <div className={s.tab}>
            <h2 id="p-kept">Kept</h2>
            <span>Stored by ChirieSigură</span>
          </div>
          <div className={s.prose}>
            <ul>
              <li><strong>Check results</strong>: passed or failed, and when each check ran.</li>
              <li>
                <strong>A one-way hash of your phone number</strong>: a keyed hash we can match again but cannot turn back
                into the number.
              </li>
              <li><strong>The apartment address</strong>: you publish it in your listing anyway. It is never shown in the extension.</li>
              <li><strong>Your listing links</strong>, so the extension can tell your listings from copies.</li>
              <li>
                <strong>Viewing reports</strong>: the category picked, when, and a one-way hash of the reporter&apos;s number so
                each phone reports once.
              </li>
            </ul>
          </div>
        </section>

        <section className={s.module} aria-labelledby="p-never">
          <div className={s.tab}>
            <h2 id="p-never">Never kept</h2>
            <span>Passed through, or never received</span>
          </div>
          <div className={s.prose}>
            <ul>
              <li>
                <strong>Your ID card number, name and date of birth.</strong> They go to your mobile operator for a yes or no
                match, and are then discarded.
              </li>
              <li>
                <strong>Your phone&apos;s location.</strong> The operator only answers whether the phone is near the address. We
                never receive coordinates.
              </li>
              <li><strong>Your phone number itself.</strong> Only the one-way hash above.</li>
              <li>
                <strong>Students&apos; email and name.</strong> Auth0, our sign-in provider, keeps your sign-in. ChirieSigură
                only learns that you are signed in.
              </li>
            </ul>
          </div>
        </section>

        <section className={s.module} aria-labelledby="p-basis">
          <div className={s.tab}>
            <h2 id="p-basis">Legal basis</h2>
            <span>GDPR · Law 190/2018</span>
          </div>
          <div className={s.prose}>
            <p>
              Your consent. Every check is named on the first screen, and nothing runs until you agree. You can withdraw
              consent by asking us to delete your record.
            </p>
            <p>
              This is a hackathon demo running on test phone numbers, so no real person&apos;s data is processed. How long
              records are kept will be set before any real launch.
            </p>
          </div>
        </section>

        <section className={s.module} aria-labelledby="p-contest">
          <div className={s.tab}>
            <h2 id="p-contest">Contest a report</h2>
            <span>Rectification · objection</span>
          </div>
          <div className={s.prose}>
            <p>
              Landlords: if a viewing report about you is wrong, email us with your code. We review it and correct or
              remove it.
            </p>
          </div>
        </section>

        <section className={s.module} aria-labelledby="p-contact">
          <div className={s.tab}>
            <h2 id="p-contact">Contact</h2>
          </div>
          <div className={s.prose}>
            <p>
              <a className={s.textLink} href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </p>
          </div>
        </section>

        <div className={s.actionsInline}>
          <a className={s.secondary} href="/verify">Back to verification</a>
        </div>
      </main>
    </>
  );
}
