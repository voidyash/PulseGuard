import { useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "./lib/api";
import { currentTheme, toggleTheme } from "./lib/theme";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { PatientDetail } from "./pages/PatientDetail";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout() {
  const navigate = useNavigate();
  const signedIn = getToken() !== null;
  const [theme, setTheme] = useState(() => currentTheme());

  function signOut() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-n-100 bg-n-0 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/patients" className="text-lg font-semibold text-n-950">
            PulseGuard
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-n-600 sm:block">
              Synthetic-data prototype · clinical review support only
            </span>
            <button
              type="button"
              onClick={() => setTheme(toggleTheme(theme))}
              className="rounded-md border border-n-100 px-2.5 py-1 text-sm text-n-600 transition-colors duration-150 hover:text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            {signedIn ? (
              <button
                type="button"
                onClick={signOut}
                className="text-sm text-n-600 transition-colors duration-150 hover:text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route
          path="/patients"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <RequireAuth>
              <PatientDetail />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
