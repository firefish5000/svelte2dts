import path from 'path'
import ts from 'typescript'

import fs from 'fs'

export const relativePath = (str: string): string => `${path.relative('./' ,str)}`
export const relPathJson = (filePath:string):string => JSON.stringify(relativePath(filePath))

export const PACKAGE_NAME = 'svelte2dts'
export const basePath = process.cwd()

// eslint-disable-next-line @typescript-eslint/unbound-method
export const tsConfigFilePath = ts.findConfigFile(process.cwd() ,ts.sys.fileExists)
export const tsConfigDir = path.resolve(path.dirname(tsConfigFilePath ?? './'))
export const tsCompilerConfig: ts.CompilerOptions = ts.getDefaultCompilerOptions()

interface ReadConfigFileResult {
  config?: {compilerOptions?: ts.CompilerOptions}
  error?: ReturnType<typeof ts.readConfigFile>['error']
}
export function readTsconfigFile(configPath: string) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const res = ts.readConfigFile(configPath ,ts.sys.readFile) as ReadConfigFileResult
  return res
}

if (tsConfigFilePath !== undefined) {
  // Read and apply tsconfig.json
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const tsConfigReadResults = readTsconfigFile(tsConfigFilePath)
  if (tsConfigReadResults.error !== undefined) {
    if (!tsConfigReadResults.error.reportsUnnecessary as any as boolean) {
      throw new Error(tsConfigReadResults.error.messageText.toString())
    }
  }
  if (typeof tsConfigReadResults.config?.compilerOptions === 'object') {
    Object.assign(tsCompilerConfig ,tsConfigReadResults.config.compilerOptions)
  }
}

export const tsConfigDeclarationDir: undefined | string = (
  tsConfigFilePath !== undefined
  && tsCompilerConfig.declarationDir !== undefined
)
  ? path.resolve(path.dirname(tsConfigFilePath) ,tsCompilerConfig.declarationDir)
  : undefined

export const isSubpathOf = (child:string ,parent:string) => {
  const relativeDest = path.relative(parent ,child)
  if (
    relativeDest.length === 0
    || relativeDest.startsWith('..')
    || path.isAbsolute(relativeDest)
  ) return false
  return true
}

export const enum ExtType {
  /* eslint-disable no-bitwise */
  Unknown = 1 << 0 ,
  SvelteTs = 1 << 1 ,
  SvelteTsx = 1 << 2 ,
  SvelteDts = 1 << 3 ,
  SvelteJs = 1 << 4 ,
  SvelteJsx = 1 << 5 ,
  Ts = 1 << 6 ,
  Tsx = 1 << 7 ,
  Dts = 1 << 8 ,
  Js = 1 << 9 ,
  Jsx = 1 << 10
}

export function getExtType(filePath:string ,svelteExtensions: string[]): ExtType {
  for (const ext of svelteExtensions) {
    if (filePath.endsWith(`${ext}.d.ts`)) return ExtType.SvelteDts
    if (filePath.endsWith(`${ext}.ts`)) return ExtType.SvelteTs
    if (filePath.endsWith(`${ext}.tsx`)) return ExtType.SvelteTsx
    if (filePath.endsWith(`${ext}.js`)) return ExtType.SvelteJs
    if (filePath.endsWith(`${ext}.jsx`)) return ExtType.SvelteJsx
  }
  if (filePath.endsWith('.d.ts')) return ExtType.Dts
  if (filePath.endsWith('.ts')) return ExtType.Ts
  if (filePath.endsWith('.tsx')) return ExtType.Tsx
  if (filePath.endsWith('.js')) return ExtType.Js
  if (filePath.endsWith('.jsx')) return ExtType.Jsx
  return ExtType.Unknown
}
export function areFlagsSet(item: ExtType ,flags: ExtType): boolean {
  return (item & flags) === flags
}

export function getFileSystemEntries(filePath: string): ts.FileSystemEntries {
  const files: string[] = []
  const directories: string[] = []
  const entries = fs.readdirSync(filePath)

  for (const entry of entries) {
    const node = fs.statSync(path.join(filePath ,entry))
    if (node.isFile()) {
      files.push(entry)
    }
    else if (node.isDirectory()) {
      directories.push(entry)
    }
  }
  return {
    files ,directories
  }
}

declare module 'typescript' {

  function matchFiles(
    filePath: string
    ,extensions: readonly string[] ,excludes: readonly string[] ,
    includes: readonly string[]
    ,useCaseSensitiveFileNames: boolean ,currentDirectory: string ,
    depth: number | undefined
    // eslint-disable-next-line @typescript-eslint/no-shadow
    ,getFileSystemEntries: (filePath: string) => FileSystemEntries
    ,realpath: (somePath:string)=>string
  ): string[]

  export interface FileSystemEntries {
    files: readonly string[]
    directories: readonly string[]
  }

  export interface JsonSourceFile extends ts.SourceFile {
    parseDiagnostics: ts.Diagnostic[]
  }
  export function getNewLineCharacter(options: ts.CompilerOptions | ts.PrinterOptions): string
}

export function getSourceFiles(
  tsconfigDir: string
  ,extensions: string[]
  ,exclude: string[]
  ,include: string[]
) {
  return ts.matchFiles(
    tsconfigDir
    ,extensions
    ,exclude
    ,include
    ,ts.sys.useCaseSensitiveFileNames
    ,ts.sys.getCurrentDirectory()
    ,0
    ,getFileSystemEntries
    ,(filePath:string) => path.resolve(filePath)
  )
}
export function getSourceFilesForConfig(tsconfigDir: string ,extensions: string[]) {

}
