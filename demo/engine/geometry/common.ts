import { mat4 } from '../math'
import { IVertexAttribute } from '../webgl'

export interface IGeometry {
    format: IVertexAttribute[]
    vertexArray: Float32Array
    indexArray: Uint16Array
}

export function applyTransform(geometry: IGeometry, matrix: mat4): IGeometry {
    const length = geometry.vertexArray.byteLength / geometry.format[1].stride
    const position = geometry.format.find(attribute => attribute.name === 'position')
    const stride = position.stride / Float32Array.BYTES_PER_ELEMENT
    const offset = position.offset / Float32Array.BYTES_PER_ELEMENT
    for(let i = length - 1; i >= 0; i--){
        const index = i * stride + offset
        const x = geometry.vertexArray[index+0]
        const y = geometry.vertexArray[index+1]
        const z = geometry.vertexArray[index+2]
        geometry.vertexArray[index+0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]
        geometry.vertexArray[index+1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]
        geometry.vertexArray[index+2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
    }
    return geometry
}

export function doubleSided(geometry: IGeometry): IGeometry {
    const indexArray = new Uint16Array(geometry.indexArray.length * 2)
    for(let i = geometry.indexArray.length / 3 - 1; i >= 0; i--){
        indexArray[i*3+0] = geometry.indexArray[i*3+2]
        indexArray[i*3+1] = geometry.indexArray[i*3+1]
        indexArray[i*3+2] = geometry.indexArray[i*3+0]
    }
    indexArray.set(geometry.indexArray, geometry.indexArray.length)
    return { ...geometry, indexArray }
}