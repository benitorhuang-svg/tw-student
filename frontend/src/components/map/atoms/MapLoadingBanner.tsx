interface MapLoadingBannerProps {
  isLoading: boolean
  message?: string
}

export function MapLoadingBanner({ isLoading, message = '正在同步數據…' }: MapLoadingBannerProps) {
  if (!isLoading) return null
  
  return (
    <div className="atlas-map-loading">
      {message}
    </div>
  )
}
