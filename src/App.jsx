import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import { Settings } from './pages/AllPages';
import Organizer from './pages/Organizer';
import Standings from './pages/Standings';
import Live from './pages/Live';
import Players from './pages/Players';
import Brackets from './pages/Brackets';
import Matches from './pages/Matches';

import Login from './pages/Login';

import TournamentSelect from './pages/TournamentSelect';
import { useAuth } from './hooks/useAuth.tsx';

// Protected Route Guard
const ProtectedRoute = () => {
  const { isLoading } = useAuth();
  const isAdmin = localStorage.getItem('rpo_admin') === 'true';

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

import { MatchesProvider } from './contexts/MatchesContext';
import { TournamentProvider } from './contexts/TournamentContext';

function App() {
  return (
    <TournamentProvider>
      <MatchesProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/live" replace />} />
          <Route path="/tournaments" element={<TournamentSelect />} />

          <Route element={<Layout />}>
            {/* Public View Routes (Read-Only for Guests, Edit for Admin) */}
            <Route path="live" element={<Live />} />
            <Route path="matches" element={<Matches />} />
            <Route path="brackets" element={<Brackets />} />
            <Route path="standings" element={<Standings />} />
            <Route path="players" element={<Players />} />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="organizer" element={<Organizer />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/live" replace />} />
        </Routes>
      </MatchesProvider>
    </TournamentProvider>
  );
}

export default App;
