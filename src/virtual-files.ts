import ts from 'typescript'
import sv2tsx from 'svelte2tsx'
import { areFlagsSet ,ExtType ,getExtType ,relPathJson } from './utils'

export function generateTsx(srcPath:string ,strictMode: boolean):string {
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
  + '/// <reference types="svelte2tsx/svelte-native-jsx" />\n'
  + `${tsxCode}`

  return shimmedCode
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getSvelteExtensionFromVirtual(filePath:string ,svelteExtensions:string[]): string | undefined {
  return svelteExtensions.find((ext) => filePath.endsWith(`${ext}.tsx`))
}
export function getSveltePathFromVirtual(filePath:string) {
  return filePath.slice(0 ,-4)
}

export function shouldCreateVirtual(componentPath: string):boolean {
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

export function isVirtual(filePath: string ,svelteExtensions: string[]) {
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
