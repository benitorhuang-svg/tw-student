import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  type DataManifest,
} from '../../data/educationTypes'

type DataGovernanceFlyoutProps = {
  open: boolean
  onClose: () => void
  generatedAtLabel: string
  isRefreshingData: boolean

  localManifest: DataManifest | null
  remoteManifest: DataManifest | null
  validationReport: any | null
}

function DataGovernanceFlyout({
  open,
  onClose,
  generatedAtLabel,
  isRefreshingData,

  localManifest,
  remoteManifest,
  validationReport,
}: DataGovernanceFlyoutProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!open || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!isMounted || !open || typeof document === 'undefined') {
    return null
  }

  return createPortal((
    <div id="governance-flyout-layer" className="governance-flyout" role="dialog" aria-modal="true" aria-label="資料治理面板">
      <button id="governance-flyout-backdrop" type="button" className="governance-flyout-backdrop" aria-label="關閉資料治理面板" onClick={onClose} />
      
      <div className="governance-hud">
        <button type="button" className="governance-hud__inner-close" onClick={onClose} aria-label="關閉">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="hud-hero">
          <div className={`status-viz ${isRefreshingData ? 'syncing' : (validationReport?.overallStatus === 'pass' && localManifest?.buildId === remoteManifest?.buildId ? 'healthy' : 'warning')}`}>
            <div className="status-viz__ring"></div>
            <div className="status-viz__icon">
              {isRefreshingData ? '🔄' : (validationReport?.overallStatus === 'pass' && localManifest?.buildId === remoteManifest?.buildId ? '🛡️' : '⚠️')}
            </div>
          </div>
          <div className="hud-hero__text">
            <span className="premium-badge">DATA GOVERNANCE</span>
            <h1>
              {isRefreshingData ? 'SQLite 數據流同步中...' : (validationReport?.overallStatus === 'fail' ? '數據傳遞異常' : 'SQLite 資料中樞運作正常')}
            </h1>
            <p>
              監控從雲端 Manifest 到 SQLite 本地快取庫的完整數據生命週期。
              所有分析指標皆由內部 SQLite 彙整並提供，確保儀表板在斷網或不穩定時仍保有一致性。
            </p>
          </div>
        </div>

        <div className="hud-metrics-grid">
          <div className="hud-metric-card">
            <div className="hud-metric-card__header">
              <div className="icon-wrapper">📅</div>
              <span className="label">本地資料發布</span>
            </div>
            <div className="hud-metric-card__value">{generatedAtLabel}</div>
            <div className="hud-metric-card__meta">當前 SQLite 庫更新基準</div>
          </div>
          
          <div className="hud-metric-card">
            <div className="hud-metric-card__header">
              <div className="icon-wrapper">📋</div>
              <span className="label">SQLite Schema 校驗</span>
            </div>
            <div className={`hud-metric-card__value ${validationReport?.overallStatus === 'fail' ? 'status--fail' : 'status--pass'}`}>
              {validationReport ? (validationReport.overallStatus === 'pass' ? '資料表結構校驗通過' : '發現欄位不一致') : '檢測中...'}
            </div>
            <div className="hud-metric-card__meta">確保本地資料表型別正確性</div>
          </div>

          <div className="hud-metric-card">
            <div className="hud-metric-card__header">
              <div className="icon-wrapper">🔄</div>
              <span className="label">同步與核對</span>
            </div>
            <div className="hud-metric-card__value">
              {localManifest?.buildId === remoteManifest?.buildId ? '快取版號一致' : '與雲端存在版本差異'}
            </div>
            <div className="hud-metric-card__meta">
              SQLite Build ID: {localManifest ? localManifest.buildId : 'Unknown'}
            </div>
          </div>
        </div>

      </div>
    </div>
  ), document.body)
}

export default DataGovernanceFlyout