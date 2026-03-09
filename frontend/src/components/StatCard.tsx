import AnimatedNumber from './AnimatedNumber'

type StatCardProps = {
  title: string
  value: string
  numericValue?: number
  caption: string
  tone: 'lagoon' | 'sun' | 'coral'
}

function StatCard({ title, value, numericValue, caption, tone }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__title">{title}</span>
      <strong className="stat-card__value">
        {numericValue !== undefined ? (
          <><AnimatedNumber value={numericValue} /> 人</>
        ) : (
          value
        )}
      </strong>
      <span className="stat-card__caption">{caption}</span>
    </article>
  )
}

export default StatCard