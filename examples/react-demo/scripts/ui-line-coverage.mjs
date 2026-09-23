#!/usr/bin/env node

// Line coverage of src from the Playwright suite, for information (not a gate). Run it
// with `npm run test:ui:lines`, which runs the suite with UI_LINE_COVERAGE set so every
// test saves the browser's V8 coverage of the demo's modules to test-results/v8-coverage.
// This script maps those byte ranges back to lines of src through the inline source maps
// the dev server serves. It covers code that runs in the browser; server-function
// handlers run in Node and are not counted.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const coverageDir = path.join(root, 'test-results', 'v8-coverage')
if (!existsSync(coverageDir)) {
  console.error('No coverage recorded. Run `npm run test:ui:lines`.')
  process.exit(1)
}

const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function decodeMappings(mappings) {
  const lines = []
  let sourceIndex = 0
  let originalLine = 0
  let originalColumn = 0
  for (const lineText of mappings.split(';')) {
    const segments = []
    let generatedColumn = 0
    for (const segment of lineText.split(',')) {
      if (!segment) continue
      const values = []
      let value = 0
      let shift = 0
      for (const char of segment) {
        const digit = base64.indexOf(char)
        value += (digit & 31) << shift
        if (digit & 32) shift += 5
        else {
          values.push(value & 1 ? -(value >>> 1) : value >>> 1)
          value = 0
          shift = 0
        }
      }
      generatedColumn += values[0]
      if (values.length >= 4) {
        sourceIndex += values[1]
        originalLine += values[2]
        originalColumn += values[3]
        segments.push({ generatedColumn, sourceIndex, originalLine })
      }
    }
    lines.push(segments)
  }
  return lines
}

/** Per character, the execution count of the innermost V8 range that contains it. */
function characterCounts(source, functions) {
  const counts = new Int32Array(source.length).fill(1)
  const ranges = functions.flatMap((fn) => fn.ranges).sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset))
  for (const range of ranges) counts.fill(range.count, range.startOffset, Math.min(range.endOffset, source.length))
  return counts
}

// file -> line -> covered (true once any mapped code on it ran)
const files = new Map()
const seen = new Map()
for (const name of readdirSync(coverageDir)) {
  for (const entry of JSON.parse(readFileSync(path.join(coverageDir, name), 'utf8'))) {
    const key = entry.url
    const previous = seen.get(key)
    if (previous) {
      // Same module in another test: merge its counts into the one already read.
      const counts = characterCounts(entry.source, entry.functions)
      for (let at = 0; at < counts.length; at += 1) if (counts[at] > 0) previous.counts[at] = 1
      continue
    }
    seen.set(key, { source: entry.source, counts: characterCounts(entry.source, entry.functions) })
  }
}

for (const [url, { source, counts }] of seen) {
  const map = source.match(/\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,([A-Za-z0-9+/=]+)\s*$/)
  if (!map) continue
  const sourceMap = JSON.parse(Buffer.from(map[1], 'base64').toString('utf8'))
  const lineStarts = [0]
  for (let at = 0; at < source.length; at += 1) if (source[at] === '\n') lineStarts.push(at + 1)
  const modulePath = new URL(url).pathname
  decodeMappings(sourceMap.mappings).forEach((segments, generatedLine) => {
    segments.forEach((segment, index) => {
      // A route split into chunks (`search.tsx?tsr-split=component`) counts as its file.
      const sourcePath = sourceMap.sources[segment.sourceIndex]?.split('?', 1)[0]
      if (!sourcePath || !/\.tsx?$/.test(sourcePath) || sourcePath.endsWith('routeTree.gen.ts')) return
      const file = sourcePath.includes('/src/')
        ? path.join(root, 'src', sourcePath.split('/src/').pop())
        : path.join(root, path.posix.resolve(path.posix.dirname(modulePath), sourcePath))
      if (!file.startsWith(path.join(root, 'src'))) return
      const start = lineStarts[generatedLine] + segment.generatedColumn
      const end = index + 1 < segments.length ? lineStarts[generatedLine] + segments[index + 1].generatedColumn : (lineStarts[generatedLine + 1] ?? source.length) - 1
      let ran = false
      for (let at = start; at < Math.max(start + 1, end) && at < counts.length; at += 1) if (counts[at] > 0) { ran = true; break }
      const lines = files.get(file) ?? new Map()
      lines.set(segment.originalLine + 1, (lines.get(segment.originalLine + 1) ?? false) || ran)
      files.set(file, lines)
    })
  })
}

let covered = 0
let total = 0
const rows = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, lines]) => {
  const fileCovered = [...lines.values()].filter(Boolean).length
  covered += fileCovered
  total += lines.size
  return { file: path.relative(root, file), covered: fileCovered, total: lines.size }
})
const percent = (part, whole) => (whole ? Math.floor((part / whole) * 1000) / 10 : 100).toFixed(1)
const width = Math.max(...rows.map(({ file }) => file.length), 4)
const report = [
  `${'File'.padEnd(width)}  Lines covered`,
  ...rows.map(({ file, covered: c, total: t }) => `${file.padEnd(width)}  ${String(c).padStart(4)}/${String(t).padEnd(4)} ${percent(c, t).padStart(5)}%`),
  '',
  `Browser line coverage of src: ${covered}/${total} (${percent(covered, total)}%)`,
].join('\n')
writeFileSync(path.join(root, 'test-results', 'ui-line-coverage.txt'), `${report}\n`)
console.log(report)
