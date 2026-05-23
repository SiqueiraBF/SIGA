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
const StockImport = lazy(() =>
  import('./pages/StockImport').then((module) => ({ default: module.StockImport })),
);
const StockRequestList = lazy(() =>
  import('./pages/StockRequestList').then((module) => ({ default: module.StockRequestList })),
);
const InvoiceConfirmation = lazy(() =>
  import('./pages/InvoiceConfirmation').then((module) => ({ default: module.InvoiceConfirmation })),
);
const InvoiceDashboard = lazy(() =>
  import('./pages/InvoiceDashboard').then((module) => ({ default: module.InvoiceDashboard })),
);
const DrainageList = lazy(() =>
  import('./pages/DrainageList').then((module) => ({ default: module.DrainageList })),
);
const AuditReceipt = lazy(() =>
  import('./pages/AuditReceipt').then((module) => ({ default: module.AuditReceipt })),
);
const CleaningList = lazy(() =>
  import('./pages/CleaningList').then((module) => ({ default: module.CleaningList })),
);
const FuelingConsistency = lazy(() =>
  import('./pages/FuelingConsistency').then((module) => ({ default: module.FuelingConsistency })),
);
const GoodsReceiptManager = lazy(() =>
  import('./pages/GoodsReceiptManager').then((module) => ({ default: module.GoodsReceiptManager })),
);
const DirectReceiptList = lazy(() =>
  import('./pages/DirectReceiptList').then((module) => ({ default: module.DirectReceiptList })),
);
const PcmRequests = lazy(() =>
  import('./pages/PcmRequests').then((module) => ({ default: module.PcmRequests })),
);
const SupplierManager = lazy(() =>
  import('./pages/SupplierManager').then((module) => ({ default: module.SupplierManager })),
);
const OutOfDeadlinePayments = lazy(() =>
  import('./pages/OutOfDeadlinePayments').then((module) => ({ default: module.OutOfDeadlinePayments })),
);
const Savings = lazy(() =>
  import('./pages/Savings').then((module) => ({ default: module.Savings })),
);
const LatePaymentsManager = lazy(() =>
  import('./pages/LatePaymentsManager').then((module) => ({ default: module.LatePaymentsManager })),
);
const UsedItemsDashboard = lazy(() =>
  import('./pages/UsedItemsDashboard').then((module) => ({ default: module.UsedItemsDashboard })),
);
const MobileLayout = lazy(() =>
  import('./components/layout/MobileLayout').then((module) => ({ default: module.MobileLayout })),
);
const MobileHome = lazy(() =>
  import('./pages/mobile/MobileHome').then((module) => ({ default: module.MobileHome })),
);
const MobileDrainage = lazy(() =>
  import('./pages/mobile/MobileDrainage').then((module) => ({ default: module.MobileDrainage })),
);
const MobileCleaning = lazy(() =>
  import('./pages/mobile/MobileCleaning').then((module) => ({ default: module.MobileCleaning })),
);
const MobileGoodsReceipt = lazy(() =>
  import('./pages/mobile/MobileGoodsReceipt').then((module) => ({ default: module.MobileGoodsReceipt })),
);
const MobileGoodsExit = lazy(() =>
  import('./pages/mobile/MobileGoodsExit').then((module) => ({ default: module.MobileGoodsExit })),
);
const MobileStockSeparation = lazy(() =>
  import('./pages/mobile/MobileStockSeparation').then((module) => ({ default: module.MobileStockSeparation })),
);
import { SyncStatusWidget } from './components/ui/SyncStatusWidget';

// Wrapper for protected routes
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoading message="Autenticando..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// Mobile Redirector Component
function DeviceRedirect({ children }: { children: ReactNode }) {
  // If window is mobile sized (tailwinds md breakpoint is 768px)
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return <Navigate to="/app" replace />;
  }

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
            <DeviceRedirect>
              <HomeDashboard />
            </DeviceRedirect>
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
        path: 'fornecedores',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <SupplierManager />
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
        path: 'estoque/importar',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <StockImport />
          </Suspense>
        ),
      },
      {
        path: 'estoque/solicitacoes',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <StockRequestList />
          </Suspense>
        ),
      },
      {
        path: 'estoque/usados',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <UsedItemsDashboard />
          </Suspense>
        ),
      },
      {
        path: 'nfs/confirmacao',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <InvoiceConfirmation />
          </Suspense>
        ),
      },
      {
        path: 'nfs/dashboard',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <InvoiceDashboard />
          </Suspense>
        ),
      },
      {
        path: 'nfs/confirmacao',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <InvoiceConfirmation />
          </Suspense>
        ),
      },
      {
        path: 'drenagem',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <DrainageList />
          </Suspense>
        ),
      },
      {
        path: 'auditoria-recebimento',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <AuditReceipt />
          </Suspense>
        ),
      },
      {
        path: 'auditoria-medicoes',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <FuelingConsistency />
          </Suspense>
        ),
      },
      {
        path: 'limpeza',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <CleaningList />
          </Suspense>
        ),
      },
      {
        path: 'recebimento',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <GoodsReceiptManager />
          </Suspense>
        ),
      },
      {
        path: 'recebimento-direto',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <DirectReceiptList />
          </Suspense>
        ),
      },
      {
        path: 'pcm-solicitacoes',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <PcmRequests />
          </Suspense>
        ),
      },
      {
        path: 'pagamentos-atrasados',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <OutOfDeadlinePayments />
          </Suspense>
        ),
      },
      {
        path: 'savings',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <Savings />
          </Suspense>
        ),
      },
      {
        path: 'registro-pagamentos-atraso',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <LatePaymentsManager />
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
    path: '/app',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<FullScreenLoading />}>
          <MobileLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <MobileHome />
          </Suspense>
        ),
      },
      {
        path: 'drenagem',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <MobileDrainage />
          </Suspense>
        ),
      },
      {
        path: 'limpeza',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <MobileCleaning />
          </Suspense>
        ),
      },
      {
        path: 'recebimento',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <MobileGoodsReceipt />
          </Suspense>
        ),
      },
      {
        path: 'saida',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <MobileGoodsExit />
          </Suspense>
        ),
      },
      {
        path: 'separacao',
        element: (
          <Suspense fallback={<FullScreenLoading />}>
            <MobileStockSeparation />
          </Suspense>
        ),
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/login" />,
  },
]);

import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <PresenceProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#334155', color: '#fff' } }} />
        <SyncStatusWidget />
        <RouterProvider router={router} />
      </PresenceProvider>
    </AuthProvider>
  );
}
