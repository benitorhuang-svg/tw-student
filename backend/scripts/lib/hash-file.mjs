import { createHash } from 'node:crypto'

export function toPrettyJsonBuffer(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8')
}

export function hashBuffer(buffer) {
  return `sha256-${createHash('sha256').update(buffer).digest('hex')}`
}

export function hashPrettyJson(value) {
  return hashBuffer(toPrettyJsonBuffer(value))
}

export function buildCompositeHash(entries) {
  const payload = entries
    .map((entry) => `${entry.path}:${entry.hash}`)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .join('\n')

  return hashBuffer(Buffer.from(payload, 'utf8'))
}
