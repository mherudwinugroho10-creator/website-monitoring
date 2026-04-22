export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className = '',
  noPadding = false,
  ...props
}) {
  return (
    <div
      className={`
        bg-dark-card border border-white/5 rounded-2xl card-shadow
        ${noPadding ? '' : 'p-6'}
        ${className}
      `}
      {...props}
    >
      {(title || subtitle || Icon || action) && (
        <div className={`flex items-center justify-between ${noPadding ? 'p-6 pb-0' : 'mb-4'}`}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gold" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}