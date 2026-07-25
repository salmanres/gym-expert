import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import Button from '../../components/form/Button';
import { FiCreditCard, FiCheckCircle, FiClock, FiAlertCircle, FiEye } from 'react-icons/fi';

export default function Finance() {


    const [members, setMembers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Payments'); // 'Payments', 'Pending Dues', 'Transactions'
    
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterMode, setFilterMode] = useState('All');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    
    const navigate = useNavigate();

    const openPaymentModal = (m) => {
        navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: m } });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [memRes, txRes, activeRes] = await Promise.all([
                apiClient.get('/members'),
                apiClient.get('/members/transactions/all'),
                apiClient.get('/member-memberships/active')
            ]);
            
            const activeMemberships = activeRes.data;
            const membersWithPlans = memRes.data.map(member => {
                const membership = activeMemberships.find(m => m.memberId?._id === member._id);
                if (membership) {
                    member.membershipPlan = membership.membershipPlanId;
                    member.paymentStatus = membership.paymentStatus;
                    member.amountPaid = membership.paidAmount;
                    member.planStartDate = membership.startDate;
                }
                return member;
            }).filter(m => m.membershipPlan);
            
            setMembers(membersWithPlans);
            setTransactions(txRes.data);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to fetch finance records");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredMembers = members.filter(m => {
        const matchesSearch = (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) || m.contactNumber.includes(searchTerm);
        if (!matchesSearch) return false;
        
        // Apply Dropdown Filters
        if (filterStatus !== 'All' && (m.paymentStatus || 'Pending') !== filterStatus) return false;
        if (filterMode !== 'All' && (m.paymentMode || 'Cash') !== filterMode) return false;

        // Apply Date Range Filter
        if (filterStartDate || filterEndDate) {
            const dateToUse = m.paymentDate || m.planStartDate;
            if (!dateToUse) return false;
            
            const itemDate = new Date(dateToUse);
            itemDate.setHours(0,0,0,0);

            if (filterStartDate) {
                const start = new Date(filterStartDate);
                start.setHours(0,0,0,0);
                if (itemDate < start) return false;
            }
            if (filterEndDate) {
                const end = new Date(filterEndDate);
                end.setHours(23,59,59,999);
                if (itemDate > end) return false;
            }
        }

        // Apply Tab Filters
        if (activeTab === 'Pending Dues') return m.paymentStatus === 'Pending' || m.paymentStatus === 'Partial';
        return true; 
    });

    const filteredTransactions = transactions.filter(t => {
        const member = t.memberId;
        if (!member) return false;
        const matchesSearch = (member.firstName + ' ' + member.lastName).toLowerCase().includes(searchTerm.toLowerCase()) || member.contactNumber.includes(searchTerm);
        if (!matchesSearch) return false;
        
        if (filterStatus !== 'All' && (t.paymentStatus || 'Paid') !== filterStatus) return false;
        if (filterMode !== 'All' && (t.paymentMode || 'Cash') !== filterMode) return false;

        if (filterStartDate || filterEndDate) {
            const dateToUse = t.paymentDate;
            if (!dateToUse) return false;
            
            const itemDate = new Date(dateToUse);
            itemDate.setHours(0,0,0,0);

            if (filterStartDate) {
                const start = new Date(filterStartDate);
                start.setHours(0,0,0,0);
                if (itemDate < start) return false;
            }
            if (filterEndDate) {
                const end = new Date(filterEndDate);
                end.setHours(23,59,59,999);
                if (itemDate > end) return false;
            }
        }
        return true;
    });

    const columns = activeTab === 'Transactions' 
        ? [
            { label: 'Member' },
            { label: 'Date' },
            { label: 'Paid Amount' },
            { label: 'Payment Mode' },
            { label: 'Txn ID' },
            { label: 'Actions', className: 'text-center' }
        ]
        : [
            { label: 'Member' },
            { label: 'Plan Details' },
            { label: 'Amount Paid' },
            { label: 'Status' },
            { label: 'Actions', className: 'text-center' }
        ];




    const renderTransactionRow = (t) => {
        const member = t.memberId || {};
        return (
            <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                    <p className="font-bold text-slate-800 text-sm">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-slate-500">{member.contactNumber}</p>
                </td>
                <td className="py-3 px-4 text-sm text-slate-700">
                    {t.paymentDate ? new Date(t.paymentDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="py-3 px-4 text-sm font-bold text-emerald-600">
                    ₹{t.amountPaid || 0}
                </td>
                <td className="py-3 px-4 text-sm text-slate-700">
                    {t.paymentMode || 'N/A'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-700">
                    {t.transactionId || 'N/A'}
                </td>
                <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <button onClick={() => navigate(`/dashboard/owner/finance/receipt/${member._id}`)} className="w-8 h-8 rounded bg-slate-50 text-slate-600 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="View Receipt">
                            <FiEye className="text-base" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const renderRow = (m) => {
        const isPaid = m.paymentStatus === 'Paid';
        const isPartial = m.paymentStatus === 'Partial';

        return (
            <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                        {m.profilePhoto ? (
                            <img src={m.profilePhoto} alt={m.firstName} className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm border border-slate-200 shrink-0">
                                {m.firstName.charAt(0).toUpperCase()}{m.lastName ? m.lastName.charAt(0).toUpperCase() : ''}
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-slate-500">{m.contactNumber}</p>
                        </div>
                    </div>
                </td>
                <td className="py-3 px-4">
                    <p className="font-bold text-slate-700 text-sm">{m.membershipPlan?.name}</p>
                    <p className="text-[10px] text-slate-500">₹{m.membershipPlan?.price} total</p>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-emerald-600">
                    ₹{m.amountPaid || 0}
                </td>
                <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 w-max ${isPaid ? 'bg-emerald-50 text-emerald-600' : isPartial ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPaid ? <FiCheckCircle /> : isPartial ? <FiAlertCircle /> : <FiClock />}
                        {m.paymentStatus || 'Pending'}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <button onClick={() => openPaymentModal(m)} className="w-8 h-8 rounded bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors shadow-sm" title={isPaid ? 'Update Fee' : 'Collect Fee'}>
                            <FiCreditCard className="text-sm" />
                        </button>
                        {(m.amountPaid > 0 || isPaid || isPartial) && (
                            <button onClick={() => navigate(`/dashboard/owner/finance/receipt/${m._id}`)} className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="View Receipt">
                                <FiEye className="text-sm" />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <PageLayout>
            <PageHeader 
                title="Fee Management" 
                subtitle="Track and collect membership fees" 
            />
            
            <Tabs 
                tabs={['Payments', 'Pending Dues', 'Transactions']} 
                activeTab={activeTab} 
                onTabChange={(tab) => { 
                    setActiveTab(tab); 
                    setSearchTerm('');
                    setFilterStatus('All');
                    setFilterMode('All');
                    setFilterStartDate('');
                    setFilterEndDate('');
                }} 
            />

            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                searchPlaceholder="Search members by name or phone..."
            >
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm h-10 px-2 transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="text-sm focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Start Date"
                    />
                    <span className="text-slate-300 mx-2 font-medium text-xs">TO</span>
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="text-sm focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="End Date"
                    />
                </div>
                
                {activeTab === 'Payments' && (
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full sm:w-auto h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                )}

                {activeTab === 'Transactions' && (
                    <select 
                        value={filterMode} 
                        onChange={(e) => setFilterMode(e.target.value)}
                        className="w-full sm:w-auto h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm"
                    >
                        <option value="All">All Payment Modes</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Other">Other</option>
                    </select>
                )}
            </FilterBar>

            <DataTable 
                columns={columns} 
                data={activeTab === 'Transactions' ? filteredTransactions : filteredMembers} 
                loading={loading} 
                emptyMessage="No records found for the selected filter." 
                renderRow={activeTab === 'Transactions' ? renderTransactionRow : renderRow} 
            />

        </PageLayout>
    );
}
