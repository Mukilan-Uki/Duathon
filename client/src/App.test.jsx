import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';
import { AuthContext } from './context/AuthContext';

vi.mock('./services/healthService', () => ({
  getHealth: vi.fn().mockResolvedValue({ database: 'connected' }),
}));

test('renders the banking foundation home page', async () => {
  render(
    <AuthContext.Provider
      value={{ authenticated: false, initializing: false, user: null, logout: vi.fn() }}
    >
      <App />
    </AuthContext.Provider>,
    { wrapper: MemoryRouter },
  );
  expect(screen.getByRole('heading', { name: /banking infrastructure/i })).toBeInTheDocument();
  expect(await screen.findByText('online')).toBeInTheDocument();
});
