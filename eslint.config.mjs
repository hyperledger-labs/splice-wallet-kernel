import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))
const eslintIgnorePath = fileURLToPath(
    new URL('.eslintignore', import.meta.url)
)

export default defineConfig([
    includeIgnoreFile(gitignorePath),
    includeIgnoreFile(eslintIgnorePath),
    globalIgnores(['.yarn/', '**/dist/', '**/build/', '.pnp.*']),
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: { js },
        extends: ['js/recommended'],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },
    tseslint.configs.recommended,
])
