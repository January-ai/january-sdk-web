#!/usr/bin/env node

// Fails unless every test ID the demo declares is exercised by at least one spec in
// tests/ui: clicked, filled, or asserted on. It reads the source and the specs as text,
// so it runs in a second and needs no browser.
//
//   node scripts/ui-coverage.mjs          # summary and the uncovered list
//   node scripts/ui-coverage.mjs --list   # also every declared ID and whether it is covered
//
// Declared IDs are string literals given to `data-testid`, to the `*TestId` props the
// shared components forward to `data-testid`, and to `testId:` in option lists. An ID
// built from a template or from a prefix prop has no literal, so it must be listed in
// TEMPLATES or PREFIXES below; an unlisted one fails the check, so a new pattern cannot
// slip past it.

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const sourceRoot = path.join(root, 'src')
const specRoot = path.join(root, 'tests', 'ui')

/**
 * Templated IDs in the source, keyed by their template text. `pattern` is covered when a
 * spec exercises any ID it matches (`example` is one such ID). `derived` templates are
 * built from a prefix prop and are covered through PREFIXES instead.
 */
const TEMPLATES = {
  'food-result-${index}': { pattern: /^food-result-\d+$/, example: 'food-result-0' },
  'restaurant-result-${index}': { pattern: /^restaurant-result-\d+$/, example: 'restaurant-result-0' },
  'restaurant-menu-item-${index}': { pattern: /^restaurant-menu-item-\d+$/, example: 'restaurant-menu-item-0' },
  'food-picker-result-${index}': { pattern: /^food-picker-result-\d+$/, example: 'food-picker-result-0' },
  'food-log-food-${index}': { pattern: /^food-log-food-\d+$/, example: 'food-log-food-0' },
  'food-log-${index}': { pattern: /^food-log-\d+$/, example: 'food-log-0' },
  'tracking-meal-${index}': { pattern: /^tracking-meal-\d+$/, example: 'tracking-meal-0' },
  'alternative-${index}': { pattern: /^alternative-\d+$/, example: 'alternative-0' },
  'scan-detection-${index}': { pattern: /^scan-detection-\d+$/, example: 'scan-detection-0' },
  'diet-restriction-${option.value}': { pattern: /^diet-restriction-[a-z0-9_]+$/, example: 'diet-restriction-gluten' },
  'diet-preference-${option.value}': { pattern: /^diet-preference-[a-z0-9_]+$/, example: 'diet-preference-vegan' },
  // Every ErrorMessage with a test ID also marks its message body.
  '${testId}-details-body': { pattern: /^[a-z0-9-]+-details-body$/, example: 'water-log-add-error-details-body' },
  '${itemTestIdPrefix}-${index}': { derived: true },
  '${idPrefix}-range-${option.value}': { derived: true },
  '${idPrefix}-retry': { derived: true },
  '${idPrefix}-error': { derived: true },
  '${idPrefix}-loading': { derived: true },
  '${idPrefix}-empty': { derived: true },
}

/**
 * Prefix props (`testIdPrefix`, `itemTestIdPrefix`, `idPrefix`) and the IDs each one
 * produces: a list when the set is fixed, or a pattern for indexed rows.
 */
const PREFIXES = {
  'search-scope': ['search-scope-foods', 'search-scope-restaurants'],
  'search-mode': ['search-mode-name', 'search-mode-barcode'],
  'autocomplete-result': { pattern: /^autocomplete-result-\d+$/, example: 'autocomplete-result-0' },
  'food-picker-suggestion': { pattern: /^food-picker-suggestion-\d+$/, example: 'food-picker-suggestion-0' },
  'weight-chart': ['week', 'month', 'year'].map((range) => `weight-chart-range-${range}`)
    .concat(['loading', 'error', 'retry', 'empty'].map((state) => `weight-chart-${state}`)),
  'water-chart': ['week', 'month', 'year'].map((range) => `water-chart-range-${range}`)
    .concat(['loading', 'error', 'retry', 'empty'].map((state) => `water-chart-${state}`)),
}

