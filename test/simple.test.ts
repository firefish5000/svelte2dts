import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'

const rootPath = path.resolve(process.cwd())
const binPath = path.join(rootPath ,'./bin/svelte2dts')
const cleanupFiles = (files: string[]):void => {
  spawnSync('git' ,['clean' ,'-fX' ,...files] ,{
    cwd: rootPath
  })
}
const setupProject = (project: string):void => {
  spawnSync('npm' ,['i'] ,{
    cwd: project
  })
}
describe('svelte2dts command' ,() => {
  describe('on simple project' ,() => {
    const simpleProjectPath = path.resolve(
      rootPath
      ,'./test/fixtures/simple-project'
    )
    const typeDir1 = path.join(simpleProjectPath ,'./types')
    const typeDir2 = path.join(simpleProjectPath ,'./preprocessed')
    const typeDirs = [typeDir1 ,typeDir2]
    beforeAll(() => {
      setupProject(simpleProjectPath)
    })
    describe('inferring from tsconfig.json' ,() => {
      const args = ['./src']
      beforeAll(() => cleanupFiles(typeDirs))
      it('runs ok' ,() => {
        expect(() => spawnSync('node' ,[binPath ,...args] ,{
          cwd: simpleProjectPath
        })).not.toThrow()
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir1 ,'./A.svelte.d.ts') ,{
          encoding: 'utf8'
        })
        expect(a).toMatchInlineSnapshot(`
          "/// <reference types=\\"svelte2tsx/svelte-shims\\" />
          export default class A__SvelteComponent_ extends Svelte2TsxComponent<{
              name: string;
              toggle?: boolean | undefined;
              undef: boolean | undefined;
          }, {
              [evt: string]: CustomEvent<any>;
          }, {}> {
          }
          "
        `)
      })
    })
    const args2 = ['--declarationDir' ,typeDir2 ,'./src']
    describe(`with ${JSON.stringify(args2)}` ,() => {
      const args = args2
      beforeAll(() => cleanupFiles(typeDirs))
      it('runs ok' ,() => {
        expect(() => spawnSync('node' ,[binPath ,...args] ,{
          cwd: simpleProjectPath
        })).not.toThrow()
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir2 ,'./A.svelte.d.ts') ,{
          encoding: 'utf8'
        })
        expect(a).toMatchInlineSnapshot(`
          "/// <reference types=\\"svelte2tsx/svelte-shims\\" />
          export default class A__SvelteComponent_ extends Svelte2TsxComponent<{
              name: string;
              toggle?: boolean | undefined;
              undef: boolean | undefined;
          }, {
              [evt: string]: CustomEvent<any>;
          }, {}> {
          }
          "
        `)
      })
    })
  })
})
