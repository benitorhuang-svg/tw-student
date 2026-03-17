import React from 'react'
import '../../styles/organisms/welcome-portal.css'

type PortalNodeProps = {
  id: string
  label: string
  sublabel: string
  icon: string
  color: string
  onClick: () => void
  delay: string
}

const PortalNode: React.FC<PortalNodeProps> = ({ label, sublabel, icon, color, onClick, delay }) => (
  <button 
    className="portal-node" 
    onClick={onClick}
    style={{ '--node-accent': color, animationDelay: delay } as React.CSSProperties}
  >
    <div className="portal-node__icon">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div className="portal-node__content">
      <strong>{label}</strong>
      <span>{sublabel}</span>
    </div>
    <div className="portal-node__glow" />
  </button>
)

type WelcomePortalProps = {
  onNavigate: (tab: any) => void
  onToggleGovernance: () => void
}

const WelcomePortal: React.FC<WelcomePortalProps> = ({ onNavigate, onToggleGovernance }) => {
  return (
    <div className="welcome-portal">
      <div className="welcome-portal__hero">
        <div className="welcome-portal__hero-map">
          {/* Stylized Map Points Placeholder */}
          <div className="map-nexus" />
        </div>
        <div className="welcome-portal__hero-text">
          <p className="eyebrow">Taiwan Education Map</p>
          <h1>學生員額<br /><span>分析系統</span></h1>
          <p className="description">跨年度校園規模消長、區域發展趨勢與數據異常檢核平台</p>
        </div>
      </div>

      <div className="welcome-portal__grid">
        <PortalNode 
          id="overview"
          label="全國概覽"
          sublabel="全台學生總量變化與年度轉折點"
          icon="analytics"
          color="#00f2ff"
          onClick={() => onNavigate('overview')}
          delay="0.1s"
        />
        <PortalNode 
          id="regional"
          label="區域消長"
          sublabel="北中南東各區資源分配與對照"
          icon="intersect"
          color="#7000ff"
          onClick={() => onNavigate('regional')}
          delay="0.2s"
        />
        <PortalNode 
          id="county"
          label="縣市深鑽"
          sublabel="深入各行政區、學制與公私立占比"
          icon="location_on"
          color="#00ff9d"
          onClick={() => onNavigate('county')}
          delay="0.3s"
        />
        <PortalNode 
          id="schools"
          label="單校追蹤"
          sublabel="快速搜尋全台學校與歷年明細"
          icon="school"
          color="#ff0080"
          onClick={() => onNavigate('schools')}
          delay="0.4s"
        />
        <PortalNode 
          id="governance"
          label="數據異常"
          sublabel="自動標註數據品質與待修正項目"
          icon="database_alert"
          color="#ffa600"
          onClick={() => {
            onNavigate('regional') // Fallback to a tab
            setTimeout(onToggleGovernance, 300)
          }}
          delay="0.5s"
        />
      </div>

      <div className="welcome-portal__footer">
        <p>教育部統計處數據匯入 • 更新日期：113年度</p>
      </div>
    </div>
  )
}

export default WelcomePortal
