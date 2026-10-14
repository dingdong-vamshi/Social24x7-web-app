import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppBoundary } from '../components/AppBoundary';
import { isModuleLoadError } from '../lib/moduleLoadError';
describe('stale deployment recovery', () => {
  it.each(['Failed to fetch dynamically imported module: /assets/old.js', 'Importing a module script failed.', 'Loading chunk 12 failed'])('recognizes a failed module: %s', message => expect(isModuleLoadError(new TypeError(message))).toBe(true));
  it('does not label arbitrary application failures as deployment errors', () => expect(isModuleLoadError(new Error('Permission denied'))).toBe(false));
  it('offers explicit reload without automatic draft loss or retry loops', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): never { throw new TypeError('Failed to fetch dynamically imported module'); }
    try {
      render(<AppBoundary><Broken /></AppBoundary>);
      expect(screen.getByRole('heading')).toHaveTextContent('fresh page');
      expect(screen.getByText(/not reloaded automatically/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled();
    } finally { quiet.mockRestore(); }
  });
});