const ID_PROPS = /\b(data-testid|testId|busyTestId|retryTestId|inputTestId|voiceTestId)\s*(=|:)\s*/g
const PREFIX_PROPS = /\b(testIdPrefix|itemTestIdPrefix|idPrefix)\s*=\s*["']([^"']+)["']/g
const EXERCISE = /\bexpect(?:\.poll)?\(|\.(?:click|dblclick|fill|press|pressSequentially|type|check|uncheck|selectOption|setInputFiles|hover|focus|tap|dispatchEvent|waitFor)\(/

async function files(directory, accept) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await files(absolute, accept))
    else if (accept(entry.name)) found.push(absolute)
  }
  return found.sort()
}

/** The expression that starts at `index`: a quoted literal, a template, or a `{…}` block. */
function valueAt(source, index) {
  const open = source[index]
  if (open === '"' || open === "'") return source.slice(index, source.indexOf(open, index + 1) + 1)
  if (open === '`') return source.slice(index, source.indexOf('`', index + 1) + 1)
  if (open !== '{') return ''
  let depth = 0
  for (let at = index; at < source.length; at += 1) {
    const char = source[at]
    if (char === '`') { at = source.indexOf('`', at + 1); continue }
    if (char === '{') depth += 1
    if (char === '}') { depth -= 1; if (depth === 0) return source.slice(index, at + 1) }
  }
  return ''
}

function literalsIn(expression) {
  const ids = []
  const templates = []
  // In `{kind === 'foods' ? 'search-loading' : 'restaurants-loading'}` only the branches are IDs.
  const branches = expression.replace(/`[^`]*`|"[^"]*"|'[^']*'/g, (text) => ' '.repeat(text.length)).indexOf('?')
  if (branches >= 0) expression = expression.slice(branches + 1)
  for (const match of expression.matchAll(/`([^`]*)`|"([^"]*)"|'([^']*)'/g)) {
    if (match[1] !== undefined) (match[1].includes('${') ? templates : ids).push(match[1])
    else ids.push(match[2] ?? match[3])
  }
  return { ids: ids.filter((id) => /^[a-z0-9][a-z0-9-]*$/.test(id)), templates }
}

async function declaredIds() {
  const declared = new Map()
  const problems = []
  const declare = (key, file, entry) => {
    const current = declared.get(key) ?? { ...entry, files: new Set() }
    current.files.add(path.relative(root, file))
    declared.set(key, current)
  }
  const sources = await files(sourceRoot, (name) => /\.tsx?$/.test(name) && !name.endsWith('.test.ts') && name !== 'routeTree.gen.ts')
  for (const file of sources) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(ID_PROPS)) {
      const { ids, templates } = literalsIn(valueAt(source, match.index + match[0].length))
      for (const id of ids) declare(id, file, { kind: 'id' })
      for (const template of templates) {
        const rule = TEMPLATES[template]
        if (!rule) problems.push(`${path.relative(root, file)}: templated test ID \`${template}\` is not listed in TEMPLATES`)
        else if (!rule.derived) declare(template, file, { kind: 'pattern', pattern: rule.pattern, example: rule.example })
      }
    }
    for (const match of source.matchAll(PREFIX_PROPS)) {
      const rule = PREFIXES[match[2]]
      if (!rule) problems.push(`${path.relative(root, file)}: test ID prefix "${match[2]}" is not listed in PREFIXES`)
      else if (Array.isArray(rule)) for (const id of rule) declare(id, file, { kind: 'id' })
      else declare(`${match[2]}-{n}`, file, { kind: 'pattern', pattern: rule.pattern, example: rule.example })
    }
  }
  return { declared, problems }
}

/**
 * Joins a statement that continues on the next line (a method chain, or an argument list
 * left open), so each entry is one whole statement.
 */
function statements(source) {
  const lines = []
  let depth = 0
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    const continues = lines.length > 0 && (depth > 0 || line.startsWith('.'))
    if (continues) lines[lines.length - 1] += ` ${line}`
    else lines.push(line)
    for (const char of line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '')) {
      if (char === '(' || char === '[') depth += 1
      if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
    }
    // A callback body opened inside a call (`test('…', async () => {`) is not a continuation.
    if (/=>\s*\{$|\)\s*\{$/.test(line)) depth = 0
  }
  return lines
}

