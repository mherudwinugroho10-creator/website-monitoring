import { STATUS_COLORS } from '../../utils/constants';

export default function Badge({
  children,
  variant = 'normal',
  size = 'md',
  dot = false,
  className = '',
}) {
  const colors = STATUS_COLORS[variant] || STATUS_COLORS.normal;

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${colors.bg} ${colors.text} ${colors.border} border
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${colors.text} bg-current`} />
      )}
      {children}
    </span>
  );
}