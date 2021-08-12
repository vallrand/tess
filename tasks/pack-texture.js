import { promises as fs } from 'fs'
import path from 'path'
import { PNG } from 'pngjs'

const greyscale = (r, g, b, a) => r
const colorIndex = (colors) => (r, g, b, a) => {
    let index = 0, min = Number.MAX_VALUE
    for(let i = colors.length - 1; i >= 0; i--){
        const dr = colors[i][0] - r
        const dg = colors[i][1] - g
        const db = colors[i][2] - b
        const distance = dr*dr+dg*dg+db*db
        if(distance >= min) continue
        min = distance
        index = i
    }
    return (0xFF * index / (colors.length-1)) | 0
}

const RGB_FORMAT = [{
    prefix: 'diffuse', convert: colorIndex([
        [0x00,0x00,0x00],
        [0xFF,0xFF,0xFF],
        [0x7F,0x7F,0x7F],
        [0x80,0x40,0x40],
        [0x40,0x80,0x40],
        [0x40,0x40,0x80],
        [0x80,0x80,0x40],
        [0x80,0x40,0x80],
        [0x40,0x80,0x80]
    ])
}, {
    prefix: 'ao', convert: greyscale
}, {
    prefix: 'bump', convert: greyscale
}]

export default (async function(source, destination){
    const basepath = process.cwd() || __dirname
    const sourceDirectory = path.resolve(basepath, source || './')
    const destinationDirectory = path.resolve(basepath, destination || './')

    const queue = []
    const files = await fs.readdir(sourceDirectory, { withFileTypes: true, encoding: 'utf8' })
    files.sort((a,b) => a.name.localeCompare(b.name))

    for(let file of files){
        if(file.isDirectory() || !/\.png$/.test(file.name)) continue
        const filename = path.basename(file.name, path.extname(file.name))
        const filepath = path.resolve(sourceDirectory, file.name)

        const key = filename.substring(0, filename.lastIndexOf('_'))
        const prefix = filename.substring(filename.lastIndexOf('_') + 1)
        const channel = RGB_FORMAT.findIndex(format => format.prefix === prefix)

        const buffer = await fs.readFile(filepath)
        const { width, height, data } = PNG.sync.read(buffer)

        let index = queue.findIndex(texture => texture.key === key)
        if(index == -1) index = queue.push({
            key, channels: Array(3).fill(null), filepath: path.resolve(destinationDirectory, key + '.png'),
            rgb: new PNG({ width, height, colorType: 2, bgColor: {red:0,green:0,blue:0} })
        }) - 1
        queue[index].channels[channel] = data
        if(!queue[index].channels.every(Boolean)) continue

        const texture = queue.splice(index, 1)[0]
        const combined = texture.rgb.data
        const length = combined.length >>> 2
        for(let channel = 0; channel < 4; channel++)
        for(let layer = texture.channels[channel], i = 0; i < length; i++)
            combined[i * 4 + channel] = layer ? RGB_FORMAT[channel].convert(
                layer[i * 4 + 0],
                layer[i * 4 + 1],
                layer[i * 4 + 2],
                layer[i * 4 + 3]
            ) : 0xFF

        console.log('\x1b[34m%s\x1b[0m', `Writing ${texture.filepath}`)
        await fs.writeFile(texture.filepath, PNG.sync.write(texture.rgb))
	}
    console.log('\x1b[32m%s\x1b[0m', 'Done')
})(...process.argv.slice(2))