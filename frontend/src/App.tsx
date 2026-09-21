import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Navbar } from './components/Navbar';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BoardPage } from './pages/BoardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <main className="app-main">{children}</main>
    </>
  );
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/board"
          element={
            <RequireAuth>
              <BoardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <AnalyticsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
