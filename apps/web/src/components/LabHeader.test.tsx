// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { LabHeader } from './LabHeader';
import { Navbar } from './Navbar';

const item = (id: string, kind: 'lesson' | 'problem'): LessonItem => ({
  kind, id, title: id, chapter: 'A', order: 1, dataset: 'd', check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '',
});
const lab: Lab = {
  id: 'sql', title: 'SQL Lab', subtitle: 'Learn SQL, one query at a time', language: 'sql', datasets: {}, errors: [],
  lessons: [{ title: 'A', items: [item('a', 'lesson')] }], problems: [{ title: 'P', items: [item('p', 'problem')] }],
};

describe('LabHeader', () => {
  it('shows the wordmark, subtitle, Lessons/LeetLab tabs and Reset DB', () => {
    render(<MemoryRouter><LabHeader lab={lab} tab="lessons" onOpenDrawer={() => {}} onReset={() => {}} /></MemoryRouter>);
    expect(screen.getByText('SQL')).toHaveClass('text-brand');
    expect(screen.getByText('SQL').parentElement).toHaveTextContent(/^CodeAdda SQLab$/);
    expect(screen.getByText('Learn SQL, one query at a time')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lessons' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'LeetLab' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: 'Reset DB' })).toBeInTheDocument();
  });

  it('keeps "SQLab" only for "SQL Lab"; other labs read "<Name> Lab"', () => {
    render(<MemoryRouter><LabHeader lab={{ ...lab, title: 'PostgreSQL Lab' }} tab="lessons" onOpenDrawer={() => {}} /></MemoryRouter>);
    const name = screen.getByText('PostgreSQL');
    expect(name).toHaveClass('text-brand');
    expect(name.parentElement).toHaveTextContent(/^CodeAdda PostgreSQL Lab$/);
  });
});

describe('Navbar', () => {
  it('lists upcoming labs as disabled', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'SQL Lab' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PostgreSQL Lab' })).toBeInTheDocument();
    for (const name of ['MongoDB', 'Redis']) {
      expect(screen.getByText(name).closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
    }
  });
});

describe('LabHeader problems tab', () => {
  it('shows problemsSubtitle and no Reset DB without onReset', () => {
    render(<MemoryRouter><LabHeader lab={{ ...lab, problemsSubtitle: 'LeetCode-style practice' }} tab="problems" onOpenDrawer={() => {}} /></MemoryRouter>);
    expect(screen.getByText('LeetCode-style practice')).toBeInTheDocument();
    expect(screen.queryByText('Learn SQL, one query at a time')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset DB' })).not.toBeInTheDocument();
  });
});
