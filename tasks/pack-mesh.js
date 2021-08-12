import { promises as fs } from 'fs'
import path from 'path'
import { GL, DataType, DataBuffer, interleaveVertexData, packVertexData } from './common.js'

const DATA_FORMAT = [
    { name: 'index', dataType: GL.UNSIGNED_SHORT, length: 1 },
    { name: 'position', dataType: GL.FLOAT, length: 3, normalized: false },
    { name: 'normal', dataType: GL.SHORT, length: 3, normalized: true, padding: 2 },
    { name: 'uv', dataType: GL.UNSIGNED_SHORT, length: 2, normalized: true },
    { name: 'joint', dataType: GL.UNSIGNED_BYTE, length: 4, normalized: false },
    { name: 'weight', dataType: GL.UNSIGNED_BYTE, length: 4, normalized: true }
]

function AttributeFormat(format){
    let byteOffset = 0
    for(let i = 1; i < format.length; i++){
        format[i].byteOffset = byteOffset
        byteOffset += (format[i].padding||0) + format[i].length * DataType[format[i].dataType].BYTES_PER_ELEMENT
    }
    return format.map(({ name, dataType, length, normalized, byteOffset: offset }, i) => i ? {
        name, size: length, type: dataType, normalized, stride: byteOffset, offset
    } : {
        name, size: length, type: dataType
    })
}


export default (async function(source, binaryFilepath, manifestFilepath){
    const basepath = process.cwd() || __dirname
    const sourceDirectory = path.resolve(basepath, source || './')
    manifestFilepath = path.resolve(basepath, manifestFilepath)
    binaryFilepath = path.resolve(basepath, binaryFilepath)

    const files = await fs.readdir(sourceDirectory, { withFileTypes: true, encoding: 'utf8' })

    const accumulator = new DataBuffer()
    const textures = []
    const models = []
    for(let file of files){
        if(file.isDirectory() || !/\.gltf$/.test(file.name)) continue
        const filepath = path.resolve(sourceDirectory, file.name)
        const buffer = await fs.readFile(filepath, { encoding: 'utf8' })
        const {
            materials, images, nodes, meshes, skins,
            accessors, bufferViews, buffers
        } = JSON.parse(buffer)

        const bufferData = buffers.map(buffer => {
            const [ metadata, data ] = buffer.uri.split(',', 2)
            return Buffer.from(data, metadata.split(';').pop()).buffer
        })
        const accessDataBuffer = index => {
            const accessor = accessors[index]
            const DataTypeArray = DataType[accessor.componentType]
            const bufferView = bufferViews[accessor.bufferView]
            const buffer = new DataTypeArray(bufferData[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength / DataTypeArray.BYTES_PER_ELEMENT)
            return buffer
        }
        const meshData = meshes.map(mesh => {
            const { attributes, indices, material } = mesh.primitives[0]
            if(material == null) return
            const image = materials[material].normalTexture.index
            const out = { texture: images[image].name.replace(/_[^_]*$/,'.png') }
            attributes.INDEX = indices
            for(let attribute in attributes){
                const accessor = accessors[attributes[attribute]]
                if(attributes[attribute] !== indices) out.vertexCount = accessor.count
                else out.indexCount = accessor.count
                out[attribute] = accessDataBuffer(attributes[attribute])
            }
            return out
        })
        for(let node of nodes){
            const mesh = meshData[node.mesh]
            const skin = skins[node.skin]
            if(!mesh) continue

            let texture = textures.indexOf(mesh.texture)
            if(texture == -1) texture = textures.push(mesh.texture) - 1

            if(skin){
                const vertexDataStride = DATA_FORMAT.slice(1).reduce((total, attribute) => total + attribute.length, 0)
                const vertexArray = new Float32Array(mesh.vertexCount * vertexDataStride)
                interleaveVertexData([
                    mesh.POSITION,
                    mesh.NORMAL,
                    mesh.TEXCOORD_0,
                    mesh.JOINTS_0,
                    mesh.WEIGHTS_0
                ], DATA_FORMAT.slice(1), vertexArray)
                const indices = accumulator.add(mesh.INDEX)
                const vertices = accumulator.add(new Float32Array(packVertexData(vertexArray, DATA_FORMAT.slice(1))))

                const inverseBindPose = accumulator.add(accessDataBuffer(skin.inverseBindMatrices))
                const joints = skin.joints.map(index => ({
                    name: nodes[index].name,
                    rotation: nodes[index].rotation,
                    scale: nodes[index].scale,
                    position: nodes[index].translation,
                    parent: skin.joints.findIndex(i => nodes[i].children && nodes[i].children.indexOf(index) != -1)
                }))

                models.push({
                    name: node.name, format: 1, texture,
                    vertices, indices, inverseBindPose, armature: joints
                })
            }else{
                const vertexDataStride = DATA_FORMAT.slice(1, -2).reduce((total, attribute) => total + attribute.length, 0)
                const vertexArray = new Float32Array(mesh.vertexCount * vertexDataStride)
                interleaveVertexData([
                    mesh.POSITION,
                    mesh.NORMAL,
                    mesh.TEXCOORD_0
                ], DATA_FORMAT.slice(1, -2), vertexArray)
                const indices = accumulator.add(mesh.INDEX)
                const vertices = accumulator.add(new Float32Array(packVertexData(vertexArray, DATA_FORMAT.slice(1, -2))))

                models.push({
                    name: node.name, format: 0, texture,
                    vertices, indices
                })
            }
        }
	}
    const arraybuffer = accumulator.join()
    console.log('\x1b[34m%s\x1b[0m', `Writing ${binaryFilepath} ${arraybuffer.byteLength}B`)
    await fs.writeFile(binaryFilepath, Buffer.from(arraybuffer))

    console.log('\x1b[34m%s\x1b[0m', `Writing ${manifestFilepath}`)
    const directory = 'assets/'
    await fs.writeFile(manifestFilepath, JSON.stringify({
        format: [
            AttributeFormat(DATA_FORMAT.slice(0, -2)),
            AttributeFormat(DATA_FORMAT),
        ],
        buffer: [ directory+path.basename(binaryFilepath) ],
        texture: textures.map(filename => directory+filename),
        model: models
    }, function(key, value){
        return typeof value === 'number' ? +value.toFixed(6) : value
    }, 2), { encoding: 'utf8' })

    console.log('\x1b[32m%s\x1b[0m', 'Done')
})(...process.argv.slice(2))