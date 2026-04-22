import { Calendar } from 'lucide-react';

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
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
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <Calendar className="w-5 h-5" />
        </div>
        
        <input
          type="date"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full bg-dark-tertiary border border-white/10 rounded-xl
            pl-11 pr-4 py-3
            text-white
            focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            [color-scheme:dark]
          `}
          {...props}
        />
      </div>
    </div>
  );
}