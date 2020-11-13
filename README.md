# svelte2dts
[![npm](https://img.shields.io/badge/npm-svelte2dts-red)](https://www.npmjs.com/package/svelte2dts)

----
Generate d.ts files from svelte files.

# Usage

```sh
# Install svelte2dts and its peer deps
npm i -D svelte2dts svelte2tsx typescript

# Usage
npx svelte2dts --srcDir ./src --outDir ./types
```

# Purpose
The only type of svelte components that are truely sharable are
ones written in pure svelte, with no preprocessors such as typescript.
As such, it is necessary to preprocess your components before publishing them. We generate d.ts files for your sharable svelte components.

Note! If you use a markdown preprosessor such as pug you will
have to run the markdown preprocessors first, then run us on its output, and finally finish preprocessing to create your sharable component. 