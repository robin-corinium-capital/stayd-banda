export type StatusVariant = 'pass' | 'flag' | 'critical'

const styles: Record<StatusVariant, string> = {
  pass: 'bg-status-pass/20 text-status-pass border-status-pass/30',
  flag: 'bg-status-flag/20 text-status-flag border-status-flag/30',
  critical: 'bg-status-critical/20 text-status-critical border-status-critical/30',
}

const labels: Record<StatusVariant, string> = {
  pass: 'Pass',
  flag: 'Flag',
  critical: 'Critical',
}

export function Badge({
  status,
  label,
  className = '',
}: {
  status: StatusVariant
  label?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-badge border px-2.5 py-0.5 text-xs font-semibold ${styles[status]} ${className}`}
    >
      {label ?? labels[status]}
    </span>
  )
}
