#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

import { relativePath ,relPathJson } from './utils'
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
    JSON.stringify(relativePath(srcPath))
  } -> ${
    JSON.stringify(relativePath(destPath))
  }.${
    dryRun ? ' (dry run)' : ''
  }`
}

interface PreprocessSvelteOptions {
  dryRun: boolean
  overwrite: boolean
  autoGenerate: boolean
  srcDir: string
  outDir: string
  extensions: string[]
}
// eslint-disable-next-line import/prefer-default-export
export async function preprocessSvelte({
  dryRun = false
  ,overwrite = false
  ,autoGenerate = false
  ,outDir: outDirArg
  ,srcDir: srcDirArg
  ,extensions = ['.svelte']
}: PreprocessSvelteOptions): Promise<void> {
  const componentPaths: string[] = []
  const srcDir = path.resolve(srcDirArg)
  const outDir = path.resolve(outDirArg)
  for await (const filePath of walk(srcDir)) {
    if (extensions.some((ext) => filePath.endsWith(ext))) {
      componentPaths.push(filePath)
    }
  }
  const tsxMap = generateComponentDeclarations(
    componentPaths
    ,srcDir
    ,outDir
    ,(componentPath) => {
      if (!autoGenerate) return false
      if (extensions.some((ext) => componentPath.endsWith(ext))) {
        return true
      }
      return false
    }
  )

  const createdFiles = new Map<string ,string>()
  for (const { dtsCode ,dest ,componentPath } of Object.values(tsxMap)) {
    if (dtsCode !== undefined) {
      if (
        (fs.existsSync(dest) || createdFiles.has(dest))
       && !overwrite
      ) throw new Error(`Failed to write typings for ${relPathJson(componentPath)}. Typing file ${relPathJson(dest)} already exists!`)
      createdFiles.set(dest ,componentPath)
    }
    else {
      console.error(`Failed to generate d.ts file for ${relPathJson(componentPath)}`)
    }
  }
  // Write the d.ts files that we are interested in
  for (const { dtsCode ,dest ,componentPath } of Object.values(tsxMap)) {
    if (dtsCode !== undefined) {
      console.log(conversionMsg(componentPath ,dest ,dryRun))
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dest) ,{ recursive: true })
        fs.writeFileSync(dest ,dtsCode)
      }
    }
  }
}
