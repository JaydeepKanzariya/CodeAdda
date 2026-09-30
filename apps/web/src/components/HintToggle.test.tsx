// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HintToggle } from './HintToggle';

describe('HintToggle', () => {
  it('reveals and hides hints', async () => {
    render(<HintToggle hints={['Use WHERE.', 'Quote text.']} />);
    expect(screen.queryByText('Use WHERE.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show hint' }));
    expect(screen.getByText('Use WHERE.')).toBeInTheDocument();
    expect(screen.getByText('Quote text.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide hint' }));
    expect(screen.queryByText('Use WHERE.')).not.toBeInTheDocument();
  });

  it('renders nothing without hints', () => {
    const { container } = render(<HintToggle hints={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
