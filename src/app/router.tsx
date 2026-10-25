import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { LoadingState, NotFoundPage, RouteErrorPage } from './fallbacks';
import { GroupLayout } from './GroupLayout';
import { RequireAuth } from './RequireAuth';

/** Route-level code splitting: each feature page is its own chunk, loaded on first visit. */
function page(load: () => Promise<ComponentType>) {
  const Page = lazy(async () => ({ default: await load() }));
  return (
    <Suspense fallback={<LoadingState />}>
      <Page />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/signin', element: page(async () => (await import('../features/auth/SignInPage')).SignInPage) },
      { path: '/signin/finish', element: page(async () => (await import('../features/auth/SignInFinishPage')).SignInFinishPage) },
      // The invite landing works signed out: it signs the visitor in inline, then joins.
      { path: '/join/:code', element: page(async () => (await import('../features/groups/JoinPage')).JoinPage) },
      // The documents the consent line names; readable before sign-in, so outside the guard.
      { path: '/legal/terms', element: page(async () => (await import('../features/legal/LegalPage')).TermsPage) },
      { path: '/legal/privacy', element: page(async () => (await import('../features/legal/LegalPage')).PrivacyPage) },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: page(async () => (await import('../features/groups/MyGroupsPage')).MyGroupsPage) },
          { path: '/groups/new', element: page(async () => (await import('../features/groups/CreateGroupPage')).CreateGroupPage) },
          { path: '/me', element: page(async () => (await import('../features/profile/MePage')).MePage) },
          {
            path: '/g/:gid',
            element: <GroupLayout />,
            children: [
              { index: true, element: page(async () => (await import('../features/groups/GroupHomePage')).GroupHomePage) },
              { path: 'crews', element: page(async () => (await import('../features/crews/CrewsPage')).CrewsPage) },
              { path: 'crews/:cid', element: page(async () => (await import('../features/crews/CrewPage')).CrewPage) },
              { path: 'events', element: page(async () => (await import('../features/events/EventsPage')).EventsPage) },
              { path: 'events/:eid', element: page(async () => (await import('../features/events/EventDetailPage')).EventDetailPage) },
              { path: 'members', element: page(async () => (await import('../features/members/MembersPage')).MembersPage) },
              { path: 'profile', element: page(async () => (await import('../features/profile/ProfilePage')).ProfilePage) },
              { path: 'settings', element: page(async () => (await import('../features/groups/SettingsPage')).SettingsPage) },
              { path: 'admin', element: page(async () => (await import('../features/admin/AdminPage')).AdminPage) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
