/// <reference types="svelte2tsx/svelte-shims" />

import type { MultiplicativeOperator } from "typescript";

export default class B extends Svelte2TsxComponent<{
  publicName:string
  publicAge: number
  readonly publicHungerLevel: readonly number
  internalAwake:boolean
}, {}, {}> {
}