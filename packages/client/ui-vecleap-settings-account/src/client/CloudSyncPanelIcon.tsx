import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/** Sidebar icon for Hub cloud conversations. */
export function CloudSyncPanelIcon({ size, active }: PropsRuntime<'sidebar.panellist'>) {
  const stroke = active ? 'var(--dsh-color-accent-primary, #00e5ff)' : 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 0 1-.88-7.9A5 5 0 0 1 18.5 9.5 4 4 0 0 1 20 17H7z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
