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

    const [formData, setFormData] = useState({
        memberId: '',
        membershipPlans: [],
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: '',
        totalSessions: '',
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
                    setFormData(prev => ({
                        ...prev,
                        memberId: location.state.member._id
                    }));
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

    // Auto-calculate plan end date based on selected plans and start date
    useEffect(() => {
        if (formData.membershipPlans.length > 0 && formData.planStartDate && memberships.length > 0) {
            let maxEndDate = null;
            let totalAmount = 0;
            let totalSess = 0;
            
            formData.membershipPlans.forEach(planId => {
                const plan = memberships.find(p => p._id === planId);
                if (plan) {
                    totalAmount += plan.price || 0;
                    if (plan.sessions) totalSess += plan.sessions;
                    
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
                    
                    if (!maxEndDate || startDateObj > maxEndDate) {
                        maxEndDate = startDateObj;
                    }
                }
            });

            if (maxEndDate) {
                const maxEndDateStr = maxEndDate.toISOString().split('T')[0];
                setFormData(prev => ({ 
                    ...prev, 
                    planEndDate: maxEndDateStr,
                    amountPaid: prev.amountPaid || totalAmount, // Auto-fill amount if empty
                    totalSessions: prev.totalSessions || totalSess, // Auto-fill sessions if empty
                    paidUntilDate: prev.paidUntilDate || maxEndDateStr // Auto-fill paidUntilDate to match planEndDate
                }));
            }
        }
    }, [formData.membershipPlans, formData.planStartDate, memberships]);

    // Proportionally calculate paidUntilDate when amountPaid changes
    useEffect(() => {
        if (formData.membershipPlans.length > 0 && formData.planStartDate && formData.planEndDate) {
            let totalAmount = 0;
            formData.membershipPlans.forEach(planId => {
                const plan = memberships.find(p => p._id === planId);
                if (plan) totalAmount += (plan.price || 0);
            });

            const paid = Number(formData.amountPaid) || 0;
            
            if (paid > 0 && totalAmount > 0) {
                const start = new Date(formData.planStartDate);
                const end = new Date(formData.planEndDate);
                
                // Calculate total days of the plan
                const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
                
                if (paid >= totalAmount) {
                    // Full payment
                    if (formData.paidUntilDate !== formData.planEndDate) {
                        setFormData(prev => ({ ...prev, paidUntilDate: prev.planEndDate }));
                    }
                } else {
                    // Partial payment - calculate proportional days
                    const proportion = paid / totalAmount;
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
    }, [formData.amountPaid, formData.planStartDate, formData.planEndDate, formData.membershipPlans, memberships]);

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
        
        if (!formData.memberId || formData.membershipPlans.length === 0) {
            toast.error("Please select a member and at least one membership plan.");
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.post('/member-memberships', {
                memberId: formData.memberId,
                membershipPlans: formData.membershipPlans,
                planStartDate: formData.planStartDate,
                planEndDate: formData.planEndDate,
                totalSessions: formData.totalSessions,
                amountPaid: formData.amountPaid,
                paidUntilDate: formData.paidUntilDate
            });
            
            toast.success("Membership assigned successfully");
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
                title="Assign Membership" 
                subtitle="Select a member and assign a subscription plan" 
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
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Membership Plans <span className="text-rose-500">*</span></label>
                                <ReactSelect
                                    isMulti
                                    options={memberships.map(m => ({
                                        value: m._id,
                                        label: `${m.name} (₹${m.price} - ${m.duration} ${m.durationUnit})`
                                    }))}
                                    value={formData.membershipPlans.map(id => {
                                        const m = memberships.find(p => p._id === id);
                                        return m ? { value: m._id, label: `${m.name} (₹${m.price})` } : null;
                                    }).filter(Boolean)}
                                    onChange={(val) => handleSelectChange('membershipPlans', val)}
                                    styles={customStyles}
                                    placeholder="Search and select plans..."
                                />
                            </div>
                            
                            <Input type="date" label="Plan Start Date" name="planStartDate" value={formData.planStartDate} onChange={handleChange} required />
                            <Input type="date" label="Plan End Date" name="planEndDate" value={formData.planEndDate} onChange={handleChange} required />
                            <Input type="number" label="Total Sessions (if applicable)" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12" />
                            

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
                                {formData.amountPaid > 0 ? 'Assign Plan & Collect Payment' : 'Assign Plan'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
