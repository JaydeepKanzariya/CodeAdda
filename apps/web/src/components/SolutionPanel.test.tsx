// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SolutionPanel } from './SolutionPanel';

describe('SolutionPanel', () => {
  it('is collapsed until opened, then loads the solution into the editor', async () => {
    const onLoad = vi.fn();
    render(<SolutionPanel solution="SELECT 1;" onLoad={onLoad} />);
    expect(screen.queryByText('SELECT 1;')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Solution/ }));
    expect(screen.getByText('SELECT 1;')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load into editor' }));
    expect(onLoad).toHaveBeenCalledWith('SELECT 1;');
  });
});
