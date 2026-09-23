import React from 'react';
import ReactSelect from 'react-select';

export default function Select({ label, required, error, options = [], children, className = '', containerClassName = '', name, value, onChange, placeholder = "--Select--", inputRef, ...props }) {
    
    // Parse options from the `options` array
    let parsedOptions = options.map((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const displayLabel = typeof opt === 'object' ? opt.label : opt;
        return { value: val, label: displayLabel };
    });

    const formatChildLabel = (c) => {
        if (Array.isArray(c)) {
            return c.map(item => (typeof item === 'object' ? '' : item)).join('').trim();
        }
        return c;
    };

    // Parse options from `children` (e.g. <option value="...">...</option> or <optgroup label="...">...</optgroup>)
    if (children) {
        React.Children.forEach(children, (child) => {
            if (!React.isValidElement(child)) return;

            if (child.type === 'option') {
                if (child.props.value !== '') { // Skip the default empty option if present
                    parsedOptions.push({
                        value: child.props.value,
                        label: formatChildLabel(child.props.children)
                    });
                }
            } else if (child.type === 'optgroup') {
                const groupOptions = [];
                React.Children.forEach(child.props.children, (subChild) => {
                    if (React.isValidElement(subChild) && subChild.type === 'option' && subChild.props.value !== '') {
                        groupOptions.push({
                            value: subChild.props.value,
                            label: formatChildLabel(subChild.props.children)
                        });
                    }
                });
                if (groupOptions.length > 0) {
                    parsedOptions.push({
                        label: child.props.label,
                        options: groupOptions
                    });
                }
            }
        });
    }

    const handleChange = (selectedOption) => {
        // Create a synthetic event object to maintain compatibility with existing forms
        if (onChange) {
            onChange({
                target: {
                    name: name,
                    value: selectedOption ? selectedOption.value : '',
                    type: 'select-one'
                }
            });
        }
    };

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: '40px',
            height: '40px',
            borderRadius: '0.75rem',
            borderColor: error ? '#f43f5e' : state.isFocused ? '#CA0410' : '#e2e8f0',
            backgroundColor: error ? '#fff1f2' : '#ffffff',
            boxShadow: state.isFocused ? (error ? '0 0 0 4px rgba(244, 63, 94, 0.15)' : '0 0 0 4px rgba(202, 4, 16, 0.1)') : '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
            '&:hover': { borderColor: error ? '#e11d48' : '#cbd5e1' },
            fontSize: '0.8125rem',
            fontWeight: '500',
            color: error ? '#881337' : '#1e293b',
            transition: 'all 0.15s ease',
            paddingLeft: '0.25rem',
            cursor: 'pointer'
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '0 8px',
        }),
        input: (provided) => ({
            ...provided,
            margin: '0',
            padding: '0',
            color: '#1e293b'
        }),
        indicatorSeparator: () => ({
            display: 'none'
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: '38px'
        }),
        dropdownIndicator: (provided, state) => ({
            ...provided,
            color: state.isFocused ? '#CA0410' : '#94a3b8',
            padding: '6px',
            '&:hover': { color: '#CA0410' }
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: '#94a3b8',
            padding: '6px',
            '&:hover': { color: '#f43f5e' }
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#CA0410' : state.isFocused ? '#FFF5F5' : 'transparent',
            color: state.isSelected ? 'white' : state.isFocused ? '#CA0410' : '#334155',
            fontSize: '0.8125rem',
            fontWeight: state.isSelected ? '700' : '500',
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
            ':active': { backgroundColor: '#FEE2E2' }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#1e293b',
            fontSize: '0.8125rem',
            fontWeight: '500'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#94a3b8',
            fontSize: '0.8125rem',
            fontWeight: '400'
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: '0.75rem',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #fecdd3',
            overflow: 'hidden',
            zIndex: 50,
            padding: '4px'
        }),
        menuList: (provided) => ({
            ...provided,
            padding: '2px',
            borderRadius: '0.5rem'
        })
    };

    // Find the currently selected option object to pass to ReactSelect
    const findSelectedOption = (opts, val) => {
        if (!val) return null;
        for (const item of opts) {
            if (item.options) {
                const found = item.options.find(o => o.value === val);
                if (found) return found;
            } else if (item.value === val) {
                return item;
            }
        }
        return { value: val, label: val };
    };

    const selectedOption = findSelectedOption(parsedOptions, value);

    return (
        <div className={`flex flex-col ${containerClassName}`}>
            {label && (
                <label className={`block text-[12px] font-bold mb-1.5 tracking-tight ${error ? 'text-rose-600' : 'text-slate-700'}`}>
                    {label} {required && <span className="text-[#CA0410] ml-0.5">*</span>}
                </label>
            )}
            
            <ReactSelect
                ref={inputRef}
                name={name}
                value={selectedOption}
                onChange={handleChange}
                options={parsedOptions}
                styles={customStyles}
                placeholder={placeholder}
                isSearchable={true}
                isClearable={!required}
                className={className}
                {...props}
            />
            
            {error && <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">{error}</p>}
        </div>
    );
}
