const proc = require('child_process')

const scopes = ['release', 'deps']

const getScopes = () => {
    const projects = JSON.parse(
        proc.execFileSync('yarn', ['nx', 'show', 'projects', '--json'], {
            encoding: 'utf-8',
        })
    ).map((project) => project.split('/')[1])

    return () => [2, 'always', projects.concat(scopes)]
}

module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-enum': (ctx) => getScopes()(ctx),
    },
}
