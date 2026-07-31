import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import RoleProtectedRoute from './RoleProtectedRoute';

function renderRoute(auth, initialEntry = '/private', roles) {
  return render(
    <AuthContext.Provider value={{ logout: vi.fn(), ...auth }}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="/profile" element={<h1>Profile</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route element={roles ? <RoleProtectedRoute roles={roles} /> : <ProtectedRoute />}>
              <Route path="/private" element={<h1>Private banking</h1>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('preserves protected content for an authorized role', () => {
    renderRoute(
      {
        authenticated: true,
        initializing: false,
        user: { role: 'customer' },
      },
      '/private',
      ['customer'],
    );
    expect(screen.getByRole('heading', { name: 'Private banking' })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to sign in', () => {
    renderRoute({ authenticated: false, initializing: false, user: null });
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('prevents a customer from opening a staff route', () => {
    renderRoute(
      {
        authenticated: true,
        initializing: false,
        user: { role: 'customer' },
      },
      '/private',
      ['employee'],
    );
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });
});
