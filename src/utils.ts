/* eslint-disable max-classes-per-file */
import path from 'path'

export const relativePath = (str: string) => `./${path.relative('./' ,str)}`
export const relPathJson = (filePath:string) => JSON.stringify(relativePath(filePath))

export const PACKAGE_NAME = 'svelte2dts'
export const basePath = process.cwd()
