import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { LabSummary } from '@codeadda/core';
import { LogoMark } from '../components/Logo';
import { labSummaries, upcomingLabs } from '../content/registry';
import { cx } from '../lib/cx';
import { useProgress } from '../state/progress';
import { HeroDemo } from './HeroDemo';
import { FEATURES, LIVE_DESCRIPTIONS, LIVE_DESCRIPTION_FALLBACK, STEPS, UPCOMING_COPY, heroPill, labStats, labsHeadline, labsLead, type LabStats } from './homeContent';
import { Icon } from './icons';

// Layout constants shared by every band (reference: 1120px container, 24px gutter, 88px section rhythm).
const CONTAINER = 'mx-auto w-full max-w-280 px-4 sm:px-6';
const SECTION = 'py-15 sm:py-22';
const PRIMARY = 'group inline-flex h-11.5 items-center gap-2 rounded-md bg-inverse px-5.5 text-md font-medium text-on-inverse transition hover:opacity-[.88] active:translate-y-px';
const SECONDARY = 'inline-flex h-11.5 items-center rounded-md border border-line bg-surface px-5.5 text-md font-medium text-ink transition hover:border-line-strong hover:bg-subtle';
const ARROW = 'size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none';
const FOOT_LINK = 'text-sm text-muted transition-colors hover:text-ink';

export function HomePage() {
  // The hero, CTA banner and footer "Start here" follow the first registry lab (SQL today).
  const stats = labSummaries[0] ? labStats(labSummaries[0]) : undefined;
  return (
    <>
      <main id="main">
        <Hero stats={stats} />
        <LabsSection />
        <HowItWorks />
        <WhySection stats={stats} />
        {stats && <CtaBanner stats={stats} />}
      </main>
      <SiteFooter stats={stats} />
    </>
  );
}

function SectionHead({ id, kicker, title, lead }: { id: string; kicker: string; title: string; lead?: string }) {
  return (
    <div className="mb-11 max-w-160">
      <p className="mb-3 text-xs font-semibold tracking-[0.1em] text-brand-strong uppercase">{kicker}</p>
      <h2 id={id} className="text-[clamp(1.75rem,3vw,2.375rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-ink">
        {title}
      </h2>
      {lead && <p className="mt-3 text-md leading-6 text-muted">{lead}</p>}
    </div>
  );
}

function Hero({ stats }: { stats?: LabStats }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-12 pb-14 sm:pt-22 sm:pb-18">
      <div aria-hidden="true" className="home-hero-bg -z-10" />
      <div aria-hidden="true" className="home-hero-glow -z-10" />
      <div className={cx(CONTAINER, 'grid items-center gap-11 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14')}>
        <div className="motion-safe:animate-rise">
          <p className="mb-5.5 inline-flex h-7 items-center gap-2 rounded-full border border-line bg-surface pr-3 pl-2.5 text-xs font-medium text-muted">
            <span aria-hidden="true" className="size-1.75 rounded-full bg-ok shadow-[0_0_0_3px_var(--color-success-bg)]" />
            {heroPill(labSummaries)}
          </p>
          <h1 id="hero-title" className="mb-5.5 text-[clamp(2.5rem,5.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
            Pull up a chair,
            <br />
            <span className="text-brand-strong">write real SQL.</span>
          </h1>
          <p className="mb-7.5 max-w-130 text-xl leading-[1.6] text-muted">
            CodeAdda is a hangout for learning to code by doing it. Type a query, run it on a real Postgres database inside your browser, and find out straight away whether
            your result is right.
          </p>
          <div className="mb-10 flex flex-wrap gap-2.5">
            {stats && (
              <Link to="/sql" className={PRIMARY}>
                Start the SQL lab
                <Icon name="arrow" className={ARROW} />
              </Link>
            )}
            <a href="#labs" className="inline-flex h-11.5 items-center rounded-md px-5.5 text-md font-medium text-muted transition hover:bg-wash hover:text-ink">
              See the labs
            </a>
          </div>
          {stats && (
            <dl className="m-0 flex flex-wrap gap-9">
              <Stat n={stats.lessons} label="SQL lessons" />
              <Stat n={stats.problems} label="practice problems" />
              <Stat n={stats.animated} label="animated walkthroughs" />
            </dl>
          )}
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  // dt first in the DOM (label), dd second (number); flex-col-reverse puts the number on top like the reference.
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 text-2xl font-semibold tracking-tight text-ink tabular-nums">{n}</dd>
    </div>
  );
}

