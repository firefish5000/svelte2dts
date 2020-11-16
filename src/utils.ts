/* eslint-disable max-classes-per-file */
import path from 'path'
import ts from 'typescript'

export const relativePath = (str: string) => `${path.relative('./' ,str)}`
export const relPathJson = (filePath:string) => JSON.stringify(relativePath(filePath))

export const PACKAGE_NAME = 'svelte2dts'
export const basePath = process.cwd()

export const tsConfigFilePath = ts.findConfigFile(process.cwd() ,ts.sys.fileExists)
export const tsConfigDir = path.resolve(path.dirname(tsConfigFilePath ?? './'))
export const tsCompilerConfig: ts.CompilerOptions = ts.getDefaultCompilerOptions()

export const tsConfigDeclarationDir: undefined | string = (
  tsConfigFilePath !== undefined
  && tsCompilerConfig.declarationDir !== undefined
)
  ? path.resolve(path.dirname(tsConfigFilePath) ,tsCompilerConfig.declarationDir)
  : undefined

if (tsConfigFilePath !== undefined) {
  // Read and apply tsconfig.json
  const tsConfigReadResults = ts.readConfigFile(tsConfigFilePath ,ts.sys.readFile) as {
    config?: {compilerOptions?: ts.CompilerOptions}
    error?: ReturnType<typeof ts.readConfigFile>['error']
  }
  if (tsConfigReadResults.error !== undefined) {
    if (!tsConfigReadResults.error.reportsUnnecessary as any as boolean) {
      throw new Error(tsConfigReadResults.error.messageText.toString())
    }
  }
  if (typeof tsConfigReadResults.config?.compilerOptions === 'object') {
    Object.assign(tsCompilerConfig ,tsConfigReadResults.config.compilerOptions)
  }

  // FIXME: ts rolls their own glob code and I am not sure how to find it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // const { matchFiles } = ts as any as {matchFiles: TsMatchFiles}
  // type TsMatchFiles = (path: string ,extensions: readonly string[] | undefined ,excludes: readonly string[] | undefined ,includes: readonly string[] | undefined ,useCaseSensitiveFileNames: boolean ,currentDirectory: string ,depth: number | undefined ,getFileSystemEntries: (path: string) => FileSystemEntries ,realpath: (path: string) => string) => string[]

  /* TODO: Consider using include/exclude globs
  matchFiles(
    path.dirname(tsConfigFilePath)
    ,['.svelte']
    ,['badGlob']
    ,['goodGlob']
    ,true
    ,this.getCurrentDirectory()
    ,0
    ,()=>{}
    ,()=>{}
  )
  */
}
