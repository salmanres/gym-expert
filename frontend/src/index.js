import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

// Pages
import LoginPage from './features/auth/LoginPage';
import RegisterGymPage from './features/auth/RegisterGymPage';
import DashboardLayout from './features/dashboard/DashboardLayout';
import GymsList from './features/admin/GymsList';
import OwnerDashboard from './features/owner/OwnerDashboard';
import Leads from './features/owner/Leads';
import LeadForm from './features/owner/LeadForm';
import Members from './features/owner/Members';
import MemberForm from './features/owner/MemberForm';
import MembershipList from './features/owner/Membership';
import MembershipForm from './features/owner/MembershipForm';
import AssignMembershipForm from './features/owner/AssignMembershipForm';
import Finance from './features/owner/Finance';
import PaymentForm from './features/owner/PaymentForm';
import FeeReceipt from './features/owner/FeeReceipt';
import GymSettings from './features/owner/GymSettings';
import Staff from './features/owner/Staff';
import StaffForm from './features/owner/StaffForm';
import AttendanceDashboard from './features/owner/AttendanceDashboard';
import Reports from './features/owner/Reports';
import GymQRCode from './features/owner/GymQRCode';
import SelfCheckIn from './features/owner/SelfCheckIn';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Backwards compatibility or alternative direct route */}
        <Route path="/register" element={<Navigate to="/dashboard/register-gym" replace />} />

        {/* Public Routes */}
        <Route path="/checkin/:gymId" element={<SelfCheckIn />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="gyms" replace />} />
            {/* SuperAdmin Routes */}
            <Route path="gyms" element={<GymsList />} />
            <Route path="register-gym" element={<RegisterGymPage />} />
            
            {/* Gym Owner Routes */}
            <Route path="owner" element={<OwnerDashboard />} />
            <Route path="owner/leads" element={<Leads />} />
            <Route path="owner/leads/add" element={<LeadForm />} />
            <Route path="owner/leads/edit/:id" element={<LeadForm />} />
            <Route path="owner/members" element={<Members />} />
            <Route path="owner/members/add" element={<MemberForm />} />
            <Route path="owner/members/edit/:id" element={<MemberForm />} />
            <Route path="owner/membership" element={<MembershipList />} />
            <Route path="owner/membership/add" element={<MembershipForm />} />
            <Route path="owner/membership/edit/:id" element={<MembershipForm />} />
            <Route path="owner/membership/assign" element={<AssignMembershipForm />} />
            <Route path="owner/finance" element={<Finance />} />
            <Route path="owner/finance/collect" element={<PaymentForm />} />
            <Route path="owner/finance/receipt/:id" element={<FeeReceipt />} />
            <Route path="owner/attendance" element={<AttendanceDashboard />} />
            <Route path="owner/reports" element={<Reports />} />
            <Route path="owner/settings" element={<GymSettings />} />
            <Route path="owner/settings/qr" element={<GymQRCode />} />
            <Route path="owner/staff" element={<Staff />} />
            <Route path="owner/staff/add" element={<StaffForm />} />
            <Route path="owner/staff/edit/:id" element={<StaffForm />} />
            <Route path="owner/branches" element={<div className="p-8 text-2xl font-bold text-slate-800">My Branches (Coming Soon)</div>} />
        </Route>
      </Routes>
      <ToastContainer theme="dark" position="bottom-right" />
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
