import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const srcRoot = path.join(projectRoot, 'src')
const sourceExtensions = new Set(['.ts', '.tsx'])
const styleExtensions = new Set(['.css'])
const ignoredDirs = new Set(['node_modules', 'dist', 'coverage'])

const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?from\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|new\s+URL\(\s*["']([^"']+)["']/g

const sourceFiles = collectFiles(srcRoot).filter((filePath) => sourceExtensions.has(path.extname(filePath)))
const styleFiles = collectFiles(srcRoot).filter((filePath) => styleExtensions.has(path.extname(filePath)))
const sourceFileSet = new Set(sourceFiles)
const dependencyGraph = new Map()
const violations = []

for (const filePath of sourceFiles) {
  const imports = parseImports(filePath)
  const resolvedImports = []

  for (const importInfo of imports) {
    const resolved = resolveImport(filePath, importInfo.specifier)
    if (!resolved) continue
    if (sourceExtensions.has(path.extname(resolved))) {
      resolvedImports.push(resolved)
    }
    checkImportBoundary(filePath, importInfo.specifier, resolved)
  }

  dependencyGraph.set(filePath, resolvedImports)
}

checkLegacyRootDirectories()
checkSharedUiBusinessFiles()
checkCssImports()
checkCycles()
checkReachability()

if (violations.length > 0) {
  console.error('Architecture check failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      files: sourceFiles.length,
      cssFiles: styleFiles.length,
      checkedRules: [
        'layer boundaries',
        'domain public API imports',
        'cross-layer relative imports',
        'root legacy directories',
        'shared UI business leakage',
        'CSS import resolution',
        'import cycles',
        'main import reachability',
      ],
    },
    null,
    2,
  ),
)

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return []

  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

function parseImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const imports = []
  let match
  while ((match = importPattern.exec(source))) {
    imports.push({ specifier: match[1] ?? match[2] ?? match[3] })
  }
  return imports
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith('@/')) {
    return resolveExistingPath(path.join(srcRoot, specifier.slice(2)))
  }

  if (specifier.startsWith('.')) {
    return resolveExistingPath(path.resolve(path.dirname(fromFile), specifier))
  }

  return null
}

function resolveExistingPath(basePath) {
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

function checkImportBoundary(fromFile, specifier, toFile) {
  if (!toFile.startsWith(srcRoot)) return

  const from = classifySourceFile(fromFile)
  const to = classifySourceFile(toFile)

  if (from.layer === 'shared' && (to.layer === 'app' || to.layer === 'domains')) {
    addViolation('shared must not depend on app/domains', fromFile, specifier, toFile)
  }

  if (from.layer === 'domains' && to.layer === 'app') {
    addViolation('domain must not depend on app', fromFile, specifier, toFile)
  }

  if (from.layer === 'domains' && to.layer === 'domains' && from.domain !== to.domain) {
    addViolation('domain must not import another domain directly', fromFile, specifier, toFile)
  }

  if (specifier.startsWith('.') && from.layer !== to.layer) {
    addViolation('relative imports must stay inside the same layer', fromFile, specifier, toFile)
  }

  if (specifier.startsWith('.') && from.layer === 'domains' && to.layer === 'domains' && from.domain !== to.domain) {
    addViolation('relative imports must not cross domain boundaries', fromFile, specifier, toFile)
  }

  if (from.layer !== 'domains' && isDeepDomainImport(specifier)) {
    addViolation('code outside a domain must import domains through public APIs', fromFile, specifier, toFile)
  }
}

function classifySourceFile(filePath) {
  const [layer, domain] = toSourceRelativePath(filePath).split('/')
  if (layer === 'domains') return { layer, domain }
  if (['app', 'shared', 'types'].includes(layer)) return { layer, domain: null }
  return { layer: 'root', domain: null }
}

function isDeepDomainImport(specifier) {
  if (!specifier.startsWith('@/domains/')) return false
  return specifier.split('/').length > 3
}

function checkLegacyRootDirectories() {
  const legacyPattern = /^(components|hooks|lib|data|layouts|styles)\//
  for (const filePath of [...sourceFiles, ...styleFiles]) {
    const relativePath = toSourceRelativePath(filePath)
    if (legacyPattern.test(relativePath)) {
      violations.push(`legacy root src directory is not allowed: ${toProjectRelativePath(filePath)}`)
    }
  }
}

function checkSharedUiBusinessFiles() {
  const businessNamePattern =
    /School|school|Atlas|atlas|County|county|Township|township|Scenario|scenario|Education|education|Governance|governance|Map|map/

  for (const filePath of sourceFiles) {
    const relativePath = toSourceRelativePath(filePath)
    if (!relativePath.startsWith('shared/ui/')) continue
    if (!businessNamePattern.test(path.basename(filePath))) continue
    violations.push(`shared UI contains business-specific file: ${toProjectRelativePath(filePath)}`)
  }
}

function checkCssImports() {
  const cssImportPattern = /@import\s+(?:url\()?["']?([^"')]+)["']?\)?/g

  for (const filePath of styleFiles) {
    const source = fs.readFileSync(filePath, 'utf8')
    let match
    while ((match = cssImportPattern.exec(source))) {
      const specifier = match[1]
      if (specifier.startsWith('http://') || specifier.startsWith('https://')) continue

      const resolved = specifier.startsWith('/src/')
        ? path.join(projectRoot, specifier.slice(1))
        : path.resolve(path.dirname(filePath), specifier)

      if (!fs.existsSync(resolved)) {
        violations.push(
          `CSS import cannot be resolved: ${toProjectRelativePath(filePath)} imports ${specifier}`,
        )
      }
    }
  }
}

function checkCycles() {
  const state = new Map()
  const stack = []

  for (const filePath of sourceFiles) {
    if (!state.has(filePath)) visit(filePath)
  }

  function visit(filePath) {
    state.set(filePath, 'visiting')
    stack.push(filePath)

    for (const dependency of dependencyGraph.get(filePath) ?? []) {
      if (!sourceFileSet.has(dependency)) continue
      if (!state.has(dependency)) {
        visit(dependency)
        continue
      }

      if (state.get(dependency) === 'visiting') {
        const cycleStart = stack.indexOf(dependency)
        const cycle = stack.slice(cycleStart).concat(dependency).map(toProjectRelativePath).join(' -> ')
        violations.push(`import cycle detected: ${cycle}`)
      }
    }

    stack.pop()
    state.set(filePath, 'visited')
  }
}

function checkReachability() {
  const mainEntry = path.join(srcRoot, 'main.tsx')
  const reachable = new Set()
  markReachable(mainEntry)

  for (const filePath of sourceFiles) {
    if (reachable.has(filePath)) continue
    if (filePath.endsWith('.d.ts')) continue
    violations.push(`source file is not reachable from main.tsx: ${toProjectRelativePath(filePath)}`)
  }

  function markReachable(filePath) {
    if (!filePath || reachable.has(filePath) || !sourceFileSet.has(filePath)) return
    reachable.add(filePath)
    for (const dependency of dependencyGraph.get(filePath) ?? []) {
      markReachable(dependency)
    }
  }
}

function addViolation(message, fromFile, specifier, toFile) {
  violations.push(
    `${message}: ${toProjectRelativePath(fromFile)} imports ${specifier} -> ${toProjectRelativePath(toFile)}`,
  )
}

function toSourceRelativePath(filePath) {
  return path.relative(srcRoot, filePath).replaceAll(path.sep, '/')
}

function toProjectRelativePath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/')
}
