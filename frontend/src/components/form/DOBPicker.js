import React, { useEffect, useMemo, useState } from 'react';
import ReactSelect from 'react-select';

export default function DOBPicker({
    label,
    required,
    error,
    value = '',
    onChange,
    name,
    className = '',
    containerClassName = '',
    disabled = false,
    minAge = 0,
    maxAge = 120
}) {
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');

    const today = new Date();

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    /* =====================================================
       SYNC VALUE FROM PARENT
       Expected: YYYY-MM-DD
    ===================================================== */

    useEffect(() => {
        if (
            typeof value === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {
            const [y, m, d] = value.split('-');

            setYear(y);
            setMonth(m);
            setDay(d);
        } else if (!value) {
            setYear('');
            setMonth('');
            setDay('');
        }
    }, [value]);

    /* =====================================================
       MONTH OPTIONS
    ===================================================== */

    const monthOptions = useMemo(() => {
        return Array.from({ length: 12 }, (_, index) => {
            const monthValue = String(index + 1).padStart(2, '0');

            return {
                value: monthValue,
                label: new Date(
                    2000,
                    index,
                    1
                ).toLocaleString('default', {
                    month: 'long'
                })
            };
        });
    }, []);

    /* =====================================================
       YEAR OPTIONS
    ===================================================== */

    const yearOptions = useMemo(() => {
        const minYear = currentYear - maxAge;
        const maxYear = currentYear - minAge;

        return Array.from(
            {
                length: maxYear - minYear + 1
            },
            (_, index) => {
                const yearValue = String(
                    maxYear - index
                );

                return {
                    value: yearValue,
                    label: yearValue
                };
            }
        );
    }, [currentYear, minAge, maxAge]);

    /* =====================================================
       DAYS BASED ON MONTH + YEAR
    ===================================================== */

    const daysInSelectedMonth =
        year && month
            ? new Date(
                  Number(year),
                  Number(month),
                  0
              ).getDate()
            : 31;

    const dayOptions = useMemo(() => {
        return Array.from(
            {
                length: daysInSelectedMonth
            },
            (_, index) => {
                const dayValue = String(
                    index + 1
                ).padStart(2, '0');

                return {
                    value: dayValue,
                    label: dayValue
                };
            }
        );
    }, [daysInSelectedMonth]);

    /* =====================================================
       FIND SELECTED OPTION
    ===================================================== */

    const getSelectedOption = (
        options,
        selectedValue
    ) => {
        if (!selectedValue) {
            return null;
        }

        return (
            options.find(
                (option) =>
                    option.value === selectedValue
            ) || null
        );
    };

    /* =====================================================
       SEND VALUE TO PARENT
       YYYY-MM-DD
    ===================================================== */

    const emitChange = (
        newYear,
        newMonth,
        newDay
    ) => {
        if (!onChange) return;

        /* Incomplete DOB */
        if (
            !newYear ||
            !newMonth ||
            !newDay
        ) {
            onChange({
                target: {
                    name,
                    value: '',
                    type: 'date'
                }
            });

            return;
        }

        const selectedDate = new Date(
            Number(newYear),
            Number(newMonth) - 1,
            Number(newDay)
        );

        /* =================================================
           VALIDATE REAL CALENDAR DATE
           ================================================= */

        const isValidDate =
            selectedDate.getFullYear() ===
                Number(newYear) &&
            selectedDate.getMonth() ===
                Number(newMonth) - 1 &&
            selectedDate.getDate() ===
                Number(newDay);

        if (!isValidDate) {
            onChange({
                target: {
                    name,
                    value: '',
                    type: 'date'
                }
            });

            return;
        }

        /* =================================================
           PREVENT FUTURE DOB
           ================================================= */

        const todayDate = new Date(
            currentYear,
            currentMonth - 1,
            currentDay
        );

        if (selectedDate > todayDate) {
            onChange({
                target: {
                    name,
                    value: '',
                    type: 'date'
                }
            });

            return;
        }

        /* =================================================
           FINAL FORMAT
           YYYY-MM-DD
           ================================================= */

        const formattedDate =
            `${newYear}-${String(newMonth).padStart(
                2,
                '0'
            )}-${String(newDay).padStart(2, '0')}`;

        onChange({
            target: {
                name,
                value: formattedDate,
                type: 'date'
            }
        });
    };

    /* =====================================================
       HANDLE DATE CHANGE
    ===================================================== */

    const handleDateChange = (
        type,
        selectedOption
    ) => {
        const selectedValue =
            selectedOption?.value || '';

        let newYear = year;
        let newMonth = month;
        let newDay = day;

        if (type === 'year') {
            newYear = selectedValue;
            setYear(selectedValue);
        }

        if (type === 'month') {
            newMonth = selectedValue;
            setMonth(selectedValue);
        }

        if (type === 'day') {
            newDay = selectedValue;
            setDay(selectedValue);
        }

        /* =================================================
           FIX INVALID DAY

           31 January
           ↓
           February

           Automatically becomes:
           28/29 February
        ================================================= */

        if (
            newYear &&
            newMonth &&
            newDay
        ) {
            const maxDays = new Date(
                Number(newYear),
                Number(newMonth),
                0
            ).getDate();

            if (
                Number(newDay) >
                maxDays
            ) {
                newDay = String(
                    maxDays
                ).padStart(2, '0');

                setDay(newDay);
            }
        }

        emitChange(
            newYear,
            newMonth,
            newDay
        );
    };

    /* =====================================================
       REACT SELECT STYLES
    ===================================================== */

    const customStyles = {
        /* -------------------------------------------------
           CONTROL
        ------------------------------------------------- */

        control: (
            provided,
            state
        ) => ({
            ...provided,

            minHeight: '40px',
            height: '40px',

            width: '100%',
            minWidth: 0,

            borderRadius: '0.75rem',

            borderColor: error
                ? '#f43f5e'
                : state.isFocused
                ? '#CA0410'
                : '#e2e8f0',

            backgroundColor:
                error
                    ? '#fff1f2'
                    : '#ffffff',

            boxShadow:
                state.isFocused
                    ? error
                        ? '0 0 0 4px rgba(244, 63, 94, 0.15)'
                        : '0 0 0 4px rgba(202, 4, 16, 0.1)'
                    : '0 1px 2px 0 rgba(0, 0, 0, 0.02)',

            '&:hover': {
                borderColor: error
                    ? '#e11d48'
                    : '#CA0410'
            },

            fontSize: '0.8125rem',
            fontWeight: '500',

            transition:
                'all 0.15s ease',

            paddingLeft: '0.25rem',

            cursor: disabled
                ? 'not-allowed'
                : 'pointer',

            opacity: disabled
                ? 0.6
                : 1,

            overflow: 'visible'
        }),

        /* -------------------------------------------------
           VALUE CONTAINER
        ------------------------------------------------- */

        valueContainer: (
            provided
        ) => ({
            ...provided,

            padding:
                '0 4px 0 8px',

            minWidth: 0,

            overflow: 'visible',

            flex: '1 1 auto'
        }),

        /* -------------------------------------------------
           INPUT
        ------------------------------------------------- */

        input: (
            provided
        ) => ({
            ...provided,

            margin: 0,
            padding: 0,

            color: '#1e293b'
        }),

        /* -------------------------------------------------
           REMOVE SEPARATOR
        ------------------------------------------------- */

        indicatorSeparator:
            () => ({
                display: 'none'
            }),

        /* -------------------------------------------------
           INDICATORS
        ------------------------------------------------- */

        indicatorsContainer: (
            provided
        ) => ({
            ...provided,

            height: '38px',

            flexShrink: 0
        }),

        /* -------------------------------------------------
           DROPDOWN ARROW
        ------------------------------------------------- */

        dropdownIndicator: (
            provided,
            state
        ) => ({
            ...provided,

            color:
                state.isFocused
                    ? '#CA0410'
                    : '#94a3b8',

            padding: '6px',

            '&:hover': {
                color: '#CA0410'
            }
        }),

        /* -------------------------------------------------
           CLEAR INDICATOR
        ------------------------------------------------- */

        clearIndicator: (
            provided
        ) => ({
            ...provided,

            color: '#94a3b8',

            padding: '6px',

            '&:hover': {
                color: '#f43f5e'
            }
        }),

        /* -------------------------------------------------
           OPTIONS
        ------------------------------------------------- */

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
                    ? '#ffffff'
                    : state.isFocused
                    ? '#CA0410'
                    : '#334155',

            fontSize:
                '0.8125rem',

            fontWeight:
                state.isSelected
                    ? '700'
                    : '500',

            padding:
                '8px 12px',

            cursor: 'pointer',

            transition:
                'all 0.1s ease',

            ':active': {
                backgroundColor:
                    '#FEE2E2'
            }
        }),

        /* -------------------------------------------------
           SELECTED VALUE

           IMPORTANT:
           Don't let ReactSelect show "..."
        ------------------------------------------------- */

        singleValue: (
            provided
        ) => ({
            ...provided,

            color: '#1e293b',

            fontSize:
                '0.8125rem',

            fontWeight: '500',

            margin: 0,

            maxWidth:
                'none',

            overflow:
                'visible',

            textOverflow:
                'clip',

            whiteSpace:
                'nowrap',

            position:
                'relative',

            transform:
                'none',

            left: 'auto',

            right: 'auto'
        }),

        /* -------------------------------------------------
           PLACEHOLDER
        ------------------------------------------------- */

        placeholder: (
            provided
        ) => ({
            ...provided,

            color: '#94a3b8',

            fontSize:
                '0.8125rem',

            fontWeight: '400',

            whiteSpace:
                'nowrap',

            overflow:
                'visible'
        }),

        /* -------------------------------------------------
           DROPDOWN MENU
        ------------------------------------------------- */

        menu: (
            provided
        ) => ({
            ...provided,

            borderRadius:
                '0.75rem',

            boxShadow:
                '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',

            border:
                '1px solid #fecdd3',

            overflow:
                'hidden',

            zIndex: 9999,

            padding: '4px',

            minWidth:
                '100%'
        }),

        /* -------------------------------------------------
           MENU LIST
           
        ------------------------------------------------- */

        menuList: (
            provided
        ) => ({
            ...provided,

            padding: '2px',

            borderRadius:
                '0.5rem',

            maxHeight:
                '220px'
        })
    };

    /* =====================================================
       SELECTED VALUES
    ===================================================== */

    const selectedDay =
        getSelectedOption(
            dayOptions,
            day
        );

    const selectedMonth =
        getSelectedOption(
            monthOptions,
            month
        );

    const selectedYear =
        getSelectedOption(
            yearOptions,
            year
        );

    /* =====================================================
       RETURN
    ===================================================== */

    return (
        <div
            className={`flex flex-col min-w-0 ${containerClassName}`}
        >
            {/* LABEL */}

            {label && (
                <label
                    className={`block text-[13px] font-bold mb-1.5 tracking-tight ${
                        error
                            ? 'text-rose-600'
                            : 'text-slate-700'
                    }`}
                >
                    {label}{' '}

                    {required && (
                        <span className="text-[#CA0410] ml-0.5">
                            *
                        </span>
                    )}
                </label>
            )}

            {/* =================================================
                DOB FIELDS

                Day    Month       Year
                58px   flexible     82px
            ================================================= */}

            <div
                className={`
                    grid
                    grid-cols-[80px_minmax(100px,1fr)_80px]
                    gap-2
                    w-full
                    min-w-0
                    ${className}
                `}
            >
                {/* DAY */}

                <ReactSelect
                    value={selectedDay}
                    onChange={(option) =>
                        handleDateChange(
                            'day',
                            option
                        )
                    }
                    options={dayOptions}
                    styles={customStyles}
                    placeholder="Day"
                    isSearchable={false}
                    isClearable={false}
                    isDisabled={disabled}
                    menuPlacement="auto"
                    classNamePrefix="dob-select"
                />

                {/* MONTH */}

                <ReactSelect
                    value={selectedMonth}
                    onChange={(option) =>
                        handleDateChange(
                            'month',
                            option
                        )
                    }
                    options={monthOptions}
                    styles={customStyles}
                    placeholder="Month"
                    isSearchable={false}
                    isClearable={false}
                    isDisabled={disabled}
                    menuPlacement="auto"
                    classNamePrefix="dob-select"
                />

                {/* YEAR */}

                <ReactSelect
                    value={selectedYear}
                    onChange={(option) =>
                        handleDateChange(
                            'year',
                            option
                        )
                    }
                    options={yearOptions}
                    styles={customStyles}
                    placeholder="Year"
                    isSearchable={false}
                    isClearable={false}
                    isDisabled={disabled}
                    menuPlacement="auto"
                    classNamePrefix="dob-select"
                />
            </div>

            {/* ERROR */}

            {error && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                    {error}
                </p>
            )}
        </div>
    );
}