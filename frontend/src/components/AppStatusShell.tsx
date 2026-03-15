export function AppLoadingShell({ message }: { message: string }) {
  return (
    <div className="app-shell app-shell--loading">
      <section className="hero-panel hero-panel--single">
        <div className="hero-panel__content">
          <p className="eyebrow">介面載入中</p>
          <h1>{message}</h1>
          <p className="hero-panel__description">正在分批載入地圖元件與分析工作台，避免初始 bundle 過大。</p>
        </div>
      </section>
    </div>
  )
}

export function AppErrorShell({ title, description, eyebrow }: { title: string; description: string; eyebrow: string }) {
  return (
    <div className="app-shell">
      <section className="hero-panel hero-panel--single">
        <div className="hero-panel__content">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-panel__description">{description}</p>
        </div>
      </section>
    </div>
  )
}
