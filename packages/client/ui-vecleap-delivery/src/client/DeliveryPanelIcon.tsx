import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * Sidebar icon for the delivery panel (simple van glyph).
 * @param props - panel list runtime props.
 * @returns svg icon.
 */
export function DeliveryPanelIcon({ size, active }: PropsRuntime<'sidebar.panellist'>) {
  const stroke = active ? 'var(--dsh-color-accent-primary, #00e5ff)' : 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="13" height="8" rx="1.5" stroke={stroke} strokeWidth="1.5" />
      <path d="M16 10h3l2 3v3h-5v-6z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7.5" cy="17" r="1.75" fill={stroke} />
      <circle cx="17.5" cy="17" r="1.75" fill={stroke} />
    </svg>
  )
}
