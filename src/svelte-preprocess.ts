import fs from 'fs'
import path from 'path'

import { relPathJson } from './utils'
import { generateComponentDeclarations } from './lib'

async function* walk(dir: string): AsyncGenerator<string> {
  if (!fs.existsSync(dir)) {
    throw new Error(`srcDir: ${JSON.stringify(dir)} does not exist!`)
  }
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir ,d.name)
    if (d.isDirectory()) yield* await walk(entry)
    else if (d.isFile()) yield entry
  }
}

function conversionMsg(srcPath: string ,destPath: string ,dryRun: boolean) {
  return `${
    relPathJson(srcPath)
  } -> ${
    relPathJson(destPath)
  }.${
    dryRun ? ' (dry run)' : ''
  }`
}

interface PreprocessSvelteOptions {
  dryRun: boolean
  overwrite: boolean
  autoGenerate: boolean
  runOnTs: boolean
  runOnJs: boolean
  srcDir: string
  outDir: string
  strict: boolean
  svelteExtensions: string[]
}
// eslint-disable-next-line import/prefer-default-export
export async function preprocessSvelte({
  dryRun = false
  ,overwrite = false
  ,autoGenerate = false
  ,outDir: outDirArg
  ,srcDir: srcDirArg
  ,svelteExtensions = ['.svelte']
  ,strict = false
  ,runOnTs = false
  ,runOnJs = false
}: PreprocessSvelteOptions): Promise<void> {
  const targetPaths: string[] = []
  const srcDir = path.resolve(srcDirArg)
  const outDir = path.resolve(outDirArg)
  const targetExtensions = [
    ...svelteExtensions
    ,...(runOnTs ? ['.ts' ,'.tsx'] : [])
    ,...(runOnJs ? ['.js' ,'.jsx'] : [])
  ]
  const isTargetPath = (filePath: string) => targetExtensions.some((ext) => filePath.endsWith(ext))
  for await (const filePath of walk(srcDir)) {
    if (isTargetPath(filePath)) {
      targetPaths.push(filePath)
    }
  }
  const { tsxMap ,extraFiles } = generateComponentDeclarations(
    targetPaths
    ,srcDir
    ,outDir
    ,strict
    ,(componentPath) => {
      if (!autoGenerate) return false
      return isTargetPath(componentPath)
    }
  )

  const createdFiles = new Map<string ,string>()
  for (const { dtsCode ,dest ,componentPath } of Object.values(tsxMap)) {
    if (!dest.startsWith(outDir)) throw new Error(`Attempt to create typing file outside of declarationdir! ${relPathJson(componentPath)} -> ${relPathJson(dest)}`)
    if (dtsCode === undefined) {
      console.error(`Failed to generate d.ts file for ${relPathJson(componentPath)}`)
    }
    if (
      (fs.existsSync(dest) || createdFiles.has(dest))
       && !overwrite
    ) throw new Error(`Failed to write typings for ${relPathJson(componentPath)}. Typing file ${relPathJson(dest)} already exists!`)
    createdFiles.set(dest ,componentPath)
  }
  for (const { dtsCode ,dest ,componentPath } of Object.values(extraFiles)) {
    if (!isTargetPath(componentPath)) continue
    if (!dest.startsWith(outDir)) throw new Error(`Attempt to create typing file outside of declarationdir! ${relPathJson(componentPath)} -> ${relPathJson(dest)}`)

    if (dtsCode === undefined) {
      console.error(`Failed to generate d.ts file for ${relPathJson(componentPath)}`)
    }
    if (
      (fs.existsSync(dest) || createdFiles.has(dest))
       && !overwrite
    ) throw new Error(`Failed to write typings for ${relPathJson(componentPath)}. Typing file ${relPathJson(dest)} already exists!`)
    createdFiles.set(dest ,componentPath)
  }
  // Write the d.ts files that we are interested in
  for (const { dtsCode ,dest ,componentPath ,code } of Object.values(tsxMap)) {
    if (dtsCode === undefined) continue

    console.log(conversionMsg(componentPath ,dest ,dryRun))
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest) ,{ recursive: true })
      fs.writeFileSync(dest ,dtsCode)
      // fs.writeFileSync(`${dest}.tsx` ,code)
    }
  }
  for (const { dtsCode ,dest ,componentPath ,code } of Object.values(extraFiles)) {
    if (!isTargetPath(componentPath)) continue
    if (!dest.startsWith(srcDir)) continue

    if (dtsCode === undefined) continue

    console.log(conversionMsg(componentPath ,dest ,dryRun))
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest) ,{ recursive: true })
      fs.writeFileSync(dest ,dtsCode)
    }
  }
}