function referencesIn(statement, aliases) {
  const found = []
  const literal = /(?:byId\(\s*\w+\s*,\s*|getByTestId\(\s*)(?:'([^']+)'|"([^"]+)"|`([^`]+)`|(\w+))|\[data-testid=["']([^"']+)["']\]/g
  for (const match of statement.matchAll(literal)) {
    if (match[1] ?? match[2] ?? match[5]) found.push(match[1] ?? match[2] ?? match[5])
    else if (match[3]) found.push(new RegExp(`^${match[3].replace(/\$\{[^}]+\}/g, '[a-z0-9_-]+')}$`))
    else if (match[4] && aliases.has(match[4])) found.push(...aliases.get(match[4]))
  }
  for (const [name, ids] of aliases) {
    if (new RegExp(`(?<![\\w.'"-])${name}\\b(?!\\s*=[^=])`).test(statement.replace(/byId\([^)]*\)|getByTestId\([^)]*\)/g, ''))) found.push(...ids)
  }
  return found
}

async function exercisedIds() {
  const exercised = []
  const specs = await files(specRoot, (name) => name.endsWith('.ts'))
  for (const file of specs) {
    // Names bound to a test ID, in source order: `const weight = byId(page, 'weight-chart')`,
    // `const ids = ['a', 'b']`, and the loop variable of `for (const id of ['a', 'b'])`.
    const aliases = new Map()
    for (const statement of statements(await readFile(file, 'utf8'))) {
      const assigned = statement.match(/^(?:const|let)\s+(\w+)\s*=\s*(.+)$/)
      if (assigned) {
        const ids = referencesIn(assigned[2], aliases)
        const list = /^\[.*\]$/.test(assigned[2].trim()) ? literalsIn(assigned[2]).ids : []
        if (ids.length || list.length) aliases.set(assigned[1], ids.length ? ids : list)
        else aliases.delete(assigned[1])
      }
      const loop = statement.match(/^for\s*\(\s*(?:const|let)\s+(\w+)\s+of\s+(\[[^\]]*\]|\w+)/)
      if (loop) aliases.set(loop[1], loop[2].startsWith('[') ? literalsIn(loop[2]).ids : aliases.get(loop[2]) ?? [])
      if (!EXERCISE.test(statement)) continue
      for (const reference of referencesIn(statement, aliases)) exercised.push({ reference, file: path.relative(root, file) })
    }
  }
  return exercised
}

const { declared, problems } = await declaredIds()
const exercised = await exercisedIds()
const matches = (reference, key, entry) => typeof reference === 'string'
  ? entry.kind === 'id' ? reference === key : entry.pattern.test(reference)
  : entry.kind === 'id' ? reference.test(key) : reference.test(entry.example)

const results = [...declared].sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => ({
  key,
  entry,
  specs: [...new Set(exercised.filter(({ reference }) => matches(reference, key, entry)).map(({ file }) => file))],
}))
const covered = results.filter(({ specs }) => specs.length > 0)
const uncovered = results.filter(({ specs }) => specs.length === 0)
const undeclared = [...new Set(exercised.map(({ reference }) => reference).filter((reference) => typeof reference === 'string'
  && ![...declared].some(([key, entry]) => matches(reference, key, entry))))].sort()

if (process.argv.includes('--list')) {
  for (const { key, specs } of results) console.log(`${specs.length ? 'covered  ' : 'UNCOVERED'}  ${key}${specs.length ? `  (${specs.length} spec${specs.length === 1 ? '' : 's'})` : ''}`)
  console.log('')
}
const percent = results.length ? Math.floor((covered.length / results.length) * 1000) / 10 : 100
console.log(`UI coverage: ${covered.length}/${results.length} (${percent}%)`)
if (uncovered.length) {
  console.log(`\nNot exercised by any spec in tests/ui (${uncovered.length}):`)
  for (const { key, entry } of uncovered) console.log(`  ${key}  [${[...entry.files].join(', ')}]`)
}
if (undeclared.length) {
  console.log(`\nReferenced by a spec but not declared in src (${undeclared.length}):`)
  for (const id of undeclared) console.log(`  ${id}`)
}
if (problems.length) {
  console.log(`\nUnrecognized test IDs (${problems.length}):`)
  for (const problem of problems) console.log(`  ${problem}`)
}
if (uncovered.length || undeclared.length || problems.length) process.exitCode = 1
