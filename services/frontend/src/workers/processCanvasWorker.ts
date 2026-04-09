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
      const { x, y, r, level, fillStyle } = p
      ctx.beginPath()
      if (level === '國小') {
        ctx.arc(x, y, r, 0, Math.PI * 2)
      } else if (level === '國中') {
        ctx.rect(x - r, y - r, r * 2, r * 2)
      } else if (level === '高中職') {
        // Triangle
        ctx.moveTo(x, y - r * 1.2)
        ctx.lineTo(x - r, y + r)
        ctx.lineTo(x + r, y + r)
        ctx.closePath()
      } else if (level === '大專') {
        // Diamond
        ctx.moveTo(x, y - r * 1.3)
        ctx.lineTo(x - r, y)
        ctx.lineTo(x, y + r * 1.3)
        ctx.lineTo(x + r, y)
        ctx.closePath()
      } else {
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      ctx.fillStyle = fillStyle || 'rgba(34,197,94,0.9)'
      ctx.fill()
    }
  }
})

export {}
