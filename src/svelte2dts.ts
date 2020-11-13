#!/usr/bin/env node
import fs from 'fs'

import { program } from 'commander'
import { relativePath } from './utils'

import { preprocessSvelte } from './svelte-preprocess'

program
  .name('svelte2dts')
  .option('-n --dryRun' ,'Dry run' ,false)
  .option('--overwrite' ,'Overwrite existing files' ,false)
  .option('--runOnTs' ,'Also create d.ts files for ts files' ,false)
  .requiredOption('--srcDir <srcDir>' ,'Where the .svelte files are located')
  .requiredOption('--outDir <outDir>' ,'Where we should write the d.ts files')
  .addHelpCommand()
program.parse(process.argv)
interface Opts {
  dryRun: boolean
  overwrite: boolean
  runOnTs: boolean
  srcDir: string
  outDir:string
}
const args: Opts = program.opts() as Opts
const isDryRun = args.dryRun === true
const canOverwrite = args.overwrite === true
const isClean = false
const runOnTs = args.runOnTs === true
const { srcDir } = args
const { outDir } = args

function clean() {
  console.log(`Cleaning ${JSON.stringify(relativePath(outDir))}.${isDryRun ? ' (dry run)' : ''}`)
  if (fs.existsSync(outDir)) {
    if (!isDryRun) fs.rmdirSync(outDir ,{ recursive: true })
  }
}

async function doAll(): Promise<void> {
  if (isClean) {
    clean()
  }
  console.log(`Generating declarations for svelte files ${
    JSON.stringify(relativePath((srcDir)))
  } -> ${
    JSON.stringify(relativePath(outDir))
  }.${isDryRun ? ' (dry run)' : ''}`)
  await preprocessSvelte({
    srcDir
    ,outDir
    ,runOnTs
    ,extensions: ['.svelte']
    ,dryRun: isDryRun
    ,overwrite: canOverwrite
    ,autoGenerate: true
    ,runOnJs: false
  })
}

if (isDryRun) console.log('Dry run enabled, will not change anything!')

void doAll()
