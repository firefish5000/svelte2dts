import fs from 'fs'

import ts from 'typescript'
import path from 'path'
import { getSourceFiles ,isSubpathOf ,relPathJson } from './utils'
import { compileTsDeclarations ,RequiredCompilerOptions } from './lib'

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
export function preprocessSvelte({
  dryRun = false
  ,overwrite = false
  ,outDir: outDirArg
  ,srcDirs: srcDirArgs
  ,svelteExtensions = ['.svelte']
  ,compilerOptions
  ,runOnTs = false
  ,runOnJs = false
}: PreprocessSvelteOptions): void {
  const srcDirs = srcDirArgs
  const outDir = outDirArg
  const targetExtensions = [
    ...svelteExtensions
    ,...((true || runOnTs) ? ['.ts' ,'.tsx'] : [])
    ,...(runOnJs ? ['.js' ,'.jsx'] : [])
  ]

  const targetPaths = getSourceFiles(path.resolve('./') ,targetExtensions ,[] ,srcDirs)
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
