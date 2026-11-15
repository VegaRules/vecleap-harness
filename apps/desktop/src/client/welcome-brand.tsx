/** Welcome hero lockup: same mark + wordmark as Web and mobile (file URL for welcome CSP). */
const WELCOME_MARK_SRC = 'vecleap-mark.png'

/**
 * @param props.label - accessible product name when the mark is decorative.
 * @returns decorative VecLeap brand row for the welcome screen.
 */
export function WelcomeBrand({ label }: { label: string }) {
  return (
    <p className="brand-lockup" aria-label={label}>
      <img className="brand-mark" src={WELCOME_MARK_SRC} alt="" aria-hidden width={40} height={40} />
      <span className="brand-word" aria-hidden>
        VecLeap
      </span>
    </p>
  )
}
