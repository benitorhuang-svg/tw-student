import React from 'react'
import { type DataManifest, type ValidationReport } from '../../data/educationTypes'
import { formatValidationStatus } from './governanceUtils'

type VitalStatusSectionProps = {
  dateOnly: string
  generatedAtLabel: string
  isRefreshingData: boolean
  localManifest: DataManifest | null
  remoteManifest: DataManifest | null
  validationReport: ValidationReport | null
}

export const VitalStatusSection: React.FC<VitalStatusSectionProps> = ({
  dateOnly,
  generatedAtLabel,
  isRefreshingData,
  localManifest,
  remoteManifest,
  validationReport,
}) => {
  return (
    <section className="school-chart-panel__section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Vital Status</p>
          <h3>產製與刷新摘要</h3>
        </div>
        <p className="panel-heading__meta">監測最後更新日為 <strong>{dateOnly}</strong>。在此檢查載入的正式切片與異常註記。</p>
      </div>
      <div className="school-profile-sidebar__stats">
        <div className="school-profile-metric">
          <span>完整產製時間</span>
          <strong>{generatedAtLabel}</strong>
          <small>{isRefreshingData ? '同步中...' : '前端已部署切片'}</small>
        </div>
        <div className="school-profile-metric" data-testid="governance-local-version">
          <span>本地版本</span>
          <strong>{localManifest ? localManifest.buildId : '尚未載入'}</strong>
          <small>{localManifest?.contentHash.slice(0, 12) || '---'}</small>
        </div>
        <div className="school-profile-metric" data-testid="governance-remote-version">
          <span>遠端版本</span>
          <strong>{remoteManifest ? remoteManifest.buildId : '檢查中...'}</strong>
          <small>{remoteManifest?.contentHash.slice(0, 12) || '---'}</small>
        </div>
        <div className="school-profile-metric">
          <span>驗證狀態</span>
          <strong className={validationReport?.overallStatus === 'fail' ? 'status--fail' : 'status--pass'}>
            {formatValidationStatus(validationReport)}
          </strong>
          <small>{validationReport ? `${validationReport.items.length} 項預期校驗` : '尚未驗證'}</small>
        </div>
      </div>
    </section>
  )
}
