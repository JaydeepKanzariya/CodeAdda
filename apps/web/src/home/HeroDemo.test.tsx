// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HERO_DEMO, demoSql } from './homeContent';
import { HeroDemo } from './HeroDemo';

describe('HeroDemo', () => {
  it('shows the file, crumb, numbered code, three result rows, the counter and the Correct! pill', () => {
    render(<HeroDemo />);
    expect(screen.getByText(HERO_DEMO.file)).toBeInTheDocument();
    expect(screen.getByText(HERO_DEMO.crumb)).toBeInTheDocument();

    const code = screen.getByTestId('hero-code');
    expect(code.textContent!.replace(/^\d+/gm, '').replace(/\n\s*/g, '\n').trim()).toContain('SELECT country');
    expect(code.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(HERO_DEMO.lines.length);
    for (const line of demoSql(HERO_DEMO).split('\n')) expect(code).toHaveTextContent(line.trim().slice(0, 12));

    const rows = within(screen.getByRole('list', { name: 'Result rows' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(['India3', 'USA3', 'Japan2']);
    expect(screen.getByText('3 / 3 rows')).toBeInTheDocument();
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('describes itself for screen readers and staggers rows with inline delays', () => {
    render(<HeroDemo />);
    expect(screen.getByTestId('hero-demo')).toHaveTextContent(/Example: a GROUP BY query/);
    const rows = within(screen.getByRole('list', { name: 'Result rows' })).getAllByRole('listitem');
    expect(rows.map((r) => r.style.animationDelay)).toEqual(['0.7s', '1.02s', '1.34s']);
  });
});
