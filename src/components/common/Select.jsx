import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  icon: Icon,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-full bg-dark-tertiary border border-white/10 rounded-xl
            px-4 py-3 pr-10
            text-white
            focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${Icon ? 'pl-11' : ''}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-dark-card text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}