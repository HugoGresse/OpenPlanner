import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['src/**/*.emulator.test.ts'],
        exclude: ['node_modules/**', 'lib/**'],
        // Single fork to avoid concurrent writes against the same Firestore emulator project.
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        testTimeout: 20000,
        hookTimeout: 20000,
    },
})
