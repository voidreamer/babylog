import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Icon from '../components/Icon';

describe('Icon', () => {
  it('renders image for valid icon name', () => {
    render(<Icon name="feeding" />);
    const img = screen.getByRole('img', { name: 'feeding' });
    expect(img).toBeInTheDocument();
  });

  it('returns null for unknown icon name', () => {
    const { container } = render(<Icon name="nonexistent" />);
    expect(container.innerHTML).toBe('');
  });

  it('uses correct src path', () => {
    render(<Icon name="diaper" />);
    const img = screen.getByRole('img', { name: 'diaper' });
    expect(img).toHaveAttribute('src', '/icons/diaper.png');
  });

  it('uses correct src path for each known icon', () => {
    const { rerender } = render(<Icon name="feeding" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/feeding.png');

    rerender(<Icon name="sleep" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/sleep.png');

    rerender(<Icon name="pumping" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/pumping.png');

    rerender(<Icon name="logo" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/logo.png');
  });

  it('applies default size of 32', () => {
    render(<Icon name="feeding" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });

  it('applies custom size', () => {
    render(<Icon name="feeding" size={64} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '64');
    expect(img).toHaveAttribute('height', '64');
  });

  it('applies custom className', () => {
    render(<Icon name="feeding" className="my-custom-class" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('my-custom-class');
  });

  it('renders new icon types', () => {
    const { rerender } = render(<Icon name="activity" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/activity.png');

    rerender(<Icon name="medicine" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/medicine.png');

    rerender(<Icon name="growth" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/icons/growth.png');
  });
});
