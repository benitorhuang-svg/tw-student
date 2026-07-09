import { Fragment } from 'react'

import type { SeriesColor } from './constants'

export function StackedTrendDefs({ colors }: { colors: SeriesColor[] }) {
  return (
    <defs>
      {colors.map((color, index) => (
        <Fragment key={`defs-${index}`}>
          <linearGradient id={`bar-grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color.start} />
            <stop offset="100%" stopColor={color.end} />
          </linearGradient>
          <filter id={`glow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor={color.glow} result="flood" />
            <feComposite in="flood" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </Fragment>
      ))}
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="0" dy="2" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.2" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(203, 213, 225, 0)" />
        <stop offset="50%" stopColor="rgba(203, 213, 225, 0.4)" />
        <stop offset="100%" stopColor="rgba(203, 213, 225, 0)" />
      </linearGradient>
    </defs>
  )
}
