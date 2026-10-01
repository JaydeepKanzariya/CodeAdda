import { HERO_DEMO, type Tone } from './homeContent';
import { Icon } from './icons';

const TONE: Record<Tone, string> = {
  comment: 'italic text-muted',
  keyword: 'text-brand-strong',
  function: 'text-warn',
  number: 'text-note',
  plain: 'text-ink',
};

// Reference timeline: rows at .70/1.02/1.34s, counter at 1.7s, pill at 1.9s. Delays are inline because Tailwind cannot see built class names.
const ROW_DELAYS = ['0.7s', '1.02s', '1.34s'];

export function HeroDemo() {
  const d = HERO_DEMO;
  const last = d.lines.length - 1;
  return (
    <figure data-testid="hero-demo" className="relative m-0 w-full max-w-140 motion-safe:animate-rise lg:ml-auto lg:max-w-130" style={{ animationDelay: '0.12s' }}>
      <figcaption className="sr-only">Example: a GROUP BY query on the SQL lab's shop database, checked as correct.</figcaption>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-float">
        <div className="flex h-10 items-center justify-between gap-3 border-b border-line pr-3.5 pl-4 text-xs text-muted">
          <span className="font-mono">{d.file}</span>
          <span>{d.crumb}</span>
        </div>

        <pre data-testid="hero-code" className="m-0 overflow-x-auto px-4.5 pt-4.5 pb-5 font-mono text-sm leading-[1.75] text-ink">
          {d.lines.map((line, i) => (
            <div key={i}>
              <span aria-hidden="true" className="inline-block w-6.5 select-none text-faint">
                {i + 1}
              </span>
              {line.map(([tone, text], j) => (
                <span key={j} className={TONE[tone]}>
                  {text}
                </span>
              ))}
              {i === last && <span aria-hidden="true" className="ml-px inline-block h-[0.85em] w-0.5 translate-y-[0.15em] bg-brand motion-safe:animate-blink" />}
            </div>
          ))}
        </pre>

        <div className="border-t border-line bg-page px-4 pt-3 pb-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Result check</span>
            <span className="rounded-full border border-ok-line bg-ok-bg px-2 text-xs font-semibold text-ok motion-safe:animate-pop" style={{ animationDelay: '1.7s' }}>
              {d.rows.length} / {d.rows.length} rows
            </span>
          </div>
          <ul aria-label="Result rows" className="m-0 list-none p-0">
            {d.rows.map(([country, n], i) => (
              <li
                key={country}
                className="mt-1 flex items-center gap-2.5 rounded-md border border-ok-line bg-ok-bg px-2.5 py-1.75 text-sm text-ink motion-safe:animate-rise"
                style={{ animationDelay: ROW_DELAYS[i] }}
              >
                <span aria-hidden="true" className="grid size-4.5 shrink-0 place-items-center rounded-full bg-ok text-white">
                  <Icon name="check" className="size-2.75" strokeWidth={3} />
                </span>
                <span>{country}</span>
                <span className="ml-auto font-mono tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Solid bg-surface backing: ok-bg is 12% alpha in dark mode and the card corner would show through. */}
      <div className="absolute -right-3.5 -bottom-[18px] rounded-full bg-surface shadow-float motion-safe:animate-pop max-sm:right-2 max-sm:-bottom-4" style={{ animationDelay: '1.9s' }}>
        <div className="flex items-center gap-2 rounded-full border border-ok-line bg-ok-bg px-3.5 py-2 text-sm text-ok">
          <Icon name="check-circle" className="size-4" />
          <span>
            <strong className="font-semibold">Correct!</strong> Result matches
          </span>
        </div>
      </div>
    </figure>
  );
}
