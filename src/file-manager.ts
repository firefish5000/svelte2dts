import fs from 'fs'
import path from 'path'

import ts from 'typescript'
import { isSubpathOf ,relPathJson } from './utils'
import { compileTsDeclarations ,RequiredCompilerOptions } from './lib'

async function* walk(dir: string): AsyncGenerator<string> {
  if (!fs.existsSync(dir)) {
    throw new Error(`srcDir: ${JSON.stringify(dir)} does not exist!`)
  }
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir ,d.name)
    if (d.isDirectory()) yield* walk(entry)
    else if (d.isFile()) yield entry
  }
}

interface PreprocessSvelteOptions {
  dryRun: boolean
  overwrite: boolean
  autoGenerate: boolean
  runOnTs: boolean
  runOnJs: boolean
  srcDirs: string[]
  outDir: string
  compilerOptions: RequiredCompilerOptions
  svelteExtensions: string[]
}

// eslint-disable-next-line import/prefer-default-export
export async function preprocessSvelte({
  dryRun = false
  ,overwrite = false
  ,outDir: outDirArg
  ,srcDirs: srcDirArgs
  ,svelteExtensions = ['.svelte']
  ,compilerOptions
  ,runOnTs = false
  ,runOnJs = false
}: PreprocessSvelteOptions): Promise<void> {
  const targetPaths: string[] = []
  const srcDirs = srcDirArgs
  const outDir = outDirArg
  const targetExtensions = [
    ...svelteExtensions
    ,...((true || runOnTs) ? ['.ts' ,'.tsx'] : [])
    ,...(runOnJs ? ['.js' ,'.jsx'] : [])
  ]
  const isTargetPath = (filePath: string) => targetExtensions.some((ext) => filePath.endsWith(ext))
  for await (const srcDir of srcDirs) {
    for await (const filePath of walk(srcDir)) {
      if (isTargetPath(filePath)) {
        targetPaths.push(filePath)
      }
    }
  }
  const createdFiles = new Set<string>()
  const writer: ts.WriteFileCallback = (dest ,dtsCode ,writeByteOrderMark) => {
    if (!isSubpathOf(dest ,outDir)) throw new Error(`Attempt to create typing file outside of declarationDir! ${relPathJson(dest)}`)

    if (dtsCode === undefined) {
      console.error(`Failed to generate d.ts file ${relPathJson(dest)}`)
    }
    if (
      (fs.existsSync(dest))
       && !overwrite
    ) throw new Error(`Typing file ${relPathJson(dest)} already exists! (consider enabling '--overwrite')`)
    // TODO: Check if this is even possible
    if (createdFiles.has(dest)) {
      throw new Error(`Typing file ${relPathJson(dest)} was created twice!`
    + ' If you use composite tyupescript projects, check if multiple projects have files with the'
    + ' same path being written to the same declarationDirectory')
    }

    if (!runOnTs
        && !svelteExtensions.some((ext) => dest.endsWith(`${ext}.d.ts`))
    ) {
      console.log(`Skipping ${relPathJson(dest)}`)
      return
    }
    createdFiles.add(dest)
    console.log(`Writing ${relPathJson(dest)}${dryRun ? ' (dry run)' : ''}`)

    if (!dryRun) {
      ts.sys.writeFile(dest ,dtsCode ,writeByteOrderMark)
      // fs.mkdirSync(path.dirname(dest) ,{ recursive: true })
      // fs.writeFileSync(dest ,dtsCode)
    }
  }

  compileTsDeclarations({
    targetFiles: targetPaths
    ,svelteExtensions
    ,compilerOptions
    ,writeFile: writer
  })
}
