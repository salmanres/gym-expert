import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import { FiActivity } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import Loader from '../../components/page/Loader';
import ReactSelect from 'react-select';

export default function AssignMembershipForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [members, setMembers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [membershipId, setMembershipId] = useState(null);

    const [formData, setFormData] = useState({
        memberId: '',
        membershipPlanId: '',
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: '',
        totalSessions: '',
        discount: '',
        amountPaid: '',
        paidUntilDate: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [memRes, planRes] = await Promise.all([
                    apiClient.get('/members'),
                    apiClient.get('/membership-plans')
                ]);
                setMembers(memRes.data);
                setMemberships(planRes.data);

                // Pre-fill if navigated from Member details
                if (location.state?.member) {
                    const mem = location.state.member;
                    const activeMem = location.state.isRenew ? null : mem.activeMembership;
                    
                    if (activeMem) {
                        setEditMode(true);
                        setMembershipId(activeMem._id);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            membershipPlanId: activeMem.membershipPlanId ? (activeMem.membershipPlanId._id || activeMem.membershipPlanId) : '',
                            planStartDate: new Date(activeMem.startDate).toISOString().split('T')[0],
                            planEndDate: new Date(activeMem.endDate).toISOString().split('T')[0],
                            totalSessions: activeMem.totalSessions || '',
                            discount: activeMem.discount || '',
                            amountPaid: activeMem.paidAmount || '',
                            paidUntilDate: activeMem.paidUntilDate ? new Date(activeMem.paidUntilDate).toISOString().split('T')[0] : ''
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id
                        }));
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load members and plans");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.state]);

    // Auto-calculate plan end date based on selected plan and start date
    useEffect(() => {
        if (formData.membershipPlanId && formData.planStartDate && memberships.length > 0) {
            let maxEndDate = null;
            let totalAmount = 0;
            let totalSess = 0;
            
            const plan = memberships.find(p => p._id === formData.membershipPlanId);
            if (plan) {
                totalAmount = plan.price || 0;
                totalSess = plan.sessions || 0;
                
                const startDateObj = new Date(formData.planStartDate);
                let duration = parseInt(plan.duration) || 0;
                let unit = plan.durationUnit ? plan.durationUnit.toLowerCase() : 'months';
                
                if (unit.includes('month')) {
                    startDateObj.setMonth(startDateObj.getMonth() + duration);
                } else if (unit.includes('day')) {
                    startDateObj.setDate(startDateObj.getDate() + duration);
                } else if (unit.includes('year')) {
                    startDateObj.setFullYear(startDateObj.getFullYear() + duration);
                } else if (unit.includes('week')) {
                    startDateObj.setDate(startDateObj.getDate() + (duration * 7));
                }
                
                maxEndDate = startDateObj;
            }

            if (maxEndDate) {
                const maxEndDateStr = maxEndDate.toISOString().split('T')[0];
                const discountVal = Number(formData.discount) || 0;
                const finalAmt = Math.max(0, totalAmount - discountVal);
                setFormData(prev => ({ 
                    ...prev, 
                    planEndDate: maxEndDateStr,
                    amountPaid: prev.amountPaid !== '' ? prev.amountPaid : finalAmt, // Auto-fill amount if empty
                    totalSessions: prev.totalSessions || totalSess, 
                    paidUntilDate: prev.paidUntilDate || maxEndDateStr 
                }));
            }
        }
    }, [formData.membershipPlanId, formData.planStartDate, formData.discount, memberships]);

    // Proportionally calculate paidUntilDate when amountPaid changes
    useEffect(() => {
        if (formData.membershipPlanId && formData.planStartDate && formData.planEndDate) {
            let originalTotalAmount = 0;
            const plan = memberships.find(p => p._id === formData.membershipPlanId);
            if (plan) originalTotalAmount = plan.price || 0;
            const discountVal = Number(formData.discount) || 0;
            const finalTotalAmount = Math.max(0, originalTotalAmount - discountVal);

            const paid = Number(formData.amountPaid) || 0;
            
            if (paid > 0 && finalTotalAmount > 0) {
                const start = new Date(formData.planStartDate);
                const end = new Date(formData.planEndDate);
                
                // Calculate total days of the plan
                const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
                
                if (paid >= finalTotalAmount) {
                    // Full payment
                    if (formData.paidUntilDate !== formData.planEndDate) {
                        setFormData(prev => ({ ...prev, paidUntilDate: prev.planEndDate }));
                    }
                } else {
                    // Partial payment - calculate proportional days
                    const proportion = paid / finalTotalAmount;
                    const paidDays = Math.round(totalDays * proportion);
                    
                    const paidUntilObj = new Date(start);
                    paidUntilObj.setDate(paidUntilObj.getDate() + paidDays);
                    
                    const calculatedDateStr = paidUntilObj.toISOString().split('T')[0];
                    
                    if (formData.paidUntilDate !== calculatedDateStr) {
                        setFormData(prev => ({ ...prev, paidUntilDate: calculatedDateStr }));
                    }
                }
            } else if (paid === 0) {
                 if (formData.paidUntilDate !== '') {
                     setFormData(prev => ({ ...prev, paidUntilDate: '' }));
                 }
            }
        }
    }, [formData.amountPaid, formData.planStartDate, formData.planEndDate, formData.membershipPlanId, formData.discount, memberships]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, selectedOption) => {
        if (Array.isArray(selectedOption)) {
            setFormData(prev => ({ ...prev, [name]: selectedOption.map(opt => opt.value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: selectedOption ? selectedOption.value : '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.memberId || !formData.membershipPlanId) {
            toast.error("Please select a member and a membership plan.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                memberId: formData.memberId,
                membershipPlans: [formData.membershipPlanId], // Wrap in array for backend compatibility
                planStartDate: formData.planStartDate,
                planEndDate: formData.planEndDate,
                totalSessions: formData.totalSessions,
                amountPaid: formData.amountPaid,
                paidUntilDate: formData.paidUntilDate,
                discount: formData.discount
            };

            if (editMode && membershipId) {
                await apiClient.put(`/member-memberships/${membershipId}`, payload);
                toast.success("Membership updated successfully");
            } else {
                await apiClient.post('/member-memberships', payload);
                toast.success("Membership assigned successfully");
            }
            
            navigate('/dashboard/owner/membership');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to assign membership");
            setSubmitting(false);
        }
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            minHeight: '40px',
            borderRadius: '0.5rem',
            borderColor: '#e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: 'none',
            '&:hover': { borderColor: '#10b981' },
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#1e293b'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#ecfdf5' : 'transparent',
            color: state.isSelected ? 'white' : '#475569',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            ':active': { backgroundColor: '#d1fae5' }
        })
    };

    if (loading) return <Loader text="Loading assignment details..." />;

    return (
        <PageLayout>
            <PageHeader 
                title={location.state?.isRenew ? "Renew Membership" : (editMode ? "Update Membership" : "Assign Membership")} 
                subtitle={location.state?.isRenew ? "Start a new subscription cycle for this member" : (editMode ? "Edit an existing assigned subscription" : "Select a member and assign a subscription plan")} 
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <FormSection title="Assignment Details" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Member <span className="text-rose-500">*</span></label>
                                <ReactSelect
                                    options={members.map(m => ({
                                        value: m._id,
                                        label: `${m.firstName} ${m.lastName || ''}`.trim() + ` (${m.contactNumber})`
                                    }))}
                                    value={formData.memberId ? { value: formData.memberId, label: members.find(m => m._id === formData.memberId) ? `${members.find(m => m._id === formData.memberId).firstName} ${members.find(m => m._id === formData.memberId).lastName || ''}`.trim() + ` (${members.find(m => m._id === formData.memberId).contactNumber})` : 'Select...' } : null}
                                    onChange={(val) => handleSelectChange('memberId', val)}
                                    styles={customStyles}
                                    placeholder="Search Member..."
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Membership Plan <span className="text-rose-500">*</span></label>
                                <ReactSelect
                                    options={memberships.map(m => ({
                                        value: m._id,
                                        label: `${m.name} (₹${m.price} - ${m.duration} ${m.durationUnit})`
                                    }))}
                                    value={formData.membershipPlanId ? { 
                                        value: formData.membershipPlanId, 
                                        label: memberships.find(m => m._id === formData.membershipPlanId) ? 
                                            `${memberships.find(m => m._id === formData.membershipPlanId).name} (₹${memberships.find(m => m._id === formData.membershipPlanId).price})` 
                                            : '' 
                                    } : null}
                                    onChange={(val) => handleSelectChange('membershipPlanId', val)}
                                    styles={customStyles}
                                    placeholder="Search and select a plan..."
                                />
                            </div>
                            
                            <Input type="date" label="Plan Start Date" name="planStartDate" value={formData.planStartDate} onChange={handleChange} required />
                            <Input type="date" label="Plan End Date" name="planEndDate" value={formData.planEndDate} onChange={handleChange} required />
                            <Input type="number" label="Total Sessions (if applicable)" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12" />
                            
                            <Input type="number" label="Discount (₹)" name="discount" value={formData.discount} onChange={handleChange} placeholder="e.g. 1000" />
                            <Input type="number" label="Amount Paid (₹)" name="amountPaid" value={formData.amountPaid} onChange={handleChange} placeholder="e.g. 15000" />
                            
                            {Number(formData.amountPaid) > 0 && (
                                <Input containerClassName="sm:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300" type="date" label="Valid Until (Check-in Allowed Till)" name="paidUntilDate" value={formData.paidUntilDate || ''} onChange={handleChange} className="bg-emerald-50 font-bold border-emerald-200" />
                            )}
                            
                        </FormSection>

                        <div className="flex justify-end items-center gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/membership')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting}>
                                {editMode 
                                    ? 'Update Membership' 
                                    : (formData.amountPaid > 0 ? 'Assign Plan & Collect Payment' : 'Assign Plan')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
