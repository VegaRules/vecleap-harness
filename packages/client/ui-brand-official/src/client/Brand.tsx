import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { VecleapMark, VecleapWordmark } from './VecleapBrand.tsx'

/**
 * Render the VecLeap mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the product mark.
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <VecleapMark size={size} />
}

/**
 * Render the VecLeap name artwork without its independently slotted mark.
 * @returns the product wordmark.
 */
export function OfficialBrandName() {
  return <VecleapWordmark includeMark={false} />
}

/**
 * Render the VecLeap mark in the blank-session hero chrome.
 * @param props - Hero brand-mark slot props.
 * @returns decorative hero mark.
 */
export function OfficialHeroBrandMark({ size, className }: HeroBrandMarkOwnerProps) {
  return <VecleapMark size={size} className={className} />
}
