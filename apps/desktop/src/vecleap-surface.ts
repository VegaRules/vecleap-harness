/**
 * Desktop shell palette shared with the VecLeap web and mobile apps.
 * Injected into the packaged document ahead of the design-system sheets, so
 * every token is `!important` and still wins after those sheets mount.
 */

/** Product canvas. Matches mobile `chatTheme.background` and web light chrome. */
export const VECLEAP_CANVAS = '#FAFAF8'

/** Caption and primary text on the product canvas. */
export const VECLEAP_INK = '#252723'

/** Sage primary action, the same accent as mobile chat UI. */
export const VECLEAP_ACTION = '#4D6650'

/** Title-bar control glyphs on Windows overlays. */
export const VECLEAP_CHROME_SYMBOL = '#252723'

/** Inline style element prepended to the desktop application document. */
export const VECLEAP_SURFACE_STYLE = `<style id="vecleap-shell">
html { color-scheme: light; background: ${VECLEAP_CANVAS}; }
html body {
  color-scheme: light;
  color: ${VECLEAP_INK};
  background-color: ${VECLEAP_CANVAS} !important;
  background-image:
    radial-gradient(ellipse at 12% -6%, rgba(240, 235, 217, 0.85), transparent 48%),
    radial-gradient(ellipse at 100% 108%, rgba(232, 238, 230, 0.9), transparent 44%) !important;
  background-attachment: fixed !important;
  --dsw-alias-bg-base: ${VECLEAP_CANVAS} !important;
  --dsw-alias-bg-document-preview: #FFFFFF !important;
  --dsw-alias-bg-layer-1: #FFFFFF !important;
  --dsw-alias-bg-layer-2: #F1F1ED !important;
  --dsw-alias-bg-layer-3: #EDEDE8 !important;
  --dsw-alias-bg-module-platform: #FFFFFF !important;
  --dsw-alias-bg-multi-select: #E8EEE6 !important;
  --dsw-alias-bg-overlay: #EDEDE8 !important;
  --dsw-alias-bg-skeleton: rgba(37, 39, 35, 0.06) !important;
  --dsw-alias-bg-mask-drop: rgba(32, 35, 30, 0.22) !important;
  --dsw-alias-border-l1: #E8E8E2 !important;
  --dsw-alias-border-l2: rgba(77, 102, 80, 0.22) !important;
  --dsw-alias-border-l2-darkmode-thin: #E8E8E2 !important;
  --dsw-alias-border-l3: rgba(77, 102, 80, 0.35) !important;
  --dsw-alias-border-l4: rgba(77, 102, 80, 0.5) !important;
  --dsw-alias-border-inverted: rgba(255, 255, 255, 0.9) !important;
  --dsw-alias-border-inverted2: #FFFFFF !important;
  --dsw-alias-label-primary: ${VECLEAP_INK} !important;
  --dsw-alias-label-primary-dimmed: #74766F !important;
  --dsw-alias-label-primary-bluish: #4D6650 !important;
  --dsw-alias-label-primary-foreground: #FFFFFF !important;
  --dsw-alias-label-primary-inverted: #FFFFFF !important;
  --dsw-alias-label-secondary: #74766F !important;
  --dsw-alias-label-tertiary: #A2A49D !important;
  --dsw-alias-label-caption: #A2A49D !important;
  --dsw-alias-brand-primary: ${VECLEAP_ACTION} !important;
  --dsw-alias-brand-primary-invert: #FFFFFF !important;
  --dsw-alias-brand-text: #FFFFFF !important;
  --dsw-alias-link: #4D6650 !important;
  --dsw-alias-button-primary-fill: ${VECLEAP_ACTION} !important;
  --dsw-alias-button-primary-hover: #3d5340 !important;
  --dsw-alias-button-primary-dimmed: rgba(77, 102, 80, 0.35) !important;
  --dsw-alias-button-info-fill: ${VECLEAP_ACTION} !important;
  --dsw-alias-button-info-hover: #3d5340 !important;
  --dsw-alias-button-elevated-fill: #FFFFFF !important;
  --dsw-alias-button-floating-fill: #F1F1ED !important;
  --dsw-alias-button-floating-hover: #EDEDE8 !important;
  --dsw-alias-button-contrast-fill: ${VECLEAP_INK} !important;
  --dsw-alias-button-ghost-active-fill: #E8EEE6 !important;
  --dsw-alias-button-ghost-active-hover: #E2E9E0 !important;
  --dsw-alias-button-ghost-active-border: rgba(77, 102, 80, 0.35) !important;
  --dsw-alias-interactive-bg-hover: rgba(37, 39, 35, 0.04) !important;
  --dsw-alias-interactive-bg-hover-solid: rgba(37, 39, 35, 0.06) !important;
  --dsw-alias-interactive-bg-hover-accent: #E8EEE6 !important;
  --dsw-alias-interactive-bg-active: #E2E9E0 !important;
  --dsw-alias-state-business-primary: ${VECLEAP_ACTION} !important;
  --dsw-alias-state-business-tertiary: #E8EEE6 !important;
  --dsw-static-deepseek-400: ${VECLEAP_ACTION} !important;
  --dsw-static-deepseek-450: #3d5340 !important;
  --dsw-static-deepseek-500: ${VECLEAP_ACTION} !important;
  --dsw-static-blue-400: ${VECLEAP_ACTION} !important;
  --dsw-static-blue-500: #3d5340 !important;
  --dsw-specific-sidebar-fill: ${VECLEAP_CANVAS} !important;
  --dsw-specific-sidebar-nav-item-hover: rgba(37, 39, 35, 0.05) !important;
  --dsw-specific-sidebar-nav-item-active: #E8EEE6 !important;
  --dsw-specific-sidebar-nav-item-active-accent: rgba(77, 102, 80, 0.18) !important;
  --dsw-specific-input-major: #FFFFFF !important;
  --dsw-specific-login-input: #FFFFFF !important;
  --dsw-specific-bubble: #EDEDE8 !important;
  --dsw-specific-bubble-highlight: #E8EEE6 !important;
  --dsw-specific-selector: #FFFFFF !important;
  --dsw-specific-tip: #F1F1ED !important;
  --dsw-menu-surface-fill: rgba(255, 255, 255, 0.98) !important;
  --dsw-specific-menu: rgba(255, 255, 255, 0.98) !important;
  --dsw-alias-menu-group-header-fill: #FAFAF8 !important;
  --dsw-alias-toast-bg: #252723 !important;
  --dsw-alias-toast-label: #FAFAF8 !important;
  --dsw-alias-tooltip-bg: #252723 !important;
  --dsw-alias-markdown-code-block: #F1F1ED !important;
  --dsw-alias-markdown-code-block-banner: #EDEDE8 !important;
  --dsw-alias-markdown-inline-code: #EDEDE8 !important;
  --dsw-alias-markdown-placeholder: #F1F1ED !important;
  --dsw-alias-scrollbar-bg-l1: rgba(162, 164, 157, 0.45) !important;
  --dsw-alias-scrollbar-bg-l2: rgba(162, 164, 157, 0.35) !important;
  --dsw-alias-scrollbar-hover-l1: rgba(77, 102, 80, 0.45) !important;
  --dsw-alias-scrollbar-hover-l2: rgba(77, 102, 80, 0.35) !important;
}
</style>`
