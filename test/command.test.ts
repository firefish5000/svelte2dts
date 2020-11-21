/**
 * Ensure you can actually install and run the program correctly.
 * This actually packs and installs the program, making it a very expensive test.
 * Best to skip the entire suite if auto-testing during editing
 */
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'

const rootPath = path.resolve(process.cwd())
const packagesDir = path.join(rootPath ,'test' ,'packages')

// pack and install
const packProgram = (): string => {
  fs.mkdirSync(packagesDir ,{ recursive: true })
  const res = spawnSync('npm' ,['pack' ,rootPath] ,{
    cwd: packagesDir
    ,encoding: 'utf8'
  })
  if (res.status != null && res.status !== 0) {
    throw res.error ?? new Error(`npm pack exited with status code ${res.status}.\n${res.stderr}`)
  }
  const out = res.stdout.trim().split(/\s/)
  const fileName = out[out.length - 1].trim()
  return path.join(packagesDir ,fileName)
}
const binPath = './node_modules/.bin/svelte2dts'
const cleanupFiles = (files: string[]): void => {
  spawnSync('git' ,['clean' ,'-fX' ,...files] ,{
    cwd: rootPath
  })
}
const setupProject = (project: string): void => {
  spawnSync('npm' ,['ci'] ,{
    cwd: project
  })
}
const installPackage = (project: string ,packedPackage: string) => spawnSync('npm' ,['i' ,'--no-save' ,packedPackage] ,{
  cwd: project
})

cleanupFiles(['./test/packages'])
const packedPackage = packProgram()
describe('command' ,() => {
  describe('on simple project' ,() => {
    const simpleProjectPath = path.resolve(
      rootPath
      ,'./test/fixtures/simple-project'
    )
    const typeDir1 = path.join(simpleProjectPath ,'./types')
    const typeDir2 = path.join(simpleProjectPath ,'./preprocessed')
    const typeDirs = [typeDir1 ,typeDir2]
    setupProject(simpleProjectPath)

    it('installs ok' ,() => {
      const run = installPackage(simpleProjectPath ,packedPackage)
      expect(run.status).toEqual(0)
    })
    describe('infers from tsconfig.json' ,() => {
      const args = ['./src']
      beforeAll(() => cleanupFiles(typeDirs))
      it('runs ok' ,() => {
        const run = spawnSync('node' ,[binPath ,...args] ,{
          cwd: simpleProjectPath
        })
        expect(run.status).toEqual(0)
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir1 ,'./A.svelte.d.ts') ,{
          encoding: 'utf8'
        })
        expect(a).toMatchInlineSnapshot(`
          "/// <reference types=\\"svelte2tsx/svelte-shims\\" />
          export default class A__SvelteComponent_ extends Svelte2TsxComponent<{
              requiredString: string;
              optionalToggleWithDefault?: boolean | undefined;
              optionalToggleNoDefault: boolean | undefined;
              requiredToggle: boolean;
              readonlyObject?: {
                  some: number;
                  items: string;
              } | undefined;
          }, {}> {
          }
          "
        `)
      })
      it('does not copy svelte.d.ts files' ,() => {
        expect(fs.existsSync(path.join(typeDir1 ,'./B.svelte.d.ts'))).toBe(
          false
        )
      })
      it('does not copy or create svelte.d.ts files when both a svelte and svelte.d.ts file exist' ,() => {
        expect(fs.existsSync(path.join(typeDir1 ,'./C.svelte.d.ts'))).toBe(
          false
        )
      })
    })
    const args2 = ['--declarationDir' ,typeDir2 ,'./src']
    describe(`with ${JSON.stringify(args2)}` ,() => {
      const args = args2
      beforeAll(() => cleanupFiles(typeDirs))
      it('runs ok' ,() => {
        const run = spawnSync('node' ,[binPath ,...args] ,{
          cwd: simpleProjectPath
        })
        expect(run.status).toEqual(0)
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir2 ,'./A.svelte.d.ts') ,{
          encoding: 'utf8'
        })
        expect(a).toMatchInlineSnapshot(`
          "/// <reference types=\\"svelte2tsx/svelte-shims\\" />
          export default class A__SvelteComponent_ extends Svelte2TsxComponent<{
              requiredString: string;
              optionalToggleWithDefault?: boolean | undefined;
              optionalToggleNoDefault: boolean | undefined;
              requiredToggle: boolean;
              readonlyObject?: {
                  some: number;
                  items: string;
              } | undefined;
          }, {}> {
          }
          "
        `)
      })
    })
    const args3 = ['--no-strict' ,'./src']
    describe('with --no-strict' ,() => {
      const args = args3
      beforeAll(() => cleanupFiles(typeDirs))
      it('runs ok' ,() => {
        const run = spawnSync('node' ,[binPath ,...args] ,{
          cwd: simpleProjectPath
        })
        expect(run.status).toEqual(0)
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir1 ,'./A.svelte.d.ts') ,{
          encoding: 'utf8'
        })
        expect(a).toMatchInlineSnapshot(`
          "/// <reference types=\\"svelte2tsx/svelte-shims\\" />
          export default class A__SvelteComponent_ extends Svelte2TsxComponent<Partial<{
              requiredString: string;
              optionalToggleWithDefault?: boolean;
              optionalToggleNoDefault: boolean;
              requiredToggle: boolean;
              readonlyObject?: {
                  some: number;
                  items: string;
              };
          }>, {}> {
          }
          "
        `)
      })
    })
  })
})
