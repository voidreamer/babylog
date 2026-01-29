import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddBabyForm from '../components/AddBabyForm';

describe('AddBabyForm', () => {
  it('renders all form fields', () => {
    render(<AddBabyForm onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
    expect(screen.getByText("Baby's Name *")).toBeInTheDocument();
    expect(screen.getByText('Birth Date *')).toBeInTheDocument();
    expect(screen.getByText('Boy')).toBeInTheDocument();
    expect(screen.getByText('Girl')).toBeInTheDocument();
  });

  it('submit button is disabled when name is empty', () => {
    render(<AddBabyForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Add Baby')).toBeDisabled();
  });

  it('enables submit when name is entered', () => {
    render(<AddBabyForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: 'Luna' } });
    expect(screen.getByText('Add Baby')).not.toBeDisabled();
  });

  it('calls onSubmit with form data', () => {
    const onSubmit = vi.fn();
    render(<AddBabyForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: 'Luna' } });
    fireEvent.submit(screen.getByPlaceholderText('Enter name').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Luna' }));
  });

  it('renders cancel button when showCancel is true', () => {
    render(<AddBabyForm onSubmit={vi.fn()} onCancel={vi.fn()} showCancel={true} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<AddBabyForm onSubmit={vi.fn()} onCancel={onCancel} showCancel={true} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows saving state', () => {
    render(<AddBabyForm onSubmit={vi.fn()} saving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('uses custom submit label', () => {
    render(<AddBabyForm onSubmit={vi.fn()} submitLabel="Save Changes" />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('pre-fills with initial data', () => {
    const initialData = { name: 'Max', birth_date: '2024-01-10T00:00:00', gender: 'boy' };
    render(<AddBabyForm onSubmit={vi.fn()} initialData={initialData} />);
    expect(screen.getByDisplayValue('Max')).toBeInTheDocument();
  });

  it('toggles gender selection', () => {
    render(<AddBabyForm onSubmit={vi.fn()} />);
    const boyBtn = screen.getByText('Boy');
    fireEvent.click(boyBtn);
    expect(boyBtn.className).toContain('active');
    // Click again to deselect
    fireEvent.click(boyBtn);
    expect(boyBtn.className).not.toContain('active');
  });
});
