import path from 'path'
import webpack from 'webpack'

export default (env, argv) => ({
    entry: './demo/index.ts',
    output:{ filename: 'index.js', path: path.resolve('output') },
    resolve:{ extensions: ['.js','.ts','.json'] },
    module:{ rules:[
        { test: /\.tsx?$/i, use: ['ts-loader'], exclude: /node_modules/ },
        { test: /\.(glsl|vert|frag)$/i, use: [path.resolve('tasks/glsl-loader.cjs')], exclude: /node_modules/ }
    ] },
    optimization:{ minimize: argv.mode === 'production' },
    devServer:{
        port: 9000, publicPath: '/', contentBase: 'output/', compress: false,
        hot: false, inline: false, liveReload: false,
    }
})