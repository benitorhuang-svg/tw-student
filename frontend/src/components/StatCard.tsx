type StatCardProps = {
  title: string
  value: string
  caption: string
  tone: 'lagoon' | 'sun' | 'coral'
}

function StatCard({ title, value, caption, tone }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__title">{title}</span>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__caption">{caption}</span>
    </article>
  )
}

export default StatCard