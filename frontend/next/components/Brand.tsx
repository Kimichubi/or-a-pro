import Link from 'next/link'
import { FileText } from 'lucide-react'

type BrandProps = {
  href?: string
  inverse?: boolean
  size?: 'small' | 'large'
}

export function Brand({ href, inverse = false, size = 'large' }: BrandProps) {
  const classes = [
    'brand',
    inverse ? 'brand--inverse' : 'brand--default',
    size === 'small' ? 'brand--small' : 'brand--large',
  ].join(' ')

  const mark = (
    <span className={classes}>
      <span className="brand__mark" aria-hidden="true">
        <FileText size={size === 'small' ? 17 : 20} strokeWidth={2.2} />
        <span className="brand__spark" />
      </span>
      <span className="brand__name">OrçaPro</span>
    </span>
  )

  return href ? <Link href={href} className="brand-link" aria-label="OrçaPro">{mark}</Link> : mark
}