const shortName = (l: LabSummary) => l.title.replace(/\s+Lab$/, '');
const CARD = 'flex h-full flex-col gap-3 rounded-xl border border-line p-5.5';

function LabsSection() {
  const progress = useProgress();
  const soon = upcomingLabs();
  return (
    <section id="labs" aria-labelledby="labs-title" className={cx(SECTION, 'scroll-mt-(--navbar-height)')}>
      <div className={CONTAINER}>
        <SectionHead
          id="labs-title"
          kicker="The labs"
          title={labsHeadline(labSummaries.length, soon.length)}
          lead={labsLead(labSummaries.map(shortName), soon.length)}
        />
        <ul className="m-0 grid list-none gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {labSummaries.map((lab) => {
            const stats = labStats(lab);
            return (
            <li key={lab.id} data-testid="live-lab-card">
              <Link
                to={`/${lab.id}`}
                className={cx(CARD, 'group bg-surface transition hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised motion-reduce:transform-none')}
              >
                <div className="flex h-10 items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-md bg-brand-muted text-brand">
                    <Icon name="database" className="size-5" />
                  </span>
                  <span className="rounded-full border border-ok-line bg-ok-bg px-2 py-0.5 text-xs font-medium text-ok">Free</span>
                </div>
                <h3 className="flex flex-col gap-0.5">
                  <span className="text-xl font-semibold tracking-tight text-ink">{shortName(lab)}</span>
                  <span className="text-sm font-normal text-muted">{lab.subtitle}</span>
                </h3>
                <p className="text-base leading-[1.6] text-muted">{LIVE_DESCRIPTIONS[lab.id] ?? LIVE_DESCRIPTION_FALLBACK}</p>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="text-muted">
                    {stats.chapters} chapters · {stats.total} exercises
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-brand-strong">
                    {progress.completedCount(lab.id) > 0 ? 'Continue' : 'Open'}
                    <Icon name="arrow" className="size-3.5 transition-transform group-hover:translate-x-0.75 motion-reduce:transition-none" />
                  </span>
                </div>
              </Link>
            </li>
            );
          })}
          {soon.map((name) => {
            const c = UPCOMING_COPY[name];
            return (
              <li key={name} data-testid="coming-soon-card">
                <div className={cx(CARD, 'bg-subtle')}>
                  <div className="flex h-10 items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-md bg-surface text-faint">
                      <Icon name={c.icon} className="size-5" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                      <Icon name="clock" className="size-2.75" />
                      Coming soon
                    </span>
                  </div>
                  <h3 className="flex flex-col gap-0.5">
                    <span className="text-xl font-semibold tracking-tight text-ink">{name}</span>
                    <span className="text-sm font-normal text-muted">{c.tagline}</span>
                  </h3>
                  <p className="text-base leading-[1.6] text-muted">{c.description}</p>
                  <div className="mt-auto border-t border-line pt-3 text-xs text-muted">In the works</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className={cx(SECTION, 'scroll-mt-(--navbar-height) border-y border-line bg-surface')}>
      <div className={CONTAINER}>
        <SectionHead id="how-title" kicker="How it works" title="Read, run, check, repeat" />
        <ol className="m-0 grid list-none gap-x-10 gap-y-8 p-0 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative border-t border-line pt-4.5 before:absolute before:-top-px before:left-0 before:h-0.5 before:w-10 before:bg-brand">
              <span aria-hidden="true" className="mb-3.5 block font-mono text-xs text-brand-strong">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink">{s.title}</h3>
              <p className="text-base leading-[1.65] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WhySection({ stats }: { stats?: LabStats }) {
  return (
    <section aria-labelledby="why-title" className={SECTION}>
      <div className={CONTAINER}>
        <SectionHead id="why-title" kicker="Why CodeAdda" title="Built so practice turns into habit." />
        <ul className="m-0 grid list-none gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-xl border border-line bg-surface p-5.5">
              <span className="mb-4 grid size-9 place-items-center rounded-md border border-line bg-page text-ink">
                <Icon name={f.icon} className="size-4.5" strokeWidth={1.8} />
              </span>
              <h3 className="mb-1.5 text-md font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="text-sm leading-[1.6] text-muted">{f.body(stats)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CtaBanner({ stats }: { stats: LabStats }) {
  return (
    <section aria-labelledby="cta-title" className="pb-15 sm:pb-22">
      <div className={CONTAINER}>
        <div className="relative isolate flex flex-col items-start gap-6 overflow-hidden rounded-xl border border-line bg-surface px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-11 sm:py-10">
          <div aria-hidden="true" className="home-cta-glow -z-10" />
          <div>
            <h2 id="cta-title" className="text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
              The database is already running.
            </h2>
            <p className="mt-1.5 text-md text-muted">Open the first lesson and run a query now.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {stats.firstLesson && (
              <Link to={stats.firstLesson} className={PRIMARY}>
                Start lesson one
                <Icon name="arrow" className={ARROW} />
              </Link>
            )}
            {stats.firstProblem && (
              <Link to={stats.firstProblem} className={SECONDARY}>
                Try a problem
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-xs font-semibold tracking-[0.08em] text-muted uppercase">{title}</h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{children}</ul>
    </div>
  );
}

function SiteFooter({ stats }: { stats?: LabStats }) {
  const soon = upcomingLabs();
  return (
    <footer className="border-t border-line bg-page pt-14 pb-10">
      <div className={cx(CONTAINER, 'grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]')}>
        <div>
          <p className="m-0 flex items-center gap-2 text-lg font-bold tracking-tight">
            <LogoMark className="size-6" />
            <span>
              <span className="text-ink">Code</span>
              <span className="text-brand">Adda</span>
            </span>
          </p>
          <p className="mt-3 text-sm text-muted">
            An{' '}
            <abbr title="Hindi for a place to hang out" className="no-underline">
              adda
            </abbr>{' '}
            for code: learn it by running it.
          </p>
          <p className="mt-4 text-xs text-muted">© {new Date().getFullYear()} CodeAdda</p>
        </div>
        <FooterColumn title="Labs">
          {labSummaries.map((lab) => (
            <li key={lab.id}>
              <Link to={`/${lab.id}`} className={FOOT_LINK}>
                {lab.title}
              </Link>
            </li>
          ))}
          {soon.map((n) => (
            <li key={n} className="flex items-center gap-2 text-sm text-muted">
              {n}
              <span className="rounded-full border border-line px-1.5 text-[10px] tracking-wide text-faint uppercase">soon</span>
            </li>
          ))}
        </FooterColumn>
        <FooterColumn title="Start here">
          {stats?.firstLesson && (
            <li>
              <Link to={stats.firstLesson} className={FOOT_LINK}>
                First lesson
              </Link>
            </li>
          )}
          {stats?.firstProblem && (
            <li>
              <Link to={stats.firstProblem} className={FOOT_LINK}>
                Practice problems
              </Link>
            </li>
          )}
          <li>
            <a href="#how" className={FOOT_LINK}>
              How it works
            </a>
          </li>
        </FooterColumn>
      </div>
    </footer>
  );
}
