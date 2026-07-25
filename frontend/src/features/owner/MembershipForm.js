import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Textarea from '../../components/form/Textarea';
import Checkbox from '../../components/form/Checkbox';
import Button from '../../components/form/Button';
import Loader from '../../components/page/Loader';
import CreatableSelect from 'react-select/creatable';

function MembershipForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        planType: ['Gym Access'],
        duration: '',
        durationUnit: 'Months',
        sessions: 0,
        price: '',
        description: '',
        isActive: true
    });

    useEffect(() => {
        const fetchMembership = async () => {
            try {
                const res = await apiClient.get(`/membership-plans/${id}`);
                setFormData(res.data);
            } catch (error) {
                toast.error("Failed to fetch membership details");
                navigate('/dashboard/owner/membership');
            }
        };

        if (isEditMode) {
            if (location.state?.membership) {
                setFormData(location.state.membership);
            } else {
                fetchMembership();
            }
        }
    }, [id, isEditMode, location.state, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePlanTypeChange = (selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            planType: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode) {
                await apiClient.put(`/membership-plans/${id}`, formData);
                toast.success("Membership updated successfully");
            } else {
                await apiClient.post('/membership-plans', formData);
                toast.success("Membership created successfully");
            }
            navigate('/dashboard/owner/membership');
        } catch (error) {
            toast.error(error.response?.data?.message || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return <Loader text="Loading membership details..." />;
    }

    const customStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '38px',
            borderRadius: '0.5rem',
            borderColor: state.isFocused ? '#10b981' : '#e2e8f0',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none',
            backgroundColor: '#ffffff',
            '&:hover': {
                borderColor: state.isFocused ? '#10b981' : '#cbd5e1'
            },
            fontSize: '0.875rem',
            fontWeight: '500'
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '2px 8px'
        }),
        input: (base) => ({
            ...base,
            margin: '0',
            padding: '0'
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: '#f1f5f9',
            borderRadius: '0.25rem'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#334155',
            fontSize: '0.75rem',
            fontWeight: '600'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#64748b',
            ':hover': {
                backgroundColor: '#f87171',
                color: 'white',
            },
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#1e293b',
            zIndex: 50,
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? '#ecfdf5' : '#ffffff',
            color: state.isFocused ? '#047857' : '#1e293b',
            cursor: 'pointer',
            ':active': {
                backgroundColor: '#d1fae5'
            }
        })
    };

    return (
        <PageLayout>
            <PageHeader 
                title={isEditMode ? "Edit Membership Plan" : "Add Membership Plan"}
                subtitle="Configure plan details and pricing"
                showBack={true}
            />
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <FormSection title="Plan Information" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input 
                                label="Plan Name" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                required 
                                placeholder="e.g. Annual Gold, 12 PT Sessions" 
                            />
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Plan Type</label>
                                <CreatableSelect
                                    isMulti
                                    name="planType"
                                    options={[
                                        { value: 'Gym Access', label: 'Gym Access' },
                                        { value: 'Personal Training', label: 'Personal Training' },
                                        { value: 'Classes', label: 'Classes' },
                                        { value: 'Zumba', label: 'Zumba' },
                                        { value: 'Yoga', label: 'Yoga' },
                                        { value: 'Diet Plan', label: 'Diet Plan' },
                                        { value: 'Combo', label: 'Combo' },
                                    ]}
                                    value={formData.planType.map(pt => ({ value: pt, label: pt }))}
                                    onChange={handlePlanTypeChange}
                                    styles={customStyles}
                                    classNamePrefix="react-select"
                                    placeholder="Select or type..."
                                />
                            </div>
                            <div className="col-span-1 grid grid-cols-2 gap-2">
                                <div>
                                    <Input 
                                        label="Duration" 
                                        type="number"
                                        name="duration" 
                                        value={formData.duration} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="e.g. 1" 
                                    />
                                </div>
                                <div>
                                    <Select 
                                        label="Unit"
                                        name="durationUnit"
                                        value={formData.durationUnit}
                                        onChange={handleChange}
                                        options={['Days', 'Weeks', 'Months', 'Years']}
                                    />
                                </div>
                            </div>
                            {formData.planType.some(pt => ['Personal Training', 'Classes', 'Zumba', 'Yoga', 'Combo'].includes(pt)) && (
                                <Input 
                                    label="Total Sessions (Optional)" 
                                    type="number"
                                    name="sessions" 
                                    value={formData.sessions} 
                                    onChange={handleChange} 
                                    placeholder="e.g. 12" 
                                />
                            )}
                            <Input 
                                label="Price (₹)" 
                                type="number"
                                name="price" 
                                value={formData.price} 
                                onChange={handleChange} 
                                required 
                                placeholder="e.g. 15000" 
                            />
                            <Textarea 
                                containerClassName="col-span-full"
                                label="Description"
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                rows="3"
                                placeholder="Enter plan details..."
                            />
                            <Checkbox 
                                containerClassName="col-span-full mt-2"
                                label="Active (Available for purchase)"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                            />
                        </FormSection>
                        
                        <div className="flex justify-end gap-3 w-full mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/membership')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {isEditMode ? "Update Plan" : "Save Plan"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
export default MembershipForm;
