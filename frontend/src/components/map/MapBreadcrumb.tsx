type MapBreadcrumbProps = {
  scopePath: string[]
  onNavigate: (depth: number) => void
}

function MapBreadcrumb({ scopePath, onNavigate }: MapBreadcrumbProps) {
  if (scopePath.length <= 1) return null

  return (
    <nav className="map-breadcrumb" aria-label="地圖路徑">
      {scopePath.map((segment, index) => {
        const isLast = index === scopePath.length - 1
        return (
          <span key={segment} className="map-breadcrumb__segment">
            {index > 0 && <span className="map-breadcrumb__separator" aria-hidden="true">›</span>}
            {isLast ? (
              <span className="map-breadcrumb__current">{segment}</span>
            ) : (
              <button
                type="button"
                className="map-breadcrumb__link"
                onClick={() => onNavigate(index)}
              >
                {segment}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default MapBreadcrumb
