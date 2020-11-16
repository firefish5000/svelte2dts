import { Command ,flags as oFlags } from '@oclif/command'
import path from 'path'
import fs from 'fs'
import { relativePath ,relPathJson ,tsCompilerConfig ,tsConfigDeclarationDir } from '../utils'
import { preprocessSvelte } from '../file-manager'

class Svelte2Dts extends Command {
  static description = 'Generate d.ts files from svelte files'

  static usage = '[OPTIONS...] SOURCE_DIR_1 [SOURCE_DIR_2...]'

  static examples = [
    '$ svelte2dts --overwrite --runOnTs --declarationDir ./types ./src'
    ,'$ svelte2dts --dryRun ./src'
  ]

  static flags = {
    // add --version flag to show CLI version
    version: oFlags.version({ 'char': 'v' })
    ,help: oFlags.help({ 'char': 'h' })

    // flag with no value (-f, --force)
    ,overwrite: oFlags.boolean({
      'default': false
      ,'allowNo': true
      ,'description': 'Overwrite existing files'
    })
    ,dryRun: oFlags.boolean({
      'default': false
      ,'char': 'n'
      ,'description': 'Dry Run'
    })
    ,strict: oFlags.boolean({
      'description': `Generate strict types. ${
        tsCompilerConfig.strict === undefined
          ? 'You could also set compilerOptions.strict in your tsconfig.json'
          : 'Default uses compilerOptions.strict from your tsconfig.json'
      }`
      ,'allowNo': true
      ,'default': tsCompilerConfig.strict ?? false
    })
    ,extensions: oFlags.string({
      'default': ['.svelte']
      ,'multiple': true
      ,'hidden': true
      ,'description': 'List of valid svelte file extension for pure svelte files'
    })
    ,declarationDir: oFlags.string({
      'description': `Where we should write the d.ts files. ${
        tsCompilerConfig.strict === undefined
          ? 'You could also set compilerOptions.declarationDir in your tsconfig.json'
          : 'Default uses compilerOptions.declarationDir from your tsconfig.json'
      }`
      ,'default': tsConfigDeclarationDir as string
      ,parse(input) {
        return path.resolve(input)
      }
      ,'required': tsConfigDeclarationDir === undefined
    })
    ,runOnTs: oFlags.boolean({
      'default': false
      ,'allowNo': true
      ,'description': 'Create d.ts files for all ts files. If false, we will only generate d.ts files for svelte files'
    })
  }

  static strict = false

  static args = []

  clean() {
    const { flags: { declarationDir ,dryRun } } = this.parse(Svelte2Dts)
    this.log(`Cleaning ${relPathJson(declarationDir)}.${dryRun ? ' (dry run)' : ''}`)
    if (fs.existsSync(declarationDir)) {
      if (!dryRun) fs.rmdirSync(declarationDir ,{ recursive: true })
    }
  }

  async run() {
    const { flags ,argv } = this.parse(Svelte2Dts)
    const isClean = false
    const { dryRun ,overwrite ,runOnTs ,strict } = flags
    const srcDirs = argv.map((e) => path.resolve(e))
    const outDir = flags.declarationDir

    if (dryRun) console.log('Dry run enabled, will not change anything!')

    if (isClean) {
      this.clean()
    }

    this.log(`Generating declarations for svelte files ${
      JSON.stringify(srcDirs.map(relativePath))
    } -> ${
      relPathJson(outDir)
    }.${dryRun ? ' (dry run)' : ''}`)

    await preprocessSvelte({
      srcDirs
      ,outDir
      ,runOnTs
      ,svelteExtensions: flags.extensions
      ,dryRun
      ,overwrite
      ,autoGenerate: true
      ,runOnJs: false
      ,strict
    })
  }
}

export = Svelte2Dts
