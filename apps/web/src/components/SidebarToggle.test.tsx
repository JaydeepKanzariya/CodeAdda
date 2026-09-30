// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarToggle } from './SidebarToggle';

describe('SidebarToggle', () => {
  it('offers to hide the list when open, with a left chevron', () => {
    render(<SidebarToggle collapsed={false} onToggle={() => {}} controls="lab-sidebar" />);
    const b = screen.getByRole('button', { name: 'Hide lesson list' });
    expect(b).toHaveAttribute('title', 'Hide lesson list');
    expect(b).toHaveAttribute('aria-expanded', 'true');
    expect(b).toHaveAttribute('aria-controls', 'lab-sidebar');
    expect(b).toHaveAttribute('type', 'button');
    expect(b.className).toMatch(/border-l/);
    expect(b.querySelector('svg')!.className.baseVal).toMatch(/(^| )rotate-90/);
  });

  it('offers to show the list when collapsed, with a right chevron', () => {
    render(<SidebarToggle collapsed onToggle={() => {}} controls="lab-sidebar" />);
    const b = screen.getByRole('button', { name: 'Show lesson list' });
    expect(b).toHaveAttribute('title', 'Show lesson list');
    expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(b.className).not.toMatch(/border-l/);
    expect(b.querySelector('svg')!.className.baseVal).toMatch(/-rotate-90/);
  });

  it('is a desktop-only full-height strip with hover styling', () => {
    render(<SidebarToggle collapsed={false} onToggle={() => {}} controls="x" />);
    const c = screen.getByRole('button').className;
    expect(c).toMatch(/hidden/);
    expect(c).toMatch(/lab:flex/);
    expect(c).toMatch(/self-stretch/);
    expect(c).toMatch(/hover:bg-brand-muted/);
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<SidebarToggle collapsed={false} onToggle={onToggle} controls="x" />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
