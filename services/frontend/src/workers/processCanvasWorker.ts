self.addEventListener('message', (ev) => {
  const { type, payload } = ev.data || {}
  if (type === 'init') {
    const { canvas, width, height, ratio } = payload || {}
    try {
      const ctx = canvas.getContext('2d')
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
      canvas.style = canvas.style || {}
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ;(self as any)._canvasCtx = ctx
    } catch (err) {
      ;(self as any)._canvasCtx = null
    }
    return
  }

  if (type === 'draw') {
    const ctx = (self as any)._canvasCtx
    if (!ctx) return
    const { width, height, points } = payload || {}
    ctx.clearRect(0, 0, width, height)
    for (const p of points || []) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.fillStyle || 'rgba(34,197,94,0.9)'
      ctx.fill()
    }
  }
})

export {}
