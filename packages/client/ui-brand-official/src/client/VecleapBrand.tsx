import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'
import { VECLEAP_MARK_DATA_URL } from './vecleap-mark-data.ts'

/** Display options for the Vecleap wordmark. */
export interface VecleapWordmarkProps extends IconProps {
  /** Whether to include the leading mark; defaults to true. */
  includeMark?: boolean | undefined
}

/**
 * Render the Vecleap mark from the product logo asset.
 * @param props.size - height in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns decorative brand mark.
 */
export function VecleapMark({ size = 24, className }: IconProps) {
  return (
    <img
      src={VECLEAP_MARK_DATA_URL}
      width={size}
      height={size}
      className={className}
      alt=""
      aria-hidden
    />
  )
}

/**
 * Render the VecLeap wordmark for sidebar and chrome slots.
 * @param props.size - height in px (default 24).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading mark.
 * @returns decorative wordmark row.
 */
export function VecleapWordmark({ size = 24, className, includeMark = true }: VecleapWordmarkProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: size, fontSize: size * 0.58, lineHeight: 1 }}
      aria-hidden
    >
      {includeMark ? <VecleapMark size={size} /> : null}
      <span style={{ fontWeight: 600 }}>VecLeap</span>
    </span>
  )
}
