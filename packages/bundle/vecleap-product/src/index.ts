/** Patch-only bundle marker; product overrides live in cordis.patch.yml. */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'vecleap-product'

/** @param _ctx - unused; rows are applied from the bundle patch file. */
export function apply(_ctx: Context): void {}
