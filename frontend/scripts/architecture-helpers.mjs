import fs from 'node:fs'
import path from 'node:path'

const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?from\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|new\s+URL\(\s*["']([^"']+)["']/g

export function collectFiles(directory, ignoredDirs) {
  if (!fs.existsSync(directory)) return []

  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, ignoredDirs))
    } else {
      files.push(fullPath)
    }
  }
  return files.sort()
}

export function parseImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const imports = []
  let match
  while ((match = importPattern.exec(source))) {
    imports.push({ specifier: match[1] ?? match[2] ?? match[3] })
  }
  return imports
}

export function resolveExistingPath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.d.ts`,
    `${basePath}.css`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null
}

export function countSourceLines(source) {
  if (source.length === 0) return 0

  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const trimmedFinalNewline = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized
  return trimmedFinalNewline.split('\n').length
}
