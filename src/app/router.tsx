import { createBrowserRouter, Outlet } from 'react-router';
import { AdminPage } from '../features/admin/AdminPage';
import { SignInFinishPage } from '../features/auth/SignInFinishPage';
import { SignInPage } from '../features/auth/SignInPage';
import { CrewPage } from '../features/crews/CrewPage';
import { CrewsPage } from '../features/crews/CrewsPage';
import { EventsPage } from '../features/events/EventsPage';
import { CreateGroupPage } from '../features/groups/CreateGroupPage';
import { GroupHomePage } from '../features/groups/GroupHomePage';
import { JoinPage } from '../features/groups/JoinPage';
import { MyGroupsPage } from '../features/groups/MyGroupsPage';
import { SettingsPage } from '../features/groups/SettingsPage';
import { MembersPage } from '../features/members/MembersPage';
import { MePage } from '../features/profile/MePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { NotFoundPage, RouteErrorPage } from './fallbacks';
import { GroupLayout } from './GroupLayout';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/signin', element: <SignInPage /> },
      { path: '/signin/finish', element: <SignInFinishPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <MyGroupsPage /> },
          { path: '/join/:code', element: <JoinPage /> },
          { path: '/groups/new', element: <CreateGroupPage /> },
          { path: '/me', element: <MePage /> },
          {
            path: '/g/:gid',
            element: <GroupLayout />,
            children: [
              { index: true, element: <GroupHomePage /> },
              { path: 'crews', element: <CrewsPage /> },
              { path: 'crews/:cid', element: <CrewPage /> },
              { path: 'events', element: <EventsPage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'admin', element: <AdminPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
