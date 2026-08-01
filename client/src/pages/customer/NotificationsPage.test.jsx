import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import NotificationsPage from './NotificationsPage';

const mocks = vi.hoisted(() => ({
  notifications: vi.fn(),
  readNotification: vi.fn(),
  readAllNotifications: vi.fn(),
  deleteNotification: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'employee' } }),
}));
vi.mock('../../layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../services/operationsService', () => ({ operationsService: mocks }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notifications.mockResolvedValue({
    unread: 1,
    pagination: { page: 1, pages: 1, total: 1 },
    notifications: [
      {
        _id: 'notification-1',
        title: 'Pending approval',
        message: 'A customer application needs review.',
        readAt: null,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });
  mocks.readNotification.mockResolvedValue({});
  mocks.deleteNotification.mockResolvedValue({});
});

it('renders staff notifications and supports read and soft-delete actions', async () => {
  render(<NotificationsPage />);

  expect(await screen.findByText('Pending approval')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
  await waitFor(() => expect(mocks.readNotification).toHaveBeenCalledWith('notification-1'));

  fireEvent.click(screen.getByRole('button', { name: 'Delete Pending approval' }));
  await waitFor(() => expect(mocks.deleteNotification).toHaveBeenCalledWith('notification-1'));
});
