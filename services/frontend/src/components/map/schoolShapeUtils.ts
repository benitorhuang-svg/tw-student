
export function getSchoolShapePath(level: string, r: number) {
  if (level === '國中') {
    // Square
    return `M ${-r} ${-r} L ${r} ${-r} L ${r} ${r} L ${-r} ${r} Z`
  }
  if (level === '高中職') {
    // Triangle
    return `M 0 ${-r * 1.2} L ${-r} ${r} L ${r} ${r} Z`
  }
  if (level === '大專') {
    // Diamond
    return `M 0 ${-r * 1.3} L ${-r} 0 L 0 ${r * 1.3} L ${r} 0 Z`
  }
  // Elementary or default: Circle
  // Circle path is more complex to write manually, but we can use an actual <circle> tag.
  return null 
}
