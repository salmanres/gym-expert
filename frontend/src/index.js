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
import Leads from './features/owner/Leads';
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

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="gyms" replace />} />
            {/* SuperAdmin Routes */}
            <Route path="gyms" element={<GymsList />} />
            <Route path="register-gym" element={<RegisterGymPage />} />
            
            {/* Gym Owner Routes */}
            <Route path="owner" element={<div className="p-8 text-2xl font-bold text-slate-800">Welcome to Gym Owner Dashboard</div>} />
            <Route path="owner/leads" element={<Leads />} />
            <Route path="owner/branches" element={<div className="p-8 text-2xl font-bold text-slate-800">My Branches (Coming Soon)</div>} />
            <Route path="owner/staff" element={<div className="p-8 text-2xl font-bold text-slate-800">Staff Management (Coming Soon)</div>} />
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
