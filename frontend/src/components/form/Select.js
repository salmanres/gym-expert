import React from 'react';
import ReactSelect from 'react-select';

export default function Select({ label, required, error, options = [], children, className = '', containerClassName = '', name, value, onChange, placeholder = "--Select--", ...props }) {
    
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
            minHeight: '38px',
            borderRadius: '0.5rem',
            borderColor: error ? '#f43f5e' : state.isFocused ? '#10b981' : '#e2e8f0',
            backgroundColor: error ? '#fff1f2' : '#ffffff',
            boxShadow: state.isFocused ? (error ? '0 0 0 4px rgba(244, 63, 94, 0.2)' : '0 0 0 4px rgba(16, 185, 129, 0.1)') : 'none',
            '&:hover': { borderColor: error ? '#e11d48' : '#10b981' },
            fontSize: '0.875rem',
            fontWeight: '500',
            color: error ? '#881337' : '#1e293b',
            transition: 'all 0.2s ease',
            paddingLeft: '0.25rem'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#ecfdf5' : 'transparent',
            color: state.isSelected ? 'white' : '#475569',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            ':active': { backgroundColor: '#d1fae5' }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#1e293b'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#94a3b8'
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            zIndex: 50
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
        <div className={containerClassName}>
            {label && (
                <label className={`block text-xs font-bold mb-1.5 ${error ? 'text-rose-600' : 'text-slate-600'}`}>
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            
            <ReactSelect
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
            
            {error && <p className="text-[10px] font-bold text-rose-500 mt-1">{error}</p>}
        </div>
    );
}
