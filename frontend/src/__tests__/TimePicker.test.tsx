import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimePicker from '../components/TimePicker';

describe('TimePicker', () => {
  const baseDate = new Date(2024, 5, 15, 14, 30); // June 15, 2024, 2:30 PM

  it('renders date and time', () => {
    render(<TimePicker value={baseDate} onChange={vi.fn()} />);
    // Should show the hour (2), minutes (30), and AM/PM
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
  });

  it('renders Now button', () => {
    render(<TimePicker value={baseDate} onChange={vi.fn()} />);
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('calls onChange when Now is clicked', () => {
    const onChange = vi.fn();
    render(<TimePicker value={baseDate} onChange={onChange} />);
    fireEvent.click(screen.getByText('Now'));
    expect(onChange).toHaveBeenCalledWith(expect.any(Date));
  });

  it('adjusts minutes with up/down buttons', () => {
    const onChange = vi.fn();
    render(<TimePicker value={baseDate} onChange={onChange} />);
    // There are multiple ▲ buttons, click first one for hours then the minute one
    const upButtons = screen.getAllByText('▲');
    // Second ▲ is for minutes
    fireEvent.click(upButtons[1]);
    expect(onChange).toHaveBeenCalledWith(expect.any(Date));
    const calledDate = onChange.mock.calls[0][0] as Date;
    expect(calledDate.getMinutes()).toBe(35); // 30 + 5
  });

  it('adjusts days with arrow buttons', () => {
    const onChange = vi.fn();
    render(<TimePicker value={baseDate} onChange={onChange} />);
    fireEvent.click(screen.getByText('▶'));
    expect(onChange).toHaveBeenCalled();
    const calledDate = onChange.mock.calls[0][0] as Date;
    expect(calledDate.getDate()).toBe(16);
  });

  it('accepts ISO string value', () => {
    render(<TimePicker value="2024-06-15T14:30:00" onChange={vi.fn()} />);
    expect(screen.getByText('PM')).toBeInTheDocument();
  });
});
