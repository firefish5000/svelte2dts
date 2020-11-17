svelte2dts
==========

Generate d.ts files from svelte files, creating truly sharable and well typed components!

[![License](https://img.shields.io/static/v1?logo=github&label&message=svelte2dts&style=for-the-badge&logoColor=f00&color=040)](https://github.com/firefish5000/svelte2dts)
[![Version](https://img.shields.io/npm/v/svelte2dts?style=for-the-badge&logo=npm&label=npm)](https://npmjs.org/package/svelte2dts)
[![Downloads/week](https://img.shields.io/npm/dw/svelte2dts?style=for-the-badge)](https://npmjs.org/package/svelte2dts)
[![License](https://img.shields.io/npm/l/svelte2dts?style=for-the-badge)](https://github.com/firefish5000/svelte2dts/blob/master/package.json)
[![GitHub Workflow](https://img.shields.io/github/workflow/status/firefish5000/svelte2dts/CI?style=for-the-badge&logo=github&label=Workflows&logoColor=red)](https://github.com/firefish5000/svelte2dts)

## Installation
Install svelte2dts and its peer deps
```sh
npm i -D svelte2dts svelte2tsx typescript
```
## Usage
After installing, you can invoke the command via npx or package.json.

### Via CLI
Read all svelte files from `./src` and generate .d.ts files in `./types`
```sh
npx svelte2dts --overwrite --runOnTS --declarationDir ./types ./src
```
Show help
```sh
npx svelte2dts --help
```
## Configuring
### package.json
Point package.json to the declarationDir and outDir. This is required to get the svelte VS-Code extension working properly. Note that they should not point into the same directory
```json
{
  ...
  "svelte": "./preprocessed/index.js",
  "types": "./types/index.d.ts",
  ...
}
```
### tsconfig.json
Be sure to set declarationDir and outDir to different locations.
```json
{
  "compilerOptions": {
    "strict": true,
    "outDir": "./preprocessed",
    "declaration": true,
    "declarationDir": "./types"
  },
}
```

Note that with the above setup, you no longer need to specify `--declarationDir` in the command!
```sh
npx svelte2dts --overwrite --runOnTS ./src
```

## Purpose
The only type of svelte components that are truly sharable are
ones written in pure svelte, with no preprocessors such as typescript.
As such, it is necessary to preprocess your components before publishing them. But sadly, `svelte-preprocess` removes all typings and does not generate any d.ts files. This is where we come in. We generate d.ts files for your sharable svelte components so your typings do not go to waste!

## PITAs
#### Separate `types` directory is required
You ***MUST*** use a separate directory for types
if you want the svelte plugin for vscode to work.

#### Markup preprocessors are not supported
If you have configured svelte to use a markup preprosessor by default (such as pug), you will
have to:

1) run the markup preprocessors
2) run us on their output
3) finish preprocessing to create your sharable component.

## Q&A
#### My component is well typed in Vs-Code when used in `.ts` files, but not in `.svelte` files
Your `types` directory should not contain anything other than `.d.ts` and `.svelte.d.ts` files. If both `Component.svelte` and `Component.svelte.d.ts` exist, the svelte plugin will load the types from `Component.svelte`. To further the confusion, typescript will properly load types from the `Component.svelte.d.ts` file, causing types to work in `.ts` files even though they would not in `.svelte` files.

The solution is to specify both
the `svelte` and `types` field in `package.json` [as documented here](#packagejson) and to ensure there are no `.svelte` files in the types directory.
