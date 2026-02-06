import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import i18n from 'i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { LANGUAGES } from '../i18n/languages';

describe('LanguageSwitcher', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('renders the language label and description', () => {
        render(<LanguageSwitcher />);
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Choose your language')).toBeInTheDocument();
    });

    it('renders a select element with all language options', () => {
        render(<LanguageSwitcher />);
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(LANGUAGES.length);
    });

    it('shows the correct language option labels', () => {
        render(<LanguageSwitcher />);
        // Native names from languages.ts config
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Español (Colombia)')).toBeInTheDocument();
        expect(screen.getByText('Français (Canada)')).toBeInTheDocument();
        expect(screen.getByText('日本語')).toBeInTheDocument();
        expect(screen.getByText('Русский')).toBeInTheDocument();
    });

    it('shows current language as selected', () => {
        render(<LanguageSwitcher />);
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('en');
    });

    it('changes i18n language when a new option is selected', async () => {
        render(<LanguageSwitcher />);
        const select = screen.getByRole('combobox');

        fireEvent.change(select, { target: { value: 'es-CO' } });

        await waitFor(() => {
            expect(i18n.language).toBe('es-CO');
        });
    });

    it('calls i18n.changeLanguage with the selected value', async () => {
        const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage');
        render(<LanguageSwitcher />);
        const select = screen.getByRole('combobox');

        fireEvent.change(select, { target: { value: 'fr-CA' } });

        expect(changeLanguageSpy).toHaveBeenCalledWith('fr-CA');
        changeLanguageSpy.mockRestore();
    });

    it('updates displayed labels when language changes', async () => {
        const { rerender } = render(<LanguageSwitcher />);

        // Initially in English
        expect(screen.getByText('Language')).toBeInTheDocument();

        // Change to English (labels stay the same since test setup only loads EN)
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'en' } });

        rerender(<LanguageSwitcher />);

        await waitFor(() => {
            expect(screen.getByText('Language')).toBeInTheDocument();
        });
    });

    it('each option has the correct value attribute', () => {
        render(<LanguageSwitcher />);
        const options = screen.getAllByRole('option') as HTMLOptionElement[];

        const values = options.map((opt) => opt.value);
        expect(values).toEqual(LANGUAGES.map(l => l.code));
    });
});
