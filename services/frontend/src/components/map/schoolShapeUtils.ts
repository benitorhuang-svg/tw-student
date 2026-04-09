export function getSchoolShapePath(level: string, r: number) {
  if (level === '國中') {
    // Square
    return `M ${-r} ${-r} L ${r} ${-r} L ${r} ${r} L ${-r} ${r} Z`
  }
  if (level === '高中職') {
    // Triangle (Slightly larger to match circle weight)
    const s = r * 1.3
    return `M 0 ${-s} L ${-s} ${s * 0.8} L ${s} ${s * 0.8} Z`
  }
  if (level === '大專') {
    // Diamond
    const s = r * 1.4
    return `M 0 ${-s} L ${-s} 0 L 0 ${s} L ${s} 0 Z`
  }
  return null 
}
