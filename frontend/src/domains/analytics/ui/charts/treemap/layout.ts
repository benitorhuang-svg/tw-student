export type LayoutRect<T> = {
  node: T
  x: number
  y: number
  width: number
  height: number
}

export const TREEMAP_CANVAS_WIDTH = 550
export const TREEMAP_CANVAS_HEIGHT = 550

export function squarify<T extends { value: number }>(
  nodes: T[],
  x: number,
  y: number,
  width: number,
  height: number,
): LayoutRect<T>[] {
  if (nodes.length === 0) return []
  if (width <= 0 || height <= 0) return []

  const total = nodes.reduce((sum, node) => sum + Math.max(node.value, 0), 0)
  if (total === 0) return []

  const result: LayoutRect<T>[] = []
  let remainingNodes = [...nodes].sort((left, right) => right.value - left.value)
  let curX = x
  let curY = y
  let curW = width
  let curH = height
  const scale = (width * height) / total

  while (remainingNodes.length > 0) {
    const isVertical = curW < curH
    const length = isVertical ? curW : curH
    let i = 1
    let worst = Infinity

    while (i <= remainingNodes.length) {
      const row = remainingNodes.slice(0, i)
      const rowTotal = row.reduce((sum, node) => sum + node.value, 0)
      const thickness = (rowTotal * scale) / length
      const rowWorst = Math.max(
        ...row.map((node) => {
          const side = (node.value * scale) / thickness
          return Math.max(thickness / side, side / thickness)
        }),
      )

      if (rowWorst <= worst) {
        worst = rowWorst
        i += 1
      } else {
        i -= 1
        break
      }
    }

    if (i > remainingNodes.length) i = remainingNodes.length
    if (i === 0) i = 1

    const row = remainingNodes.slice(0, i)
    const rowTotal = row.reduce((sum, node) => sum + node.value, 0)
    const thickness = (rowTotal * scale) / length
    let rowCursor = 0

    row.forEach((node) => {
      const side = (node.value * scale) / thickness
      if (isVertical) {
        result.push({ node, x: curX + rowCursor, y: curY, width: side, height: thickness })
        rowCursor += side
      } else {
        result.push({ node, x: curX, y: curY + rowCursor, width: thickness, height: side })
        rowCursor += side
      }
    })

    remainingNodes = remainingNodes.slice(i)
    if (isVertical) {
      curY += thickness
      curH -= thickness
    } else {
      curX += thickness
      curW -= thickness
    }
  }

  return result
}
