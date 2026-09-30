import React, { useState, useEffect, useMemo } from 'react';
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

    /*
    |--------------------------------------------------------------------------
    | PLAN TYPE OPTIONS
    |--------------------------------------------------------------------------
    */

    const planTypeOptions = [
        {
            value: 'Gym Access',
            label: 'Gym Access'
        },
        {
            value: 'Personal Training',
            label: 'Personal Training'
        },
        {
            value: 'Classes',
            label: 'Classes'
        },
        {
            value: 'Zumba',
            label: 'Zumba'
        },
        {
            value: 'Yoga',
            label: 'Yoga'
        },
        {
            value: 'Diet Plan',
            label: 'Diet Plan'
        },
        {
            value: 'Combo',
            label: 'Combo'
        }
    ];

    /*
    |--------------------------------------------------------------------------
    | FETCH MEMBERSHIP
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const fetchMembership = async () => {
            try {
                setLoading(true);

                const res =
                    await apiClient.get(
                        `/membership-plans/${id}`
                    );

                const membership =
                    res.data || {};

                setFormData({
                    name:
                        membership.name || '',

                    planType:
                        Array.isArray(
                            membership.planType
                        ) && membership.planType.length > 0
                            ? membership.planType
                            : ['Gym Access'],

                    duration:
                        membership.duration ?? '',

                    durationUnit:
                        membership.durationUnit ||
                        'Months',

                    sessions:
                        membership.sessions ?? 0,

                    price:
                        membership.price ?? '',

                    description:
                        membership.description || '',

                    isActive:
                        membership.isActive !== false
                });

            } catch (error) {

                console.error(
                    'Failed to fetch membership:',
                    error
                );

                toast.error(
                    "Failed to fetch membership details"
                );

                navigate(
                    '/dashboard/owner/membership'
                );

            } finally {

                setLoading(false);
            }
        };

        if (isEditMode) {

            if (location.state?.membership) {

                const membership =
                    location.state.membership;

                setFormData({
                    name:
                        membership.name || '',

                    planType:
                        Array.isArray(
                            membership.planType
                        ) && membership.planType.length > 0
                            ? membership.planType
                            : ['Gym Access'],

                    duration:
                        membership.duration ?? '',

                    durationUnit:
                        membership.durationUnit ||
                        'Months',

                    sessions:
                        membership.sessions ?? 0,

                    price:
                        membership.price ?? '',

                    description:
                        membership.description || '',

                    isActive:
                        membership.isActive !== false
                });

            } else {

                fetchMembership();
            }
        }

    }, [
        id,
        isEditMode,
        location.state,
        navigate
    ]);

    /*
    |--------------------------------------------------------------------------
    | INPUT CHANGE
    |--------------------------------------------------------------------------
    */

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setFormData(prev => ({
            ...prev,

            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | PLAN TYPE CHANGE
    |--------------------------------------------------------------------------
    */

    const handlePlanTypeChange = (
        selectedOptions
    ) => {

        const selectedTypes =
            selectedOptions
                ? selectedOptions.map(
                    option => option.value
                )
                : [];

        setFormData(prev => ({
            ...prev,
            planType: selectedTypes,

            /*
            |--------------------------------------------------------------------------
            | RESET SESSIONS FOR NON-SESSION PLANS
            |--------------------------------------------------------------------------
            */

            sessions:
                selectedTypes.some(
                    type =>
                        isSessionBasedPlanType(
                            type
                        )
                )
                    ? prev.sessions
                    : 0
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | SESSION-BASED PLAN DETECTION
    |--------------------------------------------------------------------------
    */

    const isSessionBasedPlanType = (
        planType
    ) => {

        const normalized =
            String(
                planType || ''
            )
                .trim()
                .toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | PERSONAL TRAINING
        |--------------------------------------------------------------------------
        */

        if (
            normalized ===
                'personal training' ||
            normalized === 'pt' ||
            normalized.includes(
                'personal training'
            ) ||
            /\bpt\b/.test(normalized)
        ) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | GROUP / CLASS PLANS
        |--------------------------------------------------------------------------
        */

        return [
            'classes',
            'zumba',
            'yoga',
            'combo'
        ].includes(normalized);
    };

    /*
    |--------------------------------------------------------------------------
    | IS PT PLAN
    |--------------------------------------------------------------------------
    */

    const isPTPlan = useMemo(() => {

        return (
            Array.isArray(
                formData.planType
            ) &&
            formData.planType.some(
                type => {

                    const normalized =
                        String(
                            type || ''
                        )
                            .trim()
                            .toLowerCase();

                    return (
                        normalized ===
                            'personal training' ||
                        normalized === 'pt' ||
                        normalized.includes(
                            'personal training'
                        ) ||
                        /\bpt\b/.test(normalized)
                    );
                }
            )
        );

    }, [
        formData.planType
    ]);

    /*
    |--------------------------------------------------------------------------
    | HAS SESSION LIMIT
    |--------------------------------------------------------------------------
    */

    const hasSessionLimit =
        useMemo(() => {

            return (
                Array.isArray(
                    formData.planType
                ) &&
                formData.planType.some(
                    type =>
                        isSessionBasedPlanType(
                            type
                        )
                )
            );

        }, [
            formData.planType
        ]);

    /*
    |--------------------------------------------------------------------------
    | SUBMIT
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (e) => {

        e.preventDefault();

        /*
        |--------------------------------------------------------------------------
        | BASIC VALIDATION
        |--------------------------------------------------------------------------
        */

        if (
            !formData.name.trim()
        ) {

            toast.error(
                "Please enter plan name."
            );

            return;
        }

        if (
            !formData.planType ||
            formData.planType.length === 0
        ) {

            toast.error(
                "Please select at least one plan type."
            );

            return;
        }

        if (
            formData.duration === '' ||
            Number(formData.duration) <= 0
        ) {

            toast.error(
                "Please enter a valid duration."
            );

            return;
        }

        if (
            formData.price === '' ||
            Number(formData.price) < 0
        ) {

            toast.error(
                "Please enter a valid price."
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | SESSION VALIDATION
        |--------------------------------------------------------------------------
        */

        if (hasSessionLimit) {

            if (
                formData.sessions === '' ||
                Number(formData.sessions) < 0
            ) {

                toast.error(
                    "Please enter a valid session limit."
                );

                return;
            }
        }

        setLoading(true);

        try {

            const payload = {

                name:
                    formData.name.trim(),

                planType:
                    formData.planType,

                duration:
                    Number(
                        formData.duration
                    ),

                durationUnit:
                    formData.durationUnit,

                /*
                |--------------------------------------------------------------------------
                | SESSIONS
                |--------------------------------------------------------------------------
                |
                | PT / Class / Zumba / Yoga / Combo:
                | use entered session limit.
                |
                | Normal Gym Access / Diet Plan:
                | 0 = no session limit.
                |
                */

                sessions:
                    hasSessionLimit
                        ? Number(
                            formData.sessions
                        ) || 0
                        : 0,

                price:
                    Number(
                        formData.price
                    ),

                description:
                    formData.description?.trim() ||
                    '',

                isActive:
                    Boolean(
                        formData.isActive
                    )
            };

            if (isEditMode) {

                await apiClient.put(
                    `/membership-plans/${id}`,
                    payload
                );

                toast.success(
                    "Membership updated successfully"
                );

            } else {

                await apiClient.post(
                    '/membership-plans',
                    payload
                );

                toast.success(
                    "Membership created successfully"
                );
            }

            navigate(
                '/dashboard/owner/membership'
            );

        } catch (error) {

            console.error(
                'Membership save error:',
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Operation failed"
            );

        } finally {

            setLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | LOADER
    |--------------------------------------------------------------------------
    */

    if (
        loading &&
        isEditMode &&
        !formData.name
    ) {

        return (
            <Loader
                text="Loading membership details..."
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | REACT SELECT CUSTOM STYLES
    |--------------------------------------------------------------------------
    */

    const customStyles = {

        control: (
            provided,
            state
        ) => ({
            ...provided,

            minHeight:
                '38px',

            borderRadius:
                '0.75rem',

            borderColor:
                state.isFocused
                    ? '#CA0410'
                    : '#e2e8f0',

            backgroundColor:
                '#ffffff',

            boxShadow:
                state.isFocused
                    ? '0 0 0 4px rgba(202, 4, 16, 0.1)'
                    : 'none',

            '&:hover': {
                borderColor:
                    '#CA0410'
            },

            fontSize:
                '0.875rem',

            fontWeight:
                '500',

            color:
                '#1e293b',

            transition:
                'all 0.2s ease',

            paddingLeft:
                '0.25rem'
        }),

        option: (
            provided,
            state
        ) => ({
            ...provided,

            backgroundColor:
                state.isSelected
                    ? '#CA0410'
                    : state.isFocused
                        ? '#FFF5F5'
                        : 'transparent',

            color:
                state.isSelected
                    ? 'white'
                    : '#475569',

            fontSize:
                '0.875rem',

            fontWeight:
                '500',

            cursor:
                'pointer',

            ':active': {
                backgroundColor:
                    '#FEE2E2'
            }
        }),

        singleValue:
            provided => ({
                ...provided,
                color:
                    '#1e293b'
            }),

        placeholder:
            provided => ({
                ...provided,
                color:
                    '#94a3b8'
            }),

        menu:
            provided => ({
                ...provided,

                borderRadius:
                    '0.75rem',

                boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

                border:
                    '1px solid #fecdd3',

                overflow:
                    'hidden',

                zIndex:
                    50
            }),

        multiValue:
            provided => ({
                ...provided,

                backgroundColor:
                    '#FFF5F5',

                border:
                    '1px solid #FECDD3',

                borderRadius:
                    '0.375rem'
            }),

        multiValueLabel:
            provided => ({
                ...provided,

                color:
                    '#CA0410',

                fontSize:
                    '0.75rem',

                fontWeight:
                    '700'
            }),

        multiValueRemove:
            provided => ({
                ...provided,

                color:
                    '#CA0410',

                ':hover': {
                    backgroundColor:
                        '#CA0410',

                    color:
                        'white'
                }
            })
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <PageLayout>

            <PageHeader
                title={
                    isEditMode
                        ? "Edit Membership Plan"
                        : "Add Membership Plan"
                }
                subtitle={
                    "Configure plan details and pricing"
                }
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">

                <div className="max-w-7xl mx-auto">

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-6"
                    >

                        {/* =====================================================
                            PLAN INFORMATION
                        ====================================================== */}

                        <FormSection
                            title="Plan Information"
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >

                            {/* PLAN NAME */}

                            <Input
                                label="Plan Name"
                                name="name"
                                value={
                                    formData.name
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                placeholder="e.g. Annual Gold, 12 PT Sessions"
                            />

                            {/* PLAN TYPE */}

                            <div className="col-span-1">

                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">

                                    Plan Type

                                </label>

                                <CreatableSelect
                                    isMulti
                                    name="planType"

                                    options={
                                        planTypeOptions
                                    }

                                    value={
                                        (
                                            formData.planType ||
                                            []
                                        ).map(
                                            pt => ({
                                                value:
                                                    pt,
                                                label:
                                                    pt
                                            })
                                        )
                                    }

                                    onChange={
                                        handlePlanTypeChange
                                    }

                                    styles={
                                        customStyles
                                    }

                                    classNamePrefix="react-select"

                                    placeholder="Select or type..."

                                />

                            </div>

                            {/* DURATION */}

                            <div className="col-span-1 grid grid-cols-2 gap-2">

                                <div>

                                    <Input
                                        label="Duration"
                                        type="number"
                                        name="duration"
                                        value={
                                            formData.duration
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                        min="1"
                                        placeholder="e.g. 1"
                                    />

                                </div>

                                <div>

                                    <Select
                                        label="Unit"
                                        name="durationUnit"
                                        value={
                                            formData.durationUnit
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            'Days',
                                            'Weeks',
                                            'Months',
                                            'Years'
                                        ]}
                                    />

                                </div>

                            </div>

                            {/* =================================================
                                PT / CLASS SESSION LIMIT
                            ================================================== */}

                            {hasSessionLimit && (

                                <div className="col-span-1">

                                    <Input
                                        label={
                                            isPTPlan
                                                ? "Total PT Sessions"
                                                : "Total Sessions Limit"
                                        }

                                        type="number"

                                        name="sessions"

                                        value={
                                            formData.sessions
                                        }

                                        onChange={
                                            handleChange
                                        }

                                        min="0"

                                        placeholder={
                                            isPTPlan
                                                ? "e.g. 12"
                                                : "e.g. 12"
                                        }
                                    />

                                    <p className="mt-1.5 text-[11px] text-slate-500">

                                        {isPTPlan
                                            ? "Number of personal training sessions included in this PT plan. Use 0 for unlimited."
                                            : "Number of sessions included in this plan. Use 0 for unlimited."
                                        }

                                    </p>

                                </div>

                            )}

                            {/* =================================================
                                PRICE
                            ================================================== */}

                            <Input
                                label="Price (₹)"
                                type="number"
                                name="price"
                                value={
                                    formData.price
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                min="0"
                                placeholder="e.g. 15000"
                            />

                            {/* =================================================
                                PT PLAN INFO
                            ================================================== */}

                            {isPTPlan && (

                                <div className="col-span-full">

                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                                        <div className="flex items-start gap-3">

                                            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs">

                                                PT

                                            </div>

                                            <div>

                                                <p className="text-sm font-bold text-red-700">

                                                    Personal Training Plan

                                                </p>

                                                <p className="mt-0.5 text-xs text-red-600">

                                                    This plan can be assigned as a separate PT service during membership assignment. The member's normal gym membership will remain separate.

                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            )}

                            {/* =================================================
                                DESCRIPTION
                            ================================================== */}

                            <Textarea
                                containerClassName="col-span-full"
                                label="Description"
                                name="description"
                                value={
                                    formData.description
                                }
                                onChange={
                                    handleChange
                                }
                                rows="3"
                                placeholder="Enter plan details..."
                            />

                            {/* =================================================
                                ACTIVE
                            ================================================== */}

                            <Checkbox
                                containerClassName="col-span-full mt-2"
                                label="Active (Available for purchase)"
                                name="isActive"
                                checked={
                                    formData.isActive
                                }
                                onChange={
                                    handleChange
                                }
                            />

                        </FormSection>

                        {/* =====================================================
                            BUTTONS
                        ====================================================== */}

                        <div className="flex justify-end gap-3 w-full pt-4">

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    navigate(
                                        '/dashboard/owner/membership'
                                    )
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                loading={
                                    loading
                                }
                                className="bg-[#CA0410] hover:bg-[#a8030d] text-white"
                            >
                                {isEditMode
                                    ? "Update Plan"
                                    : "Save Plan"
                                }
                            </Button>

                        </div>

                    </form>

                </div>

            </div>

        </PageLayout>
    );
}

export default MembershipForm