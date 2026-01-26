import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Suspense, lazy, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';
import { Layout } from './components/Layout';
import { FullScreenLoading } from './components/Loading';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const RequestList = lazy(() =>
  import('./pages/RequestList').then((module) => ({ default: module.RequestList })),
);
const RegistrarDashboard = lazy(() =>
  import('./pages/RegistrarDashboard').then((module) => ({ default: module.RegistrarDashboard })),
);
const UserManagement = lazy(() =>
  import('./pages/UserManagement').then((module) => ({ default: module.UserManagement })),
);
const FarmManagement = lazy(() =>
  import('./pages/FarmManagement').then((module) => ({ default: module.FarmManagement })),
);
const StationManagement = lazy(() =>
  import('./pages/StationManagement').then((module) => ({ default: module.StationManagement })),
);
const FuelingList = lazy(() =>
  import('./pages/FuelingList').then((module) => ({ default: module.FuelingList })),
);
const ActivityHistory = lazy(() =>
  import('./pages/ActivityHistory').then((module) => ({ default: module.ActivityHistory })),
);


// Wrapper for protected routes
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoading message="Autenticando..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

const HomeDashboard = lazy(() =>
  import('./pages/HomeDashboard').then((module) => ({ default: module.HomeDashboard })),
);

// Router Configuration
const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<FullScreenLoading message="Carregando login..." />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <HomeDashboard />
          </Suspense>
        ),
      },
      {
        path: 'solicitacoes',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <RequestList />
          </Suspense>
        ),
      },
      {
        path: 'cadastros',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <RegistrarDashboard />
          </Suspense>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <UserManagement />
          </Suspense>
        ),
      },
      {
        path: 'filiais',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <FarmManagement />
          </Suspense>
        ),
      },
      {
        path: 'postos',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <StationManagement />
          </Suspense>
        ),
      },

      {
        path: 'abastecimentos',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <FuelingList />
          </Suspense>
        ),
      },
      {
        path: 'historico',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <ActivityHistory />
          </Suspense>
        ),
      },
      {
        path: 'configuracoes',
        element: <div className="p-8">Configurações (Em Breve)</div>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" />,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <PresenceProvider>
        <RouterProvider router={router} />
      </PresenceProvider>
    </AuthProvider>
  );
}
