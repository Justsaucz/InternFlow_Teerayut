import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/student/JobSearch';
import JobManagement from './pages/company/JobManagement';
import StudentProfile from './pages/student/StudentProfile';
import MyApplications from './pages/student/MyApplications';
import CompanyApplicants from './pages/company/CompanyApplicants';
import CompanyProfile from './pages/company/CompanyProfile';
import StudentLogbook from './pages/student/StudentLogbook';
import CompanyEvaluations from './pages/company/CompanyEvaluations';

import Home from './pages/Home';
import { lazy, Suspense } from 'react';
const AccountRecovery = lazy(() => import('./pages/AccountRecovery'));
const ScreeningWorkspace = lazy(() => import('./pages/ScreeningWorkspace'));

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <Router>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-emerald-800" role="status">Loading InternFlow...</div>}><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<AccountRecovery mode="forgot" />} />
          <Route path="/reset-password" element={<AccountRecovery mode="reset" />} />
          <Route path="/verify-email" element={<AccountRecovery mode="verify" />} />
          
          {/* Direct Redirections for Top-Level Links */}
          <Route path="/jobs" element={<Navigate to="/dashboard/jobs" replace />} />
          <Route path="/applications" element={<Navigate to="/dashboard/applications" replace />} />
          <Route path="/logbook" element={<Navigate to="/dashboard/logbook" replace />} />
          <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
          
          {/* Dashboard Routes with Sidebar */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="screening" element={<ScreeningWorkspace />} />
            
            {/* Student Routes */}
            <Route path="jobs" element={<JobSearch />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="logbook" element={<StudentLogbook />} />
            <Route path="profile" element={<StudentProfile />} />
            
            {/* Company Routes */}
            <Route path="jobs/manage" element={<JobManagement />} />
            <Route path="applicants" element={<CompanyApplicants />} />
            <Route path="evaluations" element={<CompanyEvaluations />} />
            <Route path="company/profile" element={<CompanyProfile />} />
          </Route>

          {/* Catch-all Wildcard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes></Suspense>
      </Router>
    </ToastProvider>
  </LanguageProvider>
  );
}

export default App;
