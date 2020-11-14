#!/usr/bin/env node
import fs from 'fs'

import path from 'path'
import { program } from 'commander'
import { relPathJson ,tsCompilerConfig ,tsConfigFilePath } from './utils'
import { preprocessSvelte } from './svelte-preprocess'

let tsConfigDeclarationDir: undefined | string
if (
  tsConfigFilePath !== undefined
  && tsCompilerConfig.declarationDir !== undefined
) {
  tsConfigDeclarationDir = path.resolve(path.dirname(tsConfigFilePath) ,tsCompilerConfig.declarationDir)
}

program
  .name('svelte2dts')
  .option('-n --dryRun' ,'Dry run' ,false)
  .option('--overwrite' ,'Overwrite existing files' ,false)
  .option('--runOnTs' ,'Also create d.ts files for ts files (experimental)' ,false)
  .option('--strict' ,'Generate strict types. Uses compilerOptions.strict when unset' ,tsCompilerConfig.strict ?? false)
  .option('--no-strict' ,'Do not generate strict types')
  .option(
    '--declarationDir <typesDir>'
    ,'Where we should write the d.ts files. Uses compilerOptions.declarationDir when unset'
    ,tsConfigDeclarationDir
  )
  .requiredOption('--srcDir <srcDir>' ,'Where the .svelte files are located')
  .addHelpCommand()
  .option('--outDir <dtsDir>' ,'(depreciated) Where we should write the d.ts files. Depreciated, use --declarationDir instead')
program.parse(process.argv)
interface Opts {
  dryRun: boolean
  overwrite: boolean
  runOnTs: boolean
  srcDir: string
  outDir:string
  strict: boolean
  declarationDir:string
}
const args: Opts = program.opts() as Opts
const isDryRun = args.dryRun === true
const canOverwrite = args.overwrite === true
const isClean = false
const runOnTs = args.runOnTs === true
const strict = args.strict === true
const { srcDir } = args
const outDir = path.resolve(args.declarationDir ?? args.outDir)
if (outDir === undefined) {
  throw new Error(`error: required option '--declarationDir <dtsDir>' was not specified. Please set it${
    tsConfigFilePath !== undefined
      ? ` or add\n${JSON.stringify({
        compilerOptions: {
          declarationDir: './types'
        }
      } ,null ,2)}\nto ${relPathJson(tsConfigFilePath)}`
      : ''
  }`)
}
if (args.outDir) {
  console.warn('--outDir is depreciated. Please use --declarationDir instead')
}

function clean() {
  console.log(`Cleaning ${relPathJson(outDir)}.${isDryRun ? ' (dry run)' : ''}`)
  if (fs.existsSync(outDir)) {
    if (!isDryRun) fs.rmdirSync(outDir ,{ recursive: true })
  }
}

async function doAll(): Promise<void> {
  if (isClean) {
    clean()
  }
  console.log(`Generating declarations for svelte files ${
    relPathJson((srcDir))
  } -> ${
    relPathJson(outDir)
  }.${isDryRun ? ' (dry run)' : ''}`)
  await preprocessSvelte({
    srcDir
    ,outDir
    ,runOnTs
    ,svelteExtensions: ['.svelte']
    ,dryRun: isDryRun
    ,overwrite: canOverwrite
    ,autoGenerate: true
    ,runOnJs: false
    ,strict
  })
}

if (isDryRun) console.log('Dry run enabled, will not change anything!')

void doAll()
