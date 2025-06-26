import * as esbuild from 'esbuild'

const config = {
    entryPoints: ['src/**/*.ts'],
    bundle: true,
    outdir: 'dist',
    external: ['*.css'],
    plugins: [
        {
            name: 'rebuild-notify',
            setup(build: esbuild.PluginBuild) {
                build.onEnd((result) => {
                    console.log(`built with ${result.errors.length} errors`)
                })
            },
        },
    ],
}

const run = async () => {
    if (process.env.WATCH === '1') {
        const ctx = await esbuild.context(config)
        console.log('Watching for changes...')
        await ctx.watch()
    } else {
        await esbuild.build(config)
    }
}

run()
