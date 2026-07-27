import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';

vi.mock('./services/healthService', () => ({
  getHealth: vi.fn().mockResolvedValue({ database: 'connected' }),
}));

test('renders the banking foundation home page', async () => {
  render(<App />, { wrapper: MemoryRouter });
  expect(screen.getByRole('heading', { name: /banking infrastructure/i })).toBeInTheDocument();
  expect(await screen.findByText('online')).toBeInTheDocument();
});
