import type { ChangeEvent } from 'react'

type MapSearchInputProps = {
  searchText: string
  onSetSearchText: (value: string) => void
}

export default function MapSearchInput({ searchText, onSetSearchText }: MapSearchInputProps) {
  return (
    <div className="map-search">
      <input
        className="map-search__input"
        type="text"
        placeholder="搜尋縣市 / 鄉鎮 / 學校 / 代碼"
        value={searchText}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onSetSearchText(e.target.value)}
        aria-label="搜尋縣市 / 鄉鎮 / 學校 / 代碼"
      />
    </div>
  )
}
