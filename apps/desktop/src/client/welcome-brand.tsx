/** Welcome hero lockup: same mark + wordmark as Web and mobile. */
import { VECLEAP_MARK_DATA_URL } from './vecleap-mark-data.ts'

/**
 * @param props.label - accessible product name when the mark is decorative.
 * @returns decorative VecLeap brand row for the welcome screen.
 */
export function WelcomeBrand({ label }: { label: string }) {
  return (
    <p className="brand-lockup" aria-label={label}>
      <img className="brand-mark" src={VECLEAP_MARK_DATA_URL} alt="" aria-hidden width={40} height={40} />
      <span className="brand-word" aria-hidden>
        VecLeap
      </span>
    </p>
  )
}
