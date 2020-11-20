import ts from 'typescript'
import sv2tsx from 'svelte2tsx'
import path from 'path'
import { relPathJson } from './utils'

const enum ExtType {
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

function getExtType(filePath:string ,svelteExtensions: string[]): ExtType {
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
function areFlagsSet(item: ExtType ,flags: ExtType): boolean {
  return (item & flags) === flags
}

function getSvelteExtensionFromVirtual(filePath:string ,svelteExtensions:string[]) {
  return svelteExtensions.find((ext) => filePath.endsWith(`${ext}.tsx`))
}
function getSveltePathFromVirtual(filePath:string) {
  return filePath.slice(0 ,-4)
}

function shouldCreateVirtual(componentPath: string):boolean {
  // Ensure the component exists
  const realFileExists = ts.sys.fileExists(componentPath)
  // And that a virtual would not conflict with any real files
  for (const tsExt of ['ts' ,'tsx' ,'js' ,'jsx']) {
    if (ts.sys.fileExists(`${componentPath}.${tsExt}`)) {
      if (realFileExists) throw new Error(`Source file ${`${componentPath}.${tsExt}`} conflicts with ${relPathJson(componentPath)}.`)
      else console.warn(`Source file ${`${componentPath}.${tsExt}`} could conflict with a future svlete file ${relPathJson(componentPath)}.`)
    }
  }

  // Only create declarations if a conflicting typing file does not exist.
  if (ts.sys.fileExists(`${componentPath}.d.ts`)) return false

  if (!realFileExists) throw new Error(`Attempt to create virtual for non-existent component ${relPathJson(componentPath)}`)
  // No typings exists. Safe to generate!
  return true
}

function isVirtual(filePath: string ,svelteExtensions: string[]) {
  const extType = getExtType(filePath ,svelteExtensions)

  // if we are looking at a svelte.tsx path
  if (areFlagsSet(extType ,ExtType.SvelteTsx)) {
    const sveltePath = getSveltePathFromVirtual(filePath)

    // Report it as a virtual if a svelte.d.ts path does not exists
    // else report it as non-virtual and use the svelte.d.ts file
    return shouldCreateVirtual(sveltePath)
  }
  return false
}

function generateTsx(srcPath:string ,strictMode: boolean):string {
  const code = ts.sys.readFile(srcPath ,'utf8')
  if (code === undefined) throw new Error(`Failed to read ${relPathJson(srcPath)}`)
  // Generate the tsx code for the component
  const { code: tsxCode } = sv2tsx(code ,{
    filename: srcPath
    // Assume true.
    // May need to parse it ourselves instead of using svelte2tsx
    // Since they do not look at lang tag
    // and lang can be different between script/module tags.
    ,isTsFile: true
    // If false, the usefulness of ts drops by 75%.
    ,strictMode
  })

  const shimmedCode = '/// <reference types="svelte2tsx/svelte-shims" />\n'
  + '/// <reference types="svelte2tsx/svelte-jsx" />\n'
  + `${tsxCode}`
  // console.log(`--gentsx--${srcPath}--\n` ,shimmedCode ,'\n----')

  return shimmedCode
}

const fixTsx: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile | ts.Bundle> = (program) => {
  /* eslint-disable @typescript-eslint/prefer-ts-expect-error */
  const checker = program.getTypeChecker()
  const dbging = false
  return (ctx) => (sourceFile) => {
    if (dbging) console.log(sourceFile.getSourceFile().fileName)
    return ts.visitNode(sourceFile ,(sourceNode) => {
      if (dbging) console.log(sourceNode)
      return ts.visitEachChild(sourceNode ,(node) => {
        // console.log('HERE----\n' ,node)

        // Only look at default export class declarations
        if (!(ts.isClassDeclaration(node)
          && node.modifiers?.some((e) => e.kind === ts.SyntaxKind.ExportKeyword) === true
          && node.modifiers?.some((e) => e.kind === ts.SyntaxKind.DefaultKeyword) === true
        )) return node

        // with the heritage clause
        const heritageClause = node.heritageClauses?.[0]
        if (heritageClause === undefined) return node
        const heritageType = heritageClause.types[0]
        if (!ts.isExpressionWithTypeArguments(heritageType)) return node

        // Extract the svelte2tsx type
        const componentType = checker.getTypeAtLocation(heritageType)
        // console.log(componentType)

        const newTypeNode = checker.typeToTypeNode(componentType ,undefined ,undefined)
        if (newTypeNode === undefined) throw new Error(`Failed to generate typing for ${relPathJson(sourceFile.getSourceFile().fileName)} node ${JSON.stringify(heritageClause)}`)

        // FIXME: Figure out the typescript wizardry necessary to fix the class....
        // const newHeritage = ctx.factory.updateHeritageClause(node.heritageClauses![0], )
        // node.heritageClauses= [  ]
        // return node
        return ts.visitEachChild(node ,(heritageClause) => {
          if (!ts.isHeritageClause(heritageClause)) return heritageClause
          return ts.visitEachChild(heritageClause ,(heritageType) => {
            if (!ts.isExpressionWithTypeArguments(heritageType)) return heritageType
            // console.log('got---\n' ,heritageType)
            return ts.visitEachChild(heritageType ,(someNode) => {
              // console.log('got---\n' ,someNode)
              if (!ts.isIdentifier(someNode)) return someNode
              // console.log(checker.typeToString(componentType))
              // return ctx.factory.createIdentifier(checker.typeToString(componentType))
              // checker.stri
              const newType = 'Svelte2TsxComponent<ReturnType<typeof render>[\'props\'],ReturnType<typeof render>[\'events\'], ReturnType<typeof render>[\'slots\'] >'
              const newIdent = ctx.factory.createIdentifier(newType)
              // return newIdent
              const oldCode: string = sourceFile.getText()
              const newCode = oldCode.slice(0 ,heritageType.pos + 1)
            + newType
            + oldCode.slice(heritageType.end)
              // ts.createScanner(languageVersion, skipTrivia)
              const a = ts.transpile(newCode ,ctx.getCompilerOptions() ,sourceFile.getSourceFile().fileName)
              program.emit()
              return someNode
            }
            ,ctx)
          } ,ctx)
        } ,ctx)
      } ,ctx)
    })
  }
}

function oldFixTsx(sourceFile: ts.SourceFile ,checker: ts.TypeChecker) {
  return ts.forEachChild(sourceFile ,(node) => {
    if (!(ts.isClassDeclaration(node)
      && node.modifiers?.some((e) => e.kind === ts.SyntaxKind.ExportKeyword) === true
      && node.modifiers?.some((e) => e.kind === ts.SyntaxKind.DefaultKeyword) === true
    )) return undefined

    const someType = node.heritageClauses?.[0].types[0]
    if (!(
      someType !== undefined
          && someType.kind === ts.SyntaxKind.ExpressionWithTypeArguments
    )) return undefined

    const componentType = checker.getTypeAtLocation(someType)
    const typeString = checker.typeToString(componentType)
    const oldCode: string = sourceFile.text
    const newCode = oldCode.slice(0 ,someType.pos + 1)
          + typeString
          + oldCode.slice(someType.end)
    return newCode
  })
}

export type RequiredCompilerOptions = ts.CompilerOptions // & {strict: Exclude<ts.CompilerOptions['strict'] ,undefined>}
interface CreateHostParameters {
  compilerOptions: RequiredCompilerOptions
  writeFile: ts.WriteFileCallback
  svelteExtensions: string[]
  virtuals?: Map<string ,boolean|string>
}
function createHost({
  compilerOptions: options
  ,writeFile
  ,svelteExtensions
  ,virtuals: passedVirtuals
}: CreateHostParameters): ts.CompilerHost & {ourVirtuals: Map<string ,boolean|string>} {
  const host = ts.createCompilerHost(options) as ts.CompilerHost & {ourVirtuals: Map<string ,boolean|string>}

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalReadFile = host.readFile
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalFileExists = host.fileExists

  // Virtual paths we created.
  const virtuals = passedVirtuals ?? new Map<string ,boolean|string>()
  host.ourVirtuals = virtuals
  host.writeFile = (origFilePath ,contents) => {
    const filePath = path.resolve(origFilePath)
    // FIXME
    // @ts-expect-error idk
    writeFile(filePath ,contents)
  }

  host.fileExists = (origFilePath) => {
    const filePath = path.resolve(origFilePath)

    const isKnownVirtual = virtuals.get(filePath)
    // Attempt to auto-create virtuals
    if (isKnownVirtual === undefined) {
      if (isVirtual(filePath ,svelteExtensions)) {
        virtuals.set(filePath ,true)
        return true
      }
      virtuals.set(filePath ,false)
    }
    else if (isKnownVirtual !== false) {
      return true
    }
    // Not a svelte.ts file. We do not care about you!
    return originalFileExists.call(host ,filePath)
  }
  // eslint-disable-next-line arrow-body-style
  host.readFile = (origFilePath) => {
    const filePath = path.resolve(origFilePath)
    const virtual = virtuals.get(filePath)

    if (virtual === true) {
      const svelteFilePath = getSveltePathFromVirtual(filePath)
      const tsx = generateTsx(svelteFilePath ,options.strict ?? false)
      virtuals.set(filePath ,tsx)
      // const program = ts.createProgram([filePath] ,options ,host)

      // const checker = program.getTypeChecker()
      // const sourceFiles = program.getSourceFiles()
      // for (const sourceFile of sourceFiles) {
      //   // console.log(sourceFile.text)
      //   /* eslint-disable no-continue */
      //   /* eslint-disable @typescript-eslint/no-loop-func */
      //   const sourcePath = path.resolve(sourceFile.fileName)
      //   if (sourcePath !== filePath) continue

      //   const newCode = oldFixTsx(sourceFile ,checker)
      //   if (newCode !== undefined) {
      //     virtuals.set(filePath ,newCode)
      //     return newCode
      //   }
      // }
      return tsx
    }
    if (typeof virtual === 'string') {
      return virtual
    }

    // console.log('Reading non Virt' ,filePath)

    return originalReadFile.call(host ,filePath)
  }

  return host
}

interface CompileTsDeclarationsParams {
  targetFiles: string[]
  compilerOptions: ts.CompilerOptions
  svelteExtensions: string[]
  writeFile: ts.WriteFileCallback
}
export function compileTsDeclarations({
  targetFiles
  ,compilerOptions
  ,svelteExtensions
  ,writeFile
}: CompileTsDeclarationsParams): void {
  // Create a Program with an in-memory emit
  const host = createHost({
    compilerOptions
    ,svelteExtensions
    ,writeFile
  })
  // FIXME: Figure out how to do this properly,
  // such as via afterDeclaration transforms.
  // or maybe fixing svelte2tsx so it outputs tsx that typescript is better at resolving
  // Fix svelte tsx output to something typescript likes better
  const programFix = ts.createProgram(targetFiles ,compilerOptions
    ,host)
  const checker = programFix.getTypeChecker()
  const sourceFiles = programFix.getSourceFiles()
  for (const sourceFile of sourceFiles) {
    /* eslint-disable no-continue */
    const sourcePath = path.resolve(sourceFile.fileName)
    if (!isVirtual(sourcePath ,svelteExtensions)) continue
    const newCode = oldFixTsx(sourceFile ,checker)
    if (newCode !== undefined) host.ourVirtuals.set(sourcePath ,newCode)
  }

  const program = ts.createProgram(targetFiles ,compilerOptions
    ,host)

  program.emit()
}
