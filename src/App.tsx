import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { AppLayout } from './components/common/AppLayout';
import { AuthScreen } from './pages/AuthScreen';
import { HomeScreen } from './pages/HomeScreen';
import { ScanScreen } from './pages/ScanScreen';
import { ScanningScreen } from './pages/ScanningScreen';
import { CropAssessmentScreen } from './pages/CropAssessmentScreen';
import { ScanDetailsScreen } from './pages/ScanDetailsScreen';
import { HistoryScreen } from './pages/HistoryScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { SeasonSenseScreen } from './pages/SeasonSenseScreen';
import { FarmGuidePlanScreen } from './pages/FarmGuidePlanScreen';
import { requireEmailVerification } from './lib/firebase';
import { getSavedFarmGuideLocation } from './data/farmGuideLocationStorage';

function FarmGuideEntry() {
  const [searchParams] = useSearchParams();
  const currentQuery = searchParams.toString();
  if (currentQuery) return <Navigate to={`/farm-guide/area?${currentQuery}`} replace />;

  const savedLocation = getSavedFarmGuideLocation();
  if (!savedLocation) return <Navigate to="/farm-guide/area" replace />;
  return <Navigate to={`/farm-guide/plan?stateId=${savedLocation.stateId}&lgaId=${savedLocation.lgaId}`} replace />;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#121413]" aria-label="Loading FarmPal" />;
  return user && (!requireEmailVerification || user.emailVerified)
    ? <Outlet />
    : <Navigate to="/auth?mode=sign-in" replace />;
}

function ApplicationLayout() {
  const { user } = useAuth();
  return <AppProvider key={user?.uid ?? 'signed-out'}><AppLayout><Outlet /></AppLayout></AppProvider>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthScreen />} />
          <Route element={<ProtectedRoutes />}>
            <Route element={<ApplicationLayout />}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/scan" element={<ScanScreen />} />
              <Route path="/scanning" element={<ScanningScreen />} />
              <Route path="/assessment/:id" element={<CropAssessmentScreen />} />
              <Route path="/scan/:id" element={<ScanDetailsScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/farm-guide" element={<FarmGuideEntry />} />
              <Route path="/farm-guide/area" element={<SeasonSenseScreen />} />
              <Route path="/farm-guide/plan" element={<FarmGuidePlanScreen />} />
              <Route path="/season-sense" element={<Navigate to="/farm-guide" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
