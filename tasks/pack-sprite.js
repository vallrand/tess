import { promises as fs } from 'fs'
import path from 'path'
import { PNG } from 'pngjs'
import { BoxPacker } from './common.js'

function copy(
    source, target,
    targetX, targetY,
    sourceX, sourceY,
    width, height
){
    width = Math.min(width, source.width - sourceX, target.width - targetX)
    height = Math.min(height, source.height - sourceY, target.height - targetY)
    for(let x = 0; x < width; x++)
    for(let y = 0; y < height; y++){
        const sourceIndex = (source.width * (y + sourceY) + x + sourceX) * 4
        const targetIndex = (target.width * (y + targetY) + x + targetX) * 4
        target.data[targetIndex+0] = source.data[sourceIndex+0]
        target.data[targetIndex+1] = source.data[sourceIndex+1]
        target.data[targetIndex+2] = source.data[sourceIndex+2]
        target.data[targetIndex+3] = source.data[sourceIndex+3]
    }
    return target
}

export default (async function(sourceDirectory, destinationDirectory, manifestFilepath){
    const basepath = process.cwd() || __dirname
    sourceDirectory = path.resolve(basepath, sourceDirectory || './')
    destinationDirectory = path.resolve(basepath, destinationDirectory || './')
    manifestFilepath = path.resolve(basepath, manifestFilepath)

    const manifest = JSON.parse(await fs.readFile(manifestFilepath, 'utf8'))
    manifest.decals = []
    const files = await fs.readdir(sourceDirectory, { withFileTypes: true, encoding: 'utf8' })
    const sprites = []
    for(let file of files){
        if(file.isDirectory() || !/\.png$/.test(file.name)) continue
        const filename = path.basename(file.name, path.extname(file.name))
        const filepath = path.resolve(sourceDirectory, file.name)

        const buffer = await fs.readFile(filepath)
        const image = PNG.sync.read(buffer)
        sprites.push({ width: image.width, height: image.height, image, filename, padding: 0, group: 0x01 })
    }
    const spritesheets = BoxPacker.pack(sprites, { width: 2048, height: 2048 })
    for(let i = 0; i < spritesheets.length; i++){
        const { width, height, filled } = spritesheets[i]
        const spritesheet = new PNG({ width, height })
        const filepath = path.resolve(destinationDirectory, `_${i}.png`)

        const filename = `assets/_${i}.png`
        let index = manifest.texture.indexOf(filename)
        if(index == -1) index = manifest.texture.push(filename) - 1

        for(let node of filled){
            copy(node.reference.image, spritesheet, node.x, node.y, 0, 0, node.width, node.height)
            manifest.decals.push({
                x: node.x, y: node.y, width: node.width, height: node.height, name: node.reference.filename
            })
        }
        
        console.log('\x1b[34m%s\x1b[0m', `Writing ${filepath}`)
        await fs.writeFile(filepath, PNG.sync.write(spritesheet))
    }

    console.log('\x1b[34m%s\x1b[0m', `Writing ${manifestFilepath}`)
    await fs.writeFile(manifestFilepath, JSON.stringify(manifest, null, 2), { encoding: 'utf8' })

    console.log('\x1b[32m%s\x1b[0m', 'Done')
})(...process.argv.slice(2))