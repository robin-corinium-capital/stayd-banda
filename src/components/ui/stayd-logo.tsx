import Image from 'next/image'

/**
 * stayd logo — use on every screen.
 *
 * Place at the top of your page layout. Sticks to the top on scroll
 * and right-aligns the logo. Content flows naturally below it.
 *
 * variant="dark"  → white logo (dark backgrounds)
 * variant="light" → black logo (light backgrounds)
 */
export function StaydLogo({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const src =
    variant === 'dark'
      ? '/brand/stayd-horizontal-white.svg'
      : '/brand/stayd-horizontal-black.svg'

  return (
    <header className="sticky top-0 z-10 flex justify-end px-4 py-3 bg-surface">
      <Image
        src={src}
        alt="stayd"
        width={790}
        height={310}
        className="h-10 w-auto"
        priority
      />
    </header>
  )
}
