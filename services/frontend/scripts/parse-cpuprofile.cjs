#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const file = process.argv[2] || path.resolve(__dirname, '../../test-results/profile-taichung.cpuprofile')
let raw
try {
  raw = fs.readFileSync(file, 'utf8')
} catch (err) {
  console.error('Failed to read file', file, err.message)
  process.exit(2)
}

let profile
try {
  profile = JSON.parse(raw)
} catch (err) {
  console.error('Failed to parse JSON profile:', err.message)
  process.exit(2)
}

const nodes = profile.nodes || []
const samples = profile.samples || []
const timeDeltas = profile.timeDeltas || profile.timestamps || []

const nodeMap = new Map()
nodes.forEach((n) => nodeMap.set(String(n.id), n))

const agg = new Map()
if (timeDeltas && timeDeltas.length === samples.length && timeDeltas.length > 0) {
  for (let i = 0; i < samples.length; i++) {
    const id = String(samples[i])
    const dt = Number(timeDeltas[i] || 1)
    agg.set(id, (agg.get(id) || 0) + dt)
  }
} else {
  // fallback: count sample occurrences
  for (const s of samples) {
    const id = String(s)
    agg.set(id, (agg.get(id) || 0) + 1)
  }
}

const rows = Array.from(agg.entries()).map(([id, value]) => ({ id, value, node: nodeMap.get(id) }))
rows.sort((a, b) => b.value - a.value)

const total = rows.reduce((s, r) => s + r.value, 0)
console.log('Total sample metric (unit depends on profile):', total)
console.log('Top 20 hottest nodes:')
rows.slice(0, 20).forEach((r, idx) => {
  const frame = r.node?.callFrame || {}
  const name = frame.functionName || '(anonymous)'
  const url = frame.url || ''
  const line = frame.lineNumber != null ? frame.lineNumber + 1 : ''
  console.log(`${String(idx + 1).padStart(2)}. ${name} @ ${url}:${line} -> ${r.value}`)
})

console.log('\nTop 3 summary:')
rows.slice(0, 3).forEach((r, idx) => {
  const frame = r.node?.callFrame || {}
  const name = frame.functionName || '(anonymous)'
  const url = frame.url || ''
  const line = frame.lineNumber != null ? frame.lineNumber + 1 : ''
  console.log(`${idx + 1}. ${name} (${url}:${line}) — metric=${r.value}`)
})

process.exit(0)
