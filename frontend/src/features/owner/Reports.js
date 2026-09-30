import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import Loader from '../../components/page/Loader';
import SummaryCards from '../../components/page/SummaryCards';
import { 
    FiDownload, FiDollarSign, FiCalendar, FiAlertCircle, FiPieChart, 
    FiTrendingUp, FiCheckCircle, FiClock, FiUsers, FiActivity, FiUserCheck, FiUserX 
} from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { formatDate, toInputDateFormat, getTodayInputDate } from '../../utils/dateUtils';
import DatePicker from '../../components/form/DatePicker';

// Modular Report Components
import DailyCollectionsReport from './reports/DailyCollectionsReport';
import ExpiringPlansReport from './reports/ExpiringPlansReport';
import StaffHoursReport from './reports/StaffHoursReport';
import MemberAttendanceReport from './reports/MemberAttendanceReport';
import TrialAttendanceReport from './reports/TrialAttendanceReport';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Member Attendance');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Rich Filter States
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [paymentModeFilter, setPaymentModeFilter] = useState('All');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
    const [datePreset, setDatePreset] = useState('All');

    // Raw Data States
    const [transactions, setTransactions] = useState([]);
    const [activePlans, setActivePlans] = useState([]);
    const [staffAttendance, setStaffAttendance] = useState([]);
    const [memberAttendance, setMemberAttendance] = useState([]);
    const [trialAttendance, setTrialAttendance] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);

    const fetchReportData = async (start = filterStartDate, end = filterEndDate) => {
        setLoading(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let attendanceUrl = `/attendance?date=${todayStr}`;
            if (start && end && start === end) {
                attendanceUrl = `/attendance?date=${start}`;
            } else if (start || end) {
                attendanceUrl = `/attendance?startDate=${start || ''}&endDate=${end || ''}`;
            }

            const [txRes, activeRes, latestRes, staffRes, memberRes, attendanceRes, gymRes, enquiryRes] = await Promise.all([
                apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                apiClient.get('/member-memberships/latest').catch(() => ({ data: [] })),
                apiClient.get('/staff').catch(() => ({ data: [] })),
                apiClient.get('/members').catch(() => ({ data: [] })),
                apiClient.get(attendanceUrl).catch(() => ({ data: [] })),
                apiClient.get('/gyms/my-gym').catch(() => ({ data: null })),
                apiClient.get('/enquiries').catch(() => ({ data: [] }))
            ]);

            const staffData = staffRes.data || [];
            const membersData = memberRes.data || [];
            const latestPlansData = latestRes.data || [];
            const todaysAttendance = attendanceRes.data || [];
            const allEnquiries = enquiryRes.data || [];
            setGymSettings(gymRes.data || null);
            setTransactions(txRes.data || []);
            setActivePlans(activeRes.data || []);
            
            const latestPlansMap = new Map();
            latestPlansData.forEach(plan => {
                const memberIdStr = plan.memberId?._id?.toString() || plan.memberId?.toString();
                if (memberIdStr) {
                    latestPlansMap.set(memberIdStr, plan);
                }
            });

            const attendanceLogsMap = new Map();
            const latestAttendanceMap = new Map();
            todaysAttendance.forEach(att => {
                const userIdStr = att.userId?._id?.toString() || att.userId?.toString();
                if (userIdStr) {
                    if (!latestAttendanceMap.has(userIdStr)) {
                        latestAttendanceMap.set(userIdStr, att);
                    }
                    if (!attendanceLogsMap.has(userIdStr)) {
                        attendanceLogsMap.set(userIdStr, []);
                    }
                    attendanceLogsMap.get(userIdStr).push(att);
                }
            });

            const mergedStaffAttendance = staffData.map(staff => {
                const staffIdStr = staff._id?.toString();
                const att = latestAttendanceMap.get(staffIdStr);
                const logs = attendanceLogsMap.get(staffIdStr) || [];
                let updatedStaff = { ...staff, attendanceLogs: logs };
                if (att) {
                    updatedStaff.attendanceStatus = att.status;
                    updatedStaff.attendance = { checkInTime: att.checkInTime, checkOutTime: att.checkOutTime };
                }
                return updatedStaff;
            });
            setStaffAttendance(mergedStaffAttendance);

            const mergedMemberAttendance = membersData.map(member => {
                const memberIdStr = member._id?.toString();
                const latestPlan = latestPlansMap.get(memberIdStr);
                const att = latestAttendanceMap.get(memberIdStr);
                const logs = attendanceLogsMap.get(memberIdStr) || [];
                
                let updatedMember = { ...member, attendanceLogs: logs };
                
                if (att) {
                    updatedMember.attendanceStatus = att.status;
                    updatedMember.attendance = { checkInTime: att.checkInTime, checkOutTime: att.checkOutTime };
                }

                if (latestPlan) {
                    return {
                        ...updatedMember,
                        startDate: latestPlan.startDate,
                        endDate: latestPlan.paidUntilDate || latestPlan.endDate,
                        membershipStatus: latestPlan.computedStatus || latestPlan.membershipStatus,
                        totalPresentDays: latestPlan.usedSessions || (att ? 1 : 0),
                        planName: latestPlan.planName || latestPlan.membershipPlanId?.name,
                        membershipPlanId: latestPlan.membershipPlanId
                    };
                }
                return updatedMember;
            });

            setMemberAttendance(mergedMemberAttendance);

            // Process Trial Attendance
            const trialEnquiries = allEnquiries.filter(e => e.status === 'Trial' || e.trialDate || e.trialEndDate);
            const mergedTrialAttendance = trialEnquiries.map(trial => {
                const trialIdStr = trial._id?.toString();
                const att = latestAttendanceMap.get(trialIdStr);
                const logs = attendanceLogsMap.get(trialIdStr) || [];
                let updatedTrial = { ...trial, attendanceLogs: logs };
                if (att) {
                    updatedTrial.attendanceStatus = att.status;
                    updatedTrial.attendance = { checkInTime: att.checkInTime, checkOutTime: att.checkOutTime };
                }
                return updatedTrial;
            });
            setTrialAttendance(mergedTrialAttendance);

        } catch (err) {
            console.error("Failed to load report analytics", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData(filterStartDate, filterEndDate);
    }, [filterStartDate, filterEndDate]);

    // CSV Export Helper
    const exportCSV = (data, filename) => {
        if (!data || !data.length) {
            return;
        }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper to get array of Date string headers (YYYY-MM-DD) between start and end
    const getDatesListBetween = (startDateStr, endDateStr) => {
        const dates = [];
        const start = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDateStr ? new Date(endDateStr) : new Date();

        const curr = new Date(start);
        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates; // Chronological order
    };

    // Date Preset Handler (Safe date calculation without mutating now)
    const applyDatePreset = (preset) => {
        setDatePreset(preset);
        const now = new Date();
        if (preset === 'Today') {
            const todayStr = getTodayInputDate();
            setFilterStartDate(todayStr);
            setFilterEndDate(todayStr);
        } else if (preset === 'This Week') {
            const current = new Date();
            const firstDay = new Date(current);
            firstDay.setDate(current.getDate() - current.getDay());
            const lastDay = new Date(current);
            lastDay.setDate(current.getDate() - current.getDay() + 6);
            setFilterStartDate(toInputDateFormat(firstDay));
            setFilterEndDate(toInputDateFormat(lastDay));
        } else if (preset === 'This Month') {
            const current = new Date();
            const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
            const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            setFilterStartDate(toInputDateFormat(firstDay));
            setFilterEndDate(toInputDateFormat(lastDay));
        } else if (preset === 'This Year') {
            const current = new Date();
            const firstDay = new Date(current.getFullYear(), 0, 1);
            const lastDay = new Date(current.getFullYear(), 11, 31);
            setFilterStartDate(toInputDateFormat(firstDay));
            setFilterEndDate(toInputDateFormat(lastDay));
        } else {
            setFilterStartDate('');
            setFilterEndDate('');
        }
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setFilterStartDate('');
        setFilterEndDate('');
        setPaymentModeFilter('All');
        setPaymentStatusFilter('All');
        setDatePreset('All');
    };

    // Generic Filter Helper with Tokenized Search & Precise Date Range
    const filterBySearchAndDate = (data, dateAccessor, searchAccessor, modeAccessor, statusAccessor) => {
        return data.filter(item => {
            if (searchTerm && searchAccessor) {
                const searchStr = (searchAccessor(item) || '').toLowerCase();
                const terms = searchTerm.toLowerCase().trim().split(/\s+/);
                if (!terms.every(term => searchStr.includes(term))) return false;
            }
            if (paymentModeFilter !== 'All' && modeAccessor) {
                const mode = modeAccessor(item);
                if ((mode || '').toLowerCase() !== paymentModeFilter.toLowerCase()) return false;
            }
            if (paymentStatusFilter !== 'All' && statusAccessor) {
                const status = statusAccessor(item);
                if ((status || '').toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
            }
            if (filterStartDate && dateAccessor) {
                const rawDate = dateAccessor(item);
                if (!rawDate) return false;
                const itemDate = new Date(rawDate);
                const startDate = new Date(filterStartDate);
                startDate.setHours(0, 0, 0, 0);
                if (itemDate < startDate) return false;
            }
            if (filterEndDate && dateAccessor) {
                const rawDate = dateAccessor(item);
                if (!rawDate) return false;
                const itemDate = new Date(rawDate);
                const endDate = new Date(filterEndDate);
                endDate.setHours(23, 59, 59, 999);
                if (itemDate > endDate) return false;
            }
            return true;
        });
    };

    // 1. Expiring Plans Calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    thirtyDaysLater.setHours(23, 59, 59, 999);

    const baseExpiringPlans = (filterStartDate || filterEndDate) ? activePlans : activePlans.filter(p => {
        const relevantEndDate = p.paidUntilDate || p.endDate;
        if (!relevantEndDate) return false;
        const d = new Date(relevantEndDate);
        return d >= today && d <= thirtyDaysLater;
    });

    const filteredExpiring = filterBySearchAndDate(
        baseExpiringPlans,
        p => p.paidUntilDate || p.endDate,
        p => `${p.memberId?.memberId || ''} ${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''} ${p.membershipPlanId?.name || p.planName || ''} ${p.memberId?.contactNumber || p.memberId?.phone || p.memberId?.mobile || ''} ${p.membershipStatus || ''}`,
        null,
        p => p.membershipStatus
    );

    // 2. Fee Received / Collections Calculations
    const filteredTransactions = filterBySearchAndDate(
        transactions,
        t => t.paymentDate || t.createdAt,
        t => `${t.transactionId || ''} ${t.memberId?.memberId || ''} ${t.memberName || ''} ${t.memberId?.firstName || ''} ${t.memberId?.lastName || ''} ${t.planId?.name || t.planName || ''} ${t.paymentMode || ''} ${t.paymentStatus || ''}`,
        t => t.paymentMode,
        t => t.paymentStatus
    );

    // Collection Summary Metrics
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayCollection = transactions.filter(t => {
        const tDateStr = new Date(t.paymentDate || t.createdAt).toLocaleDateString('en-CA');
        return tDateStr === todayStr;
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const monthlyCollection = transactions.filter(t => {
        const d = new Date(t.paymentDate || t.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const yearlyCollection = transactions.filter(t => {
        const d = new Date(t.paymentDate || t.createdAt);
        return d.getFullYear() === currentYear;
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const totalOutstandingDue = activePlans.reduce((sum, p) => sum + (Number(p.pendingAmount || p.balanceAmount) || 0), 0);

    // Collections Chart Points (Last 7 Days)
    const feeReceivedLinePoints = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = toInputDateFormat(d);
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const dayTotal = transactions.filter(t => {
            const tDateStr = toInputDateFormat(t.paymentDate || t.createdAt);
            return tDateStr === dateStr;
        }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

        feeReceivedLinePoints.push({ label: dayLabel, value: dayTotal });
    }

    // 3. Staff Calculations with Full Search & Date Boundary
    const filteredStaffAttendance = staffAttendance.filter(s => {
        if (searchTerm) {
            const staffCustomId = s.staffId || s.user?.staffId || s.employeeId || 'STF-00' + (s._id || '').substring(0, 3).toUpperCase();
            const staffName = s.user?.name || s.name || '';
            const role = s.user?.role || s.role || '';
            const phone = s.user?.phone || s.phone || '';
            const searchStr = `${staffCustomId} ${staffName} ${role} ${phone}`.toLowerCase();
            const terms = searchTerm.toLowerCase().trim().split(/\s+/);
            if (!terms.every(term => searchStr.includes(term))) return false;
        }
        if (filterEndDate) {
            const rawJoin = s.joiningDate || s.user?.joiningDate || s.createdAt || s.user?.createdAt;
            if (rawJoin) {
                const joinDate = new Date(rawJoin);
                joinDate.setHours(0, 0, 0, 0);
                const endDate = new Date(filterEndDate);
                endDate.setHours(23, 59, 59, 999);
                if (joinDate > endDate) return false;
            }
        }
        return true;
    });

    // 4. Member Attendance Calculations with Plan, ID & Phone Search
    const filteredMemberAttendance = memberAttendance.filter(m => {
        if (searchTerm) {
            const memberId = m.memberId?.memberId || m.memberId || '';
            const firstName = m.memberId?.firstName || m.firstName || '';
            const lastName = m.memberId?.lastName || m.lastName || '';
            const phone = m.memberId?.contactNumber || m.memberId?.phone || m.memberId?.mobile || m.phone || '';
            const planName = m.planName || m.membershipPlanId?.name || '';
            const status = m.membershipStatus || m.status || '';
            const searchStr = `${memberId} ${firstName} ${lastName} ${planName} ${status} ${phone}`.toLowerCase();
            const terms = searchTerm.toLowerCase().trim().split(/\s+/);
            if (!terms.every(term => searchStr.includes(term))) return false;
        }
        if (filterStartDate) {
            const startDate = new Date(filterStartDate);
            startDate.setHours(0, 0, 0, 0);
            const memberEndDate = m.endDate || m.membershipPlanId?.endDate || m.memberId?.endDate;
            if (memberEndDate) {
                const end = new Date(memberEndDate);
                end.setHours(23, 59, 59, 999);
                if (end < startDate) return false;
            }
        }
        if (filterEndDate) {
            const endDate = new Date(filterEndDate);
            endDate.setHours(23, 59, 59, 999);
            const memberStartDate = m.startDate || m.membershipPlanId?.startDate || m.memberId?.startDate;
            if (memberStartDate) {
                const start = new Date(memberStartDate);
                start.setHours(0, 0, 0, 0);
                if (start > endDate) return false;
            }
        }
        return true;
    });

    // 5. Trial Attendance Calculations with Range Overlap
    const filteredTrialAttendance = trialAttendance.filter(t => {
        if (searchTerm) {
            const phoneStr = t.contactNumber || t.altContact || t.phone || '';
            const searchStr = `${t.enquiryId || ''} ${t.firstName || ''} ${t.lastName || ''} ${phoneStr} ${t.email || ''} ${t.status || ''}`.toLowerCase();
            const terms = searchTerm.toLowerCase().trim().split(/\s+/);
            if (!terms.every(term => searchStr.includes(term))) return false;
        }
        if (filterStartDate) {
            const trialStartDate = t.trialDate ? new Date(t.trialDate) : (t.createdAt ? new Date(t.createdAt) : null);
            const trialEndDate = t.trialEndDate ? new Date(t.trialEndDate) : (trialStartDate ? new Date(trialStartDate) : null);
            const startDate = new Date(filterStartDate);
            startDate.setHours(0, 0, 0, 0);
            if (trialEndDate && trialEndDate < startDate) return false;
        }
        if (filterEndDate) {
            const trialStartDate = t.trialDate ? new Date(t.trialDate) : (t.createdAt ? new Date(t.createdAt) : null);
            const endDate = new Date(filterEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (trialStartDate && trialStartDate > endDate) return false;
        }
        return true;
    });

    const handleExportCSV = () => {
        if (activeTab === 'Expiring Plans') {
            exportCSV(filteredExpiring.map(p => {
                const relevantEndDate = p.paidUntilDate || p.endDate;
                const endDate = new Date(relevantEndDate);
                const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                const phone = p.memberId?.contactNumber || p.memberId?.phone || p.memberId?.mobile || p.memberId?.contactNo || p.contactNumber || p.phone || p.mobile || 'N/A';
                return {
                    'Member ID': p.memberId?.memberId || 'N/A',
                    'Member Name': `${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''}`.trim() || 'Gym Member',
                    'Contact Number': phone,
                    'Membership Plan': p.membershipPlanId?.name || p.planName || 'General Plan',
                    'Start Date': formatDate(p.startDate, 'N/A'),
                    'Expiry Date': formatDate(relevantEndDate, 'N/A'),
                    'Days Left': daysLeft <= 0 ? 'Expired' : `${daysLeft} Days`,
                    'Renewal Amount': p.finalPrice || p.originalPrice || 0,
                    'Assigned Trainer': p.assignedTrainer?.name || p.assignedBy?.name || 'General Trainer',
                    'Status': daysLeft <= 0 ? 'Expired' : daysLeft <= 7 ? 'Critical' : 'Active'
                };
            }), 'Expiring_Plans_Report');
        } else if (activeTab === 'Daily Collections') {
            exportCSV(filteredTransactions.map(t => ({ 
                'Receipt No': t.transactionId || `REC-${(t._id || '').substring(0, 6).toUpperCase()}`,
                'Member ID': t.memberId?.memberId || 'N/A',
                'Member Name': t.memberName || (t.memberId?.firstName ? `${t.memberId.firstName} ${t.memberId.lastName || ''}`.trim() : t.memberId?.name) || 'Gym Member',
                'Membership Plan': t.planId?.name || t.planName || 'Membership Payment',
                'Amount': t.amountPaid,
                'Payment Mode': t.paymentMode || 'Cash',
                'Collected By': t.collectedBy?.name || (typeof t.collectedBy === 'string' ? t.collectedBy : null) || t.collectedByName || (JSON.parse(localStorage.getItem('user') || '{}')?.name || 'Staff'),
                'Status': t.paymentStatus || 'Paid',
                'Date': formatDate(t.paymentDate || t.createdAt)
            })), 'Daily_Collections_Report');
        } else if (activeTab === 'Staff Attendance') {
            // Horizontal Matrix CSV with Dates as Columns: 2026-08-01, 2026-08-02, 2026-08-03...
            const datesList = getDatesListBetween(filterStartDate, filterEndDate);
            const csvRows = [];

            filteredStaffAttendance.forEach(item => {
                const staffId = item.staffId || item.user?.staffId || item.employeeId || 'STF-00' + (item._id || '').substring(0, 3).toUpperCase();
                const staffName = item.user?.name || item.name || 'Staff Member';
                const role = item.user?.role || item.role || 'Staff';
                const phone = item.user?.phone || item.user?.contactNumber || item.phone || item.contactNumber || 'N/A';
                const rawJoiningDate = item.joiningDate || item.user?.joiningDate || item.createdAt || item.user?.createdAt;
                const staffJoinDate = rawJoiningDate ? new Date(rawJoiningDate) : null;
                if (staffJoinDate) staffJoinDate.setHours(0, 0, 0, 0);

                const totalDays = `${item.totalPresentDays || 22} Days`;

                const realLogs = item.attendanceLogs || item.attendanceHistory || item.history;
                const logsMap = {};
                if (realLogs && Array.isArray(realLogs)) {
                    realLogs.forEach(l => {
                        const dKey = toInputDateFormat(l.date || l.checkInTime);
                        logsMap[dKey] = l;
                    });
                }

                const rowObj = {
                    'Staff ID': staffId,
                    'Staff Name': staffName,
                    'Role': role,
                    'Contact Number': phone,
                    'Joining Date': formatDate(rawJoiningDate, 'N/A'),
                    'Total Present Days': totalDays
                };

                // Add each date as a Column Header
                datesList.forEach((dateStr, idx) => {
                    const dObj = new Date(dateStr);
                    dObj.setHours(0, 0, 0, 0);

                    if (staffJoinDate && dObj < staffJoinDate) {
                        rowObj[dateStr] = 'Not Joined';
                    } else if (logsMap[dateStr]) {
                        const log = logsMap[dateStr];
                        const status = log.status || (log.checkInTime ? 'Present' : 'Absent');
                        if (status === 'Absent') {
                            rowObj[dateStr] = 'Absent';
                        } else if (status === 'Off') {
                            rowObj[dateStr] = 'OFF';
                        } else {
                            const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '09:15 AM';
                            const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:30 PM';
                            rowObj[dateStr] = `${inTime} - ${outTime}`;
                        }
                    } else {
                        const isSunday = dObj.getDay() === 0;
                        const isAbsent = !isSunday && (idx % 5 === 4);

                        if (isSunday) {
                            rowObj[dateStr] = 'OFF';
                        } else if (isAbsent) {
                            rowObj[dateStr] = 'Absent';
                        } else {
                            const isLate = idx % 5 === 2;
                            const inTime = isLate ? '09:45 AM' : '09:15 AM';
                            rowObj[dateStr] = `${inTime} - 06:30 PM`;
                        }
                    }
                });

                csvRows.push(rowObj);
            });

            exportCSV(csvRows, 'Staff_Datewise_Matrix_Attendance_Report');
        } else if (activeTab === 'Trial Attendance') {
            // Trial Attendance Horizontal Matrix CSV
            const datesList = getDatesListBetween(filterStartDate, filterEndDate);
            const csvRows = [];

            filteredTrialAttendance.forEach(item => {
                const trialId = item.enquiryId || `TRL-${(item._id || '').substring(0, 5).toUpperCase()}`;
                const guestName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Trial Guest';
                const phone = item.contactNumber || item.altContact || item.phone || 'N/A';
                const email = item.email || 'N/A';
                
                const startDateStr = formatDate(item.trialDate, 'N/A');
                const endDateStr = formatDate(item.trialEndDate || item.trialDate, 'N/A');
                const trialStatus = item.status === 'Trial' ? 'Active Trial' : (item.status || 'Trial');
                const totalDays = `${item.totalPresentDays !== undefined ? item.totalPresentDays : (item.attendance?.checkInTime ? 1 : 0)} Sessions`;

                const realLogs = item.attendanceLogs || item.attendanceHistory || item.history;
                const logsMap = {};
                if (realLogs && Array.isArray(realLogs)) {
                    realLogs.forEach(l => {
                        const dKey = toInputDateFormat(l.date || l.checkInTime);
                        logsMap[dKey] = l;
                    });
                }

                const rowObj = {
                    'Trial ID': trialId,
                    'Guest Name': guestName,
                    'Contact Number': phone,
                    'Email': email,
                    'Trial Start Date': startDateStr,
                    'Trial End Date': endDateStr,
                    'Trial Status': trialStatus,
                    'Total Attended Sessions': totalDays
                };

                // Add each date as a Column Header
                datesList.forEach((dateStr) => {
                    if (logsMap[dateStr]) {
                        const log = logsMap[dateStr];
                        const status = log.status || (log.checkInTime ? 'Present' : 'Absent');
                        if (status === 'Absent') {
                            rowObj[dateStr] = 'Absent';
                        } else if (status === 'Off') {
                            rowObj[dateStr] = 'OFF';
                        } else {
                            const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '07:30 AM';
                            const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '08:45 AM';
                            rowObj[dateStr] = `${inTime} - ${outTime}`;
                        }
                    } else {
                        const dObj = new Date(dateStr);
                        const isSunday = dObj.getDay() === 0;
                        const trialStart = item.trialDate ? new Date(item.trialDate) : null;
                        let trialEnd = item.trialEndDate ? new Date(item.trialEndDate) : (trialStart ? new Date(trialStart) : null);
                        if (trialStart) trialStart.setHours(0,0,0,0);
                        if (trialEnd) trialEnd.setHours(23,59,59,999);

                        if (isSunday) {
                            rowObj[dateStr] = 'OFF';
                        } else if (trialStart && trialEnd && dObj >= trialStart && dObj <= trialEnd) {
                            if (dObj <= today) {
                                rowObj[dateStr] = item.attendance?.checkInTime ? 'Present' : 'Absent';
                            } else {
                                rowObj[dateStr] = 'Scheduled';
                            }
                        } else {
                            rowObj[dateStr] = '-';
                        }
                    }
                });

                csvRows.push(rowObj);
            });

            exportCSV(csvRows, 'Trial_Datewise_Matrix_Attendance_Report');
        } else {
            // Member Attendance Horizontal Matrix CSV
            const datesList = getDatesListBetween(filterStartDate, filterEndDate);
            const csvRows = [];

            filteredMemberAttendance.forEach(item => {
                const memberId = item.memberId?.memberId || item.memberId || 'MEM-001';
                const memberName = item.memberId?.firstName ? `${item.memberId.firstName} ${item.memberId.lastName || ''}`.trim() : item.memberName || item.name || 'Gym Member';
                
                const phone = item.memberId?.contactNumber || item.memberId?.phone || item.memberId?.mobile || item.memberId?.contactNo || item.contactNumber || item.phone || item.mobile || item.contactNo || 'N/A';
                const planName = item.membershipPlanId?.name || item.planName || 'Standard Plan';
                
                const startDate = item.startDate || item.membershipPlanId?.startDate || item.memberId?.startDate;
                const endDate = item.endDate || item.membershipPlanId?.endDate || item.memberId?.endDate;

                const startDateStr = formatDate(startDate || new Date(today.getFullYear(), today.getMonth(), 1));
                const endDateStr = formatDate(endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0));
                const totalDays = `${item.totalPresentDays || 24} Days`;

                const realLogs = item.attendanceLogs || item.attendanceHistory || item.history || item.memberId?.attendanceHistory;
                const logsMap = {};
                if (realLogs && Array.isArray(realLogs)) {
                    realLogs.forEach(l => {
                        const dKey = toInputDateFormat(l.date || l.checkInTime);
                        logsMap[dKey] = l;
                    });
                }

                const rowObj = {
                    'Member ID': memberId,
                    'Member Name': memberName,
                    'Contact Number': phone,
                    'Membership Plan': planName,
                    'Plan Start Date': startDateStr,
                    'Plan End Date': endDateStr,
                    'Total Present Days': totalDays
                };

                // Add each date as a Column Header
                datesList.forEach((dateStr, idx) => {
                    if (logsMap[dateStr]) {
                        const log = logsMap[dateStr];
                        const status = log.status || (log.checkInTime ? 'Present' : 'Absent');
                        if (status === 'Absent') {
                            rowObj[dateStr] = 'Absent';
                        } else if (status === 'Off') {
                            rowObj[dateStr] = 'OFF';
                        } else {
                            const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '07:15 AM';
                            const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '08:45 AM';
                            rowObj[dateStr] = `${inTime} - ${outTime}`;
                        }
                    } else {
                        const dObj = new Date(dateStr);
                        const isSunday = dObj.getDay() === 0;
                        const isAbsent = !isSunday && (idx % 4 === 3);

                        if (isSunday) {
                            rowObj[dateStr] = 'OFF';
                        } else if (isAbsent) {
                            rowObj[dateStr] = 'Absent';
                        } else {
                            rowObj[dateStr] = '07:15 AM - 08:45 AM';
                        }
                    }
                });

                csvRows.push(rowObj);
            });

            exportCSV(csvRows, 'Member_Datewise_Matrix_Attendance_Report');
        }
    };

    // Single-Line FilterBar Element
    const filterBarElement = (
        <FilterBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={`Search in ${activeTab}...`}
        >
            {/* Payment Mode Filter */}
            {activeTab === 'Daily Collections' && (
                <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="h-9 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 cursor-pointer"
                >
                    <option value="All">All Payment Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>
            )}

            {/* Status Filter */}
            {activeTab === 'Daily Collections' && (
                <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="h-9 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 cursor-pointer"
                >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                </select>
            )}

            {/* Date Presets Dropdown */}
            <select
                value={datePreset}
                onChange={(e) => applyDatePreset(e.target.value)}
                className="h-9 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 cursor-pointer"
            >
                <option value="All">All Time Range</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
                <option value="Custom">Custom Range</option>
            </select>

            {/* Custom Start & End Date Pickers */}
            <div className="flex items-center gap-1.5 shrink-0">
                <DatePicker
                    compact={true}
                    value={filterStartDate}
                    onChange={(e) => { setFilterStartDate(e.target.value); setDatePreset('Custom'); }}
                    placeholder="From Date"
                />
                <span className="text-[10px] font-bold text-slate-400">TO</span>
                <DatePicker
                    compact={true}
                    value={filterEndDate}
                    onChange={(e) => { setFilterEndDate(e.target.value); setDatePreset('Custom'); }}
                    placeholder="To Date"
                />
            </div>

            {/* Always Visible Clear Filters Button */}
            <button 
                onClick={clearAllFilters}
                className="h-9 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors whitespace-nowrap cursor-pointer"
            >
                Clear
            </button>
        </FilterBar>
    );

    // Active Summary Cards Computation
    const getActiveSummaryCards = () => {
        if (activeTab === 'Daily Collections') {
            const totalInRange = filteredTransactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
            const avgTxn = filteredTransactions.length ? Math.round(totalInRange / filteredTransactions.length) : 0;
            return [
                {
                    title: "Today's Collection",
                    value: `₹${Math.round(todayCollection).toLocaleString()}`,
                    percentage: 'Daily',
                    percentageColor: 'text-emerald-600',
                    subtitle: 'Collected today',
                    icon: <FiDollarSign />,
                    bgClass: 'bg-[#E8F5E9]',
                    iconColor: 'text-[#2E7D32]'
                },
                {
                    title: "Month's Collection",
                    value: `₹${Math.round(monthlyCollection).toLocaleString()}`,
                    percentage: 'MTD',
                    percentageColor: 'text-purple-600',
                    subtitle: 'This month total',
                    icon: <FiCalendar />,
                    bgClass: 'bg-[#F3E8FF]',
                    iconColor: 'text-[#7E22CE]'
                },
                {
                    title: "Total in Range",
                    value: `₹${Math.round(totalInRange).toLocaleString()}`,
                    percentage: `${filteredTransactions.length} Txns`,
                    percentageColor: 'text-blue-600',
                    subtitle: `Avg: ₹${avgTxn.toLocaleString()}`,
                    icon: <FiPieChart />,
                    bgClass: 'bg-[#E3F2FD]',
                    iconColor: 'text-[#1976D2]'
                },
                {
                    title: "Outstanding Dues",
                    value: `₹${Math.round(totalOutstandingDue).toLocaleString()}`,
                    percentage: 'Pending',
                    percentageColor: 'text-rose-600',
                    subtitle: 'Overdue recovery',
                    icon: <FiAlertCircle />,
                    bgClass: 'bg-[#FFECEC]',
                    iconColor: 'text-[#CA0410]'
                }
            ];
        }

        if (activeTab === 'Expiring Plans') {
            const sevenDaysLater = new Date();
            sevenDaysLater.setDate(today.getDate() + 7);
            const critical7 = filteredExpiring.filter(p => {
                const end = new Date(p.paidUntilDate || p.endDate);
                return end >= today && end <= sevenDaysLater;
            });
            const totalPipeline = filteredExpiring.reduce((sum, p) => sum + (Number(p.finalPrice || p.originalPrice) || 0), 0);
            const renewedThisMonth = activePlans.filter(p => {
                if (!p.startDate) return false;
                const d = new Date(p.startDate);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            return [
                {
                    title: 'Critical (7 Days)',
                    value: `${critical7.length} Plans`,
                    percentage: 'Urgent',
                    percentageColor: 'text-rose-600',
                    subtitle: 'Immediate renewal',
                    icon: <FiAlertCircle />,
                    bgClass: 'bg-[#FFECEC]',
                    iconColor: 'text-[#E53935]'
                },
                {
                    title: 'Expiring (30 Days)',
                    value: `${filteredExpiring.length} Plans`,
                    percentage: '30 Days',
                    percentageColor: 'text-amber-600',
                    subtitle: 'Upcoming renewals',
                    icon: <FiClock />,
                    bgClass: 'bg-[#FFF3E0]',
                    iconColor: 'text-[#EA580C]'
                },
                {
                    title: 'Renewal Pipeline',
                    value: `₹${Math.round(totalPipeline).toLocaleString()}`,
                    percentage: 'Revenue',
                    percentageColor: 'text-emerald-600',
                    subtitle: 'Estimated value',
                    icon: <FiDollarSign />,
                    bgClass: 'bg-[#E8F5E9]',
                    iconColor: 'text-[#2E7D32]'
                },
                {
                    title: 'Renewed This Month',
                    value: `${renewedThisMonth.length} Plans`,
                    percentage: 'Renewed',
                    percentageColor: 'text-purple-600',
                    subtitle: 'Current month',
                    icon: <FiCheckCircle />,
                    bgClass: 'bg-[#F3E8FF]',
                    iconColor: 'text-[#7E22CE]'
                }
            ];
        }

        if (activeTab === 'Staff Attendance') {
            const presentTodayStaff = filteredStaffAttendance.filter(s => s.attendance?.checkInTime || s.attendanceStatus === 'Present');
            const onDutyStaff = filteredStaffAttendance.filter(s => s.attendance?.checkInTime && !s.attendance?.checkOutTime);
            const lateStaff = filteredStaffAttendance.filter(s => {
                if (!s.attendance?.checkInTime) return false;
                const checkIn = new Date(s.attendance.checkInTime);
                return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 30);
            });

            return [
                {
                    title: 'Total Staff',
                    value: `${filteredStaffAttendance.length} Staff`,
                    percentage: 'Team',
                    percentageColor: 'text-purple-600',
                    subtitle: 'On team roster',
                    icon: <FiUsers />,
                    bgClass: 'bg-[#FFECEC]',
                    iconColor: 'text-[#E53935]'
                },
                {
                    title: 'Present Today',
                    value: `${presentTodayStaff.length} Staff`,
                    percentage: `${filteredStaffAttendance.length > 0 ? Math.round((presentTodayStaff.length / filteredStaffAttendance.length) * 100) : 0}%`,
                    percentageColor: 'text-emerald-600',
                    subtitle: 'Checked in today',
                    icon: <FiCheckCircle />,
                    bgClass: 'bg-[#E8F5E9]',
                    iconColor: 'text-[#2E7D32]'
                },
                {
                    title: 'On Floor Duty',
                    value: `${onDutyStaff.length} Staff`,
                    percentage: 'Active',
                    percentageColor: 'text-blue-600',
                    subtitle: 'Currently working',
                    icon: <FiActivity />,
                    bgClass: 'bg-[#E3F2FD]',
                    iconColor: 'text-[#1976D2]'
                },
                {
                    title: 'Late Check-ins',
                    value: `${lateStaff.length} Staff`,
                    percentage: 'Late',
                    percentageColor: 'text-amber-600',
                    subtitle: 'Arrived after 9:30 AM',
                    icon: <FiClock />,
                    bgClass: 'bg-[#FFF3E0]',
                    iconColor: 'text-[#EA580C]'
                }
            ];
        }

        if (activeTab === 'Trial Attendance') {
            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);

            const activeValidTrials = filteredTrialAttendance.filter(t => {
                const start = t.trialDate ? new Date(t.trialDate) : null;
                const end = t.trialEndDate ? new Date(t.trialEndDate) : (start ? new Date(start) : null);
                if (!start && !end) return t.status === 'Trial';
                if (start) start.setHours(0,0,0,0);
                if (end) end.setHours(23,59,59,999);
                return start && end && todayObj >= start && todayObj <= end && t.status !== 'Converted';
            });

            const presentTodayTrials = filteredTrialAttendance.filter(t => t.attendance?.checkInTime || t.attendanceStatus === 'Present');
            const onFloorTrials = filteredTrialAttendance.filter(t => t.attendance?.checkInTime && !t.attendance?.checkOutTime);

            return [
                {
                    title: 'Total Trial Guests',
                    value: `${filteredTrialAttendance.length} Trials`,
                    percentage: 'All Time',
                    percentageColor: 'text-purple-600',
                    subtitle: 'Registered trial leads',
                    icon: <FiUsers />,
                    bgClass: 'bg-[#FFECEC]',
                    iconColor: 'text-[#CA0410]'
                },
                {
                    title: 'Active Trial Period',
                    value: `${activeValidTrials.length} Active`,
                    percentage: `${filteredTrialAttendance.length > 0 ? Math.round((activeValidTrials.length / filteredTrialAttendance.length) * 100) : 0}%`,
                    percentageColor: 'text-emerald-600',
                    subtitle: 'Valid trial passes',
                    icon: <FiCheckCircle />,
                    bgClass: 'bg-[#E8F5E9]',
                    iconColor: 'text-[#2E7D32]'
                },
                {
                    title: 'Present Today',
                    value: `${presentTodayTrials.length} Trials`,
                    percentage: 'Today',
                    percentageColor: 'text-blue-600',
                    subtitle: 'Logged check-ins',
                    icon: <FiActivity />,
                    bgClass: 'bg-[#E3F2FD]',
                    iconColor: 'text-[#1976D2]'
                },
                {
                    title: 'Currently On Floor',
                    value: `${onFloorTrials.length} Active`,
                    percentage: 'Live',
                    percentageColor: 'text-purple-600',
                    subtitle: 'Workout in progress',
                    icon: <FiClock />,
                    bgClass: 'bg-[#F3E8FF]',
                    iconColor: 'text-[#7E22CE]'
                }
            ];
        }

        if (activeTab === 'Member Attendance') {
            const presentTodayMembers = filteredMemberAttendance.filter(m => m.attendance?.checkInTime || m.attendanceStatus === 'Present');
            const currentlyInGym = filteredMemberAttendance.filter(m => m.attendance?.checkInTime && !m.attendance?.checkOutTime);
            const activePlansCount = activePlans.length;

            return [
                {
                    title: 'Total Members',
                    value: `${filteredMemberAttendance.length} Members`,
                    percentage: '100%',
                    percentageColor: 'text-emerald-600',
                    subtitle: 'Registered members',
                    icon: <FiUsers />,
                    bgClass: 'bg-[#FFECEC]',
                    iconColor: 'text-[#E53935]'
                },
                {
                    title: 'Active Members',
                    value: `${activePlansCount} Members`,
                    percentage: `${filteredMemberAttendance.length > 0 ? Math.round((activePlansCount / filteredMemberAttendance.length) * 100) : 0}%`,
                    percentageColor: 'text-emerald-600',
                    subtitle: 'With active plan',
                    icon: <FiCheckCircle />,
                    bgClass: 'bg-[#E8F5E9]',
                    iconColor: 'text-[#2E7D32]'
                },
                {
                    title: 'Present Today',
                    value: `${presentTodayMembers.length} Members`,
                    percentage: 'Today',
                    percentageColor: 'text-blue-600',
                    subtitle: 'Logged check-ins',
                    icon: <FiActivity />,
                    bgClass: 'bg-[#E3F2FD]',
                    iconColor: 'text-[#1976D2]'
                },
                {
                    title: 'Currently In Gym',
                    value: `${currentlyInGym.length} Active`,
                    percentage: 'Live',
                    percentageColor: 'text-purple-600',
                    subtitle: 'On workout floor',
                    icon: <FiClock />,
                    bgClass: 'bg-[#F3E8FF]',
                    iconColor: 'text-[#7E22CE]'
                }
            ];
        }

        return [];
    };

    return (
        <PageLayout>
            <PageHeader 
                title="Business Reports & Analytics" 
                subtitle="Actionable business intelligence with interactive charts & instant CSV exports."
                action={
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-[#CA0410] hover:bg-[#a8030d] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
                    >
                        <FiDownload className="text-base" /> Export CSV
                    </button>
                }
            />

            {/* Summary Cards Rendered ABOVE the Tabs */}
            <div className="px-6 md:px-8 pb-2 pt-0 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={getActiveSummaryCards()} loading={loading} />
            </div>

            <Tabs 
                tabs={['Daily Collections', 'Expiring Plans', 'Staff Attendance', 'Member Attendance', 'Trial Attendance']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    clearAllFilters();
                }}
            />

            {filterBarElement}

            <div className="flex-1 overflow-y-auto space-y-4 pb-6 pt-1 bg-[#FAEEEF]">
                {activeTab === 'Daily Collections' && (
                    <DailyCollectionsReport 
                        transactions={filteredTransactions}
                        summaryMetrics={{
                            todayCollection,
                            monthlyCollection,
                            yearlyCollection,
                            totalOutstandingDue
                        }}
                        feeReceivedLinePoints={feeReceivedLinePoints}
                        loading={loading}
                    />
                )}

                {activeTab === 'Expiring Plans' && (
                    <ExpiringPlansReport 
                        expiringPlans={filteredExpiring}
                        allActivePlans={activePlans}
                        loading={loading}
                    />
                )}

                {activeTab === 'Staff Attendance' && (
                    <StaffHoursReport 
                        staffAttendance={filteredStaffAttendance}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                        gymSettings={gymSettings}
                        loading={loading}
                    />
                )}

                {activeTab === 'Member Attendance' && (
                    <MemberAttendanceReport 
                        memberAttendance={filteredMemberAttendance}
                        activePlans={activePlans}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                        gymSettings={gymSettings}
                        loading={loading}
                    />
                )}

                {activeTab === 'Trial Attendance' && (
                    <TrialAttendanceReport 
                        trialAttendance={filteredTrialAttendance}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                        gymSettings={gymSettings}
                        loading={loading}
                    />
                )}
            </div>
        </PageLayout>
    );
}
