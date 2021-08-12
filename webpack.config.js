import path from 'path'
import webpack from 'webpack'

export default (env, argv) => ({
    entry: './demo/index.ts',
    output:{ filename: 'index.js', path: path.resolve('build') },
    resolve:{ extensions: ['.js','.ts','.json'] },
    module:{ rules:[
        { test: /\.tsx?$/i, loader: 'ts-loader', exclude: /node_modules/ },
        { test: /\.(glsl|vert|frag)$/i, loader: 'raw-loader', exclude: /node_modules/, options: { esModule: false } }
    ] },
    optimization:{ minimize: argv.mode === 'production' },
    devServer:{
        port: 9000, publicPath: '/', contentBase: 'build/', compress: false,
        hot: false, inline: false, liveReload: false,
    }
})