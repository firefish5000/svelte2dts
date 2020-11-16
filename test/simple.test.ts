import { execSync ,exec } from 'child_process'
import path from 'path'
import fs from 'fs'

const binPath = '../../../bin/svelte2dts'

describe('svelte2dts command' ,() => {
  beforeEach(() => {

  })
  describe('on simple project' ,() => {
    const simpleProjectPath = path.resolve(__dirname ,'./fixtures/simple-project')
    const typeDir1 = path.join(simpleProjectPath ,'./types')
    const typeDir2 = path.join(simpleProjectPath ,'./preprocessed')
    const typeDirs = [typeDir1 ,typeDir2]
    let args = './src'
    beforeEach(() => {
      for (const typeDir of typeDirs) {
        fs.rmSync(typeDir ,{
          recursive: true
          ,force: true
        })
      }
    })
    describe('inferring from tsconfig.json' ,() => {
      it('runs ok' ,() => {
        expect(() => execSync(`node ${binPath} ${args}` ,{
          cwd: simpleProjectPath
        })).not.toThrow()
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir1 ,'./A.svelte.d.ts'))
        expect(a).toMatchInlineSnapshot()
      })
    })
    args = `--declarationDir ${JSON.stringify(typeDir2)} ./src`
    describe(`with ${args}` ,() => {
      it('runs ok' ,() => {
        expect(() => execSync(`node ${binPath} ${args}` ,{
          cwd: simpleProjectPath
        })).not.toThrow()
      })
      it('generates valid svelte.d.ts files' ,() => {
        const a = fs.readFileSync(path.join(typeDir2 ,'./A.svelte.d.ts'))
        expect(a).toMatchInlineSnapshot()
      })
    })
  })
})
