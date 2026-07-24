import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Button from '../../components/form/Button';
import Loader from '../../components/page/Loader';
import { FiActivity } from 'react-icons/fi';

export default function AssignMembershipForm() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if we came from an 'Assign' button click which passes member details
    const preSelectedMember = location.state?.member;
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [memberships, setMemberships] = useState([]);
    const [members, setMembers] = useState([]);
    
    const [formData, setFormData] = useState({
        memberId: preSelectedMember?._id || '',
        membershipPlan: '',
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: '',
        totalSessions: '',
        paymentStatus: 'Pending',
        amountPaid: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [memRes, memberRes] = await Promise.all([
                    apiClient.get('/memberships'),
                    apiClient.get('/members')
                ]);
                setMemberships(memRes.data.filter(m => m.isActive));
                
                // Only show members who don't have an active plan or all members if needed
                setMembers(memberRes.data);
                
                setLoading(false);
            } catch (err) {
                toast.error("Failed to fetch necessary data");
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        let updates = { [name]: value };
        
        // Auto calculate end date and pre-fill details when a plan is selected or start date changes
        if (name === 'membershipPlan' || name === 'planStartDate' || name === 'amountPaid') {
            const planId = name === 'membershipPlan' ? value : formData.membershipPlan;
            const startDateStr = name === 'planStartDate' ? value : formData.planStartDate;
            const amt = name === 'amountPaid' ? value : formData.amountPaid;
            
            if (planId && startDateStr) {
                const selectedPlan = memberships.find(m => m._id === planId);
                if (selectedPlan) {
                    const start = new Date(startDateStr);
                    let end = new Date(start);
                    
                    let totalDurationDays = 0;
                    if (selectedPlan.durationUnit === 'Days') totalDurationDays = selectedPlan.duration;
                    else if (selectedPlan.durationUnit === 'Weeks') totalDurationDays = selectedPlan.duration * 7;
                    else if (selectedPlan.durationUnit === 'Months') totalDurationDays = selectedPlan.duration * 30; // Approx
                    else if (selectedPlan.durationUnit === 'Years') totalDurationDays = selectedPlan.duration * 365;
                    
                    end.setDate(end.getDate() + totalDurationDays);
                    updates.planEndDate = end.toISOString().split('T')[0];
                    
                    if (name === 'membershipPlan') {
                        updates.totalSessions = selectedPlan.sessions || '';
                    }

                    // Flexible Check-in Date Calculation based on payment
                    const amountToUse = name === 'membershipPlan' ? selectedPlan.price : (amt || 0);
                    if (name === 'membershipPlan') updates.amountPaid = amountToUse;
                    
                    if (selectedPlan.price > 0 && totalDurationDays > 0) {
                        const pricePerDay = selectedPlan.price / totalDurationDays;
                        const daysPaidFor = Math.floor(amountToUse / pricePerDay);
                        
                        let paidUntil = new Date(start);
                        paidUntil.setDate(paidUntil.getDate() + daysPaidFor);
                        updates.paidUntilDate = paidUntil.toISOString().split('T')[0];
                    } else {
                        // Free plan or error
                        updates.paidUntilDate = updates.planEndDate;
                    }
                }
            }
        }
        
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.memberId || !formData.membershipPlan) {
            toast.error("Please select a member and a membership plan.");
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.put(`/members/${formData.memberId}`, {
                membershipPlan: formData.membershipPlan,
                planStartDate: formData.planStartDate,
                planEndDate: formData.planEndDate,
                totalSessions: formData.totalSessions,
                paymentStatus: formData.paymentStatus,
                amountPaid: formData.amountPaid
            });
            toast.success("Membership assigned successfully");
            navigate('/dashboard/owner/membership');
        } catch (error) {
            toast.error("Failed to assign membership");
            setSubmitting(false);
        }
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
                <div className="w-full max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <FormSection title="Assignment Details" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            <Select 
                                label="Select Member" 
                                name="memberId" 
                                value={formData.memberId} 
                                onChange={handleChange} 
                                required
                                options={[
                                    { value: '', label: '-- Choose a Member --' },
                                    ...members.map(m => ({
                                        value: m._id,
                                        label: `${m.firstName} ${m.lastName} (${m.contactNumber})`
                                    }))
                                ]}
                            />

                            <Select 
                                label="Membership Plan" 
                                name="membershipPlan" 
                                value={formData.membershipPlan} 
                                onChange={handleChange} 
                                required
                                options={[
                                    { value: '', label: '-- Choose a Plan --' },
                                    ...memberships.map(m => ({
                                        value: m._id,
                                        label: `${m.name} (₹${m.price} - ${m.duration} ${m.durationUnit})`
                                    }))
                                ]}
                            />
                            
                            <Input type="date" label="Plan Start Date" name="planStartDate" value={formData.planStartDate} onChange={handleChange} required />
                            <Input type="date" label="Plan End Date" name="planEndDate" value={formData.planEndDate} onChange={handleChange} readOnly className="bg-slate-50 cursor-not-allowed" />
                            <Input type="number" label="Total Sessions (if applicable)" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12" />
                            
                            <Select label="Payment Status" name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} options={['Paid', 'Pending', 'Partial']} />
                            <Input type="number" label="Amount Paid (₹)" name="amountPaid" value={formData.amountPaid} onChange={handleChange} placeholder="e.g. 15000" />
                            
                            <Input containerClassName="sm:col-span-2" type="date" label="Valid Until (Check-in Allowed Till)" name="paidUntilDate" value={formData.paidUntilDate || ''} readOnly className="bg-emerald-50 text-emerald-800 font-bold border-emerald-200 cursor-not-allowed" />
                            
                        </FormSection>

                        <div className="flex justify-end items-center gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/membership')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting}>
                                Assign Plan
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
