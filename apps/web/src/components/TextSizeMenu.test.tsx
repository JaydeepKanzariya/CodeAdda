// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { prefsStore } from '../state/prefs';
import { TextSizeMenu } from './TextSizeMenu';

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Text size settings' }));

describe('TextSizeMenu', () => {
  beforeEach(() => prefsStore.resetText());

  it('opens a dialog with reset, 4 presets (M pressed) and 5 sliders', () => {
    render(<TextSizeMenu tab="lessons" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    expect(screen.getByRole('dialog', { name: 'Text size' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    for (const p of ['S', 'M', 'L', 'XL']) expect(screen.getByRole('button', { name: p })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('slider')).toHaveLength(5);
    expect(screen.getByText('Saved on this device · default 100%')).toBeInTheDocument();
  });

  it('names the second slider by tab', () => {
    const { unmount } = render(<TextSizeMenu tab="problems" />);
    open();
    expect(screen.getByRole('slider', { name: 'Problem' })).toBeInTheDocument();
    unmount();
    render(<TextSizeMenu tab="lessons" />);
    open();
    expect(screen.getByRole('slider', { name: 'Lesson' })).toBeInTheDocument();
  });

  it('XL sets every slider to 125', () => {
    render(<TextSizeMenu tab="lessons" />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'XL' }));
    for (const s of screen.getAllByRole('slider')) expect(s).toHaveValue('125');
    expect(screen.getAllByText('125%')).toHaveLength(5);
  });

  it('a single slider change leaves no preset pressed; Reset restores 100', () => {
    render(<TextSizeMenu tab="lessons" />);
    open();
    fireEvent.change(screen.getByRole('slider', { name: 'Code editor' }), { target: { value: '130' } });
    expect(screen.getAllByText('130%')).toHaveLength(1);
    for (const p of ['S', 'M', 'L', 'XL']) expect(screen.getByRole('button', { name: p })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    for (const s of screen.getAllByRole('slider')) expect(s).toHaveValue('100');
  });

  it('closes on Escape and on outside mousedown; trigger is brand while open', () => {
    render(<TextSizeMenu tab="lessons" />);
    const trigger = screen.getByRole('button', { name: 'Text size settings' });
    open();
    expect(trigger).toHaveClass('text-brand');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('links trigger and dialog, voices slider values as percent, and returns focus on Escape', () => {
    render(<TextSizeMenu tab="lessons" />);
    const trigger = screen.getByRole('button', { name: 'Text size settings' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    open();
    const dialog = screen.getByRole('dialog', { name: 'Text size' });
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(screen.getByRole('slider', { name: 'Code editor' })).toHaveAttribute('aria-valuetext', '100%');
    screen.getByRole('slider', { name: 'Code editor' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
