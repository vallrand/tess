import { promises as fs } from 'fs'
import path from 'path'
import { DataBuffer } from './common.js'

export default (async function(basepath, args){
    const sourceDirectory = path.resolve(basepath, args[0] || './')
    const binaryFilepath = path.resolve(basepath, args[1])
    const manifestFilepath = path.resolve(basepath, args[2])
    const subdirectory = path.dirname(path.relative(basepath, binaryFilepath)).split(path.sep).slice(1).join('/')

    const accumulator = new DataBuffer()
    const audio = []
    const files = await fs.readdir(sourceDirectory, { withFileTypes: true, encoding: 'utf8' })
    for(let file of files){
        if(file.isDirectory() || !/\.mp3$/.test(file.name)) continue
        const buffer = await fs.readFile(path.resolve(sourceDirectory, file.name), { encoding: null })
        const range = accumulator.add(new Uint8Array(buffer.buffer))
        audio.push({ key: `${subdirectory}/${file.name}`, ...range })
    }

    const arraybuffer = accumulator.join()
    console.log('\x1b[34m%s\x1b[0m', `Writing ${binaryFilepath} ${arraybuffer.byteLength}B`)
    await fs.writeFile(binaryFilepath, Buffer.from(arraybuffer))

    const manifestData = await fs.readFile(manifestFilepath, { encoding: 'utf8' })
    const manifest = manifestData ? JSON.parse(manifestData) : {}

    manifest.buffer[1] = `${subdirectory}/${path.basename(binaryFilepath)}`
    manifest.audio = audio

    console.log('\x1b[34m%s\x1b[0m', `Writing ${manifestFilepath}`)
    await fs.writeFile(manifestFilepath, JSON.stringify(manifest), { encoding: 'utf8' })
    
    console.log('\x1b[32m%s\x1b[0m', 'Done')
})(process.cwd() || __dirname, process.argv.slice(2))