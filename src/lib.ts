import ts from 'typescript'
import path from 'path'
import { generateTsx ,getSveltePathFromVirtual ,isVirtual } from './virtual-files'

export type RequiredCompilerOptions = ts.CompilerOptions // & {strict: Exclude<ts.CompilerOptions['strict'] ,undefined>}
interface CreateHostParameters {
  compilerOptions: RequiredCompilerOptions
  writeFile: ts.WriteFileCallback
  svelteExtensions: string[]
  virtuals?: Map<string ,boolean|string>
}
function createHost({
  compilerOptions
  ,writeFile
  ,svelteExtensions
  ,virtuals: passedVirtuals
}: CreateHostParameters): ts.CompilerHost & {ourVirtuals: Map<string ,boolean|string>} {
  const host = ts.createCompilerHost(compilerOptions) as ts.CompilerHost & {ourVirtuals: Map<string ,boolean|string>}

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalReadFile = host.readFile
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalFileExists = host.fileExists

  // Virtual paths we created.
  const virtuals = passedVirtuals ?? new Map<string ,boolean|string>()
  host.ourVirtuals = virtuals
  host.writeFile = (origFilePath ,contents ,writeByteOrder) => {
    const filePath = path.resolve(origFilePath)
    writeFile(filePath ,contents ,writeByteOrder)
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
    // Not a svelte.tsx file. We do not care about you!
    return originalFileExists.call(host ,filePath)
  }
  // eslint-disable-next-line arrow-body-style
  host.readFile = (origFilePath) => {
    const filePath = path.resolve(origFilePath)
    const virtual = virtuals.get(filePath)

    if (virtual === true) {
      const svelteFilePath = getSveltePathFromVirtual(filePath)
      const tsx = generateTsx(svelteFilePath ,compilerOptions.strict ?? false)
      virtuals.set(filePath ,tsx)
      return tsx
    }
    if (typeof virtual === 'string') {
      return virtual
    }

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

  const program = ts.createProgram(targetFiles ,compilerOptions
    ,host)

  program.emit()
}
