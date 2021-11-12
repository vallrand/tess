import { promises as fs } from 'fs'
import path from 'path'

export default (async function(basepath, args){
    const [ output, ...files ] = args
    const outputDirectory = path.resolve(basepath, output || './')

    if(files.find(flag => flag === '-clear')){
        console.log(`Clear ${outputDirectory}`)
        await fs.rm(outputDirectory, {
            force: true,
            recursive : true,
        })
        await fs.mkdir(outputDirectory)
        await fs.mkdir(path.join(outputDirectory, 'assets'))
    }

    for(let file of files){
        if(file.startsWith('-')) continue
        const source = path.resolve(basepath, file)
        const destination = path.resolve(outputDirectory, path.basename(source))
        await fs.copyFile(source, destination)
    }
})(process.cwd() || __dirname, process.argv.slice(2))