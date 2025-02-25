type SupportedLang = keyof typeof parserPaths
import init, { setupParser, initializeTreeSitter, findNodes, fixErrors } from 'ast-grep-wasm'

const parserPaths = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  // not so well supported lang...
  c: 'tree-sitter-c.wasm',
  csharp: 'tree-sitter-c_sharp.wasm',
  cpp: 'tree-sitter-cpp.wasm',
  dart: 'tree-sitter-dart.wasm',
  go: 'tree-sitter-go.wasm',
  html: 'tree-sitter-html.wasm',
  java: 'tree-sitter-java.wasm',
  python: 'tree-sitter-python.wasm',
  ruby: 'tree-sitter-ruby.wasm',
  rust: 'tree-sitter-rust.wasm',
  scala: 'tree-sitter-scala.wasm',
  swift: 'tree-sitter-swift.wasm',
}

export const languageDisplayNames: Record<SupportedLang, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  // not so well supported lang...
  c: 'C',
  csharp: 'C#',
  cpp: 'C++',
  dart: 'Dart',
  go: 'Go',
  html: 'HTML',
  java: 'Java',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  scala: 'Scala',
  swift: 'Swift',
}

export async function initializeParser() {
  await init()
  await initializeTreeSitter()
}

export async function setGlobalParser(lang: string) {
  const path = parserPaths[lang]
  await setupParser(lang, path)
}

export type Match = {
  type: 'rule',
  severity: string,
  message: string,
  rule: string,
  env: any,
  range: [number, number, number, number],
} | {
  type: 'simple',
  env: any,
  range: [number, number, number, number],
}

function shouldDisplayDiagnostic(rule: any) {
  return (
    !/test-rule-\d+/.test(rule.id) &&
    rule.message &&
    ['info', 'warning', 'error'].includes(rule.severity)
  )
}

export async function doFind(src: string, json: any[]): Promise<[Match[], string]> {
  if (!src || !json) {
    return [[], src]
  }
  const result = await findNodes(src, json)
  let matches: Match[] = []
  for (let [ruleId, nodes] of result.entries()) {
    for (let rule of json) {
      if (rule.id !== ruleId) {
        continue;
      }
      if (shouldDisplayDiagnostic(rule)) {
        for (let nm of nodes) {
          matches.push({
            type: 'rule',
            rule: rule.id,
            severity: rule.severity,
            message: rule.message,
            range: nm.node.range,
            env: nm.env,
          })
        }
      } else {
        for (let nm of nodes) {
          matches.push({
            type: 'simple',
            range: nm.node.range,
            env: nm.env,
          })
        }
      }
      break;
    }
  }
  const fixed = fixErrors(src, json)
  return [matches, fixed]
}