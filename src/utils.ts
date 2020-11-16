import path from 'path'
import ts from 'typescript'

export const relativePath = (str: string): string => `${path.relative('./' ,str)}`
export const relPathJson = (filePath:string):string => JSON.stringify(relativePath(filePath))

export const PACKAGE_NAME = 'svelte2dts'
export const basePath = process.cwd()

// eslint-disable-next-line @typescript-eslint/unbound-method
export const tsConfigFilePath = ts.findConfigFile(process.cwd() ,ts.sys.fileExists)
export const tsConfigDir = path.resolve(path.dirname(tsConfigFilePath ?? './'))
export const tsCompilerConfig: ts.CompilerOptions = ts.getDefaultCompilerOptions()

if (tsConfigFilePath !== undefined) {
  // Read and apply tsconfig.json
  // eslint-disable-next-line @typescript-eslint/unbound-method
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

export const tsConfigDeclarationDir: undefined | string = (
  tsConfigFilePath !== undefined
  && tsCompilerConfig.declarationDir !== undefined
)
  ? path.resolve(path.dirname(tsConfigFilePath) ,tsCompilerConfig.declarationDir)
  : undefined
