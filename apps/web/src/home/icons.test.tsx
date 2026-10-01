// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ICON_NAMES, Icon } from './icons';

describe('Icon', () => {
  it('renders every name as a hidden, stroke-based 24-unit SVG with at least one shape', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} className="size-4" />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('data-icon', name);
      expect(svg).toHaveClass('size-4');
      expect(svg.querySelectorAll('path, circle, rect, ellipse').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('accepts a custom stroke width', () => {
    const { container } = render(<Icon name="check" strokeWidth={3} />);
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '3');
  });
});
