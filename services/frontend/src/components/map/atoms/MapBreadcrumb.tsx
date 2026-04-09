type MapBreadcrumbProps = {
  scopePath: string[]
  onNavigate: (depth: number) => void
}

function MapBreadcrumb({ scopePath, onNavigate }: MapBreadcrumbProps) {
  if (scopePath.length === 0) return null

  return (
    <nav className="map-breadcrumb" aria-label="地圖路徑">
      {scopePath.map((segment, index) => {
        const isLast = index === scopePath.length - 1
        return (
          <div key={segment} className="map-breadcrumb__step">
            {index > 0 && <span className="map-breadcrumb__separator" aria-hidden="true">&nbsp;&gt;&nbsp;</span>}
            <span className={`map-breadcrumb__segment ${isLast ? 'is-active' : ''}`}>
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
          </div>
        )
      })}
    </nav>
  )
}

export default MapBreadcrumb
