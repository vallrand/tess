import { lerp, mat3, mat4, vec2, vec3, vec4, quat } from '../math'
import { IVertexAttribute } from '../webgl'

export interface IGeometry {
    format: IVertexAttribute[]
    vertexArray: Float32Array
    indexArray: Uint16Array
}

export function applyTransform(geometry: IGeometry, matrix: mat4): IGeometry {
    const { vertexArray, format } = geometry
    const length = vertexArray.byteLength / format[1].stride
    const stride = format[1].stride / Float32Array.BYTES_PER_ELEMENT
    for(let i = length - 1; i >= 0; i--){
        const index = i * stride
        const x = vertexArray[index+0]
        const y = vertexArray[index+1]
        const z = vertexArray[index+2]
        vertexArray[index+0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]
        vertexArray[index+1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]
        vertexArray[index+2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
    }

    const normalMatrix = mat3.fromMat4(matrix, mat3())
    mat3.invert(normalMatrix, normalMatrix)
    mat3.transpose(normalMatrix, normalMatrix)
    for(let i = length - 1; i >= 0; i--){
        const index = i * stride
        const x = vertexArray[index+3]
        const y = vertexArray[index+4]
        const z = vertexArray[index+5]
        vertexArray[index+3] = normalMatrix[0] * x + normalMatrix[3] * y + normalMatrix[6] * z
        vertexArray[index+4] = normalMatrix[1] * x + normalMatrix[4] * y + normalMatrix[7] * z
        vertexArray[index+5] = normalMatrix[2] * x + normalMatrix[5] * y + normalMatrix[8] * z
    }

    return geometry
}

export function modifyGeometry(geometry: IGeometry, modifier: (position: vec3, normal: vec3) => void): IGeometry {
    const { vertexArray, format } = geometry
    const length = vertexArray.byteLength / format[1].stride
    const stride = format[1].stride / Float32Array.BYTES_PER_ELEMENT
    const position = vec3(), normal = vec3(), rotation = quat()
    for(let i = length - 1; i >= 0; i--){
        position[0] = vertexArray[i * stride + 0]
        position[1] = vertexArray[i * stride + 1]
        position[2] = vertexArray[i * stride + 2]
        normal[0] = vertexArray[i * stride + 3]
        normal[1] = vertexArray[i * stride + 4]
        normal[2] = vertexArray[i * stride + 5]
        modifier(position, normal)
        vertexArray.set(position, i * stride + 0)
        vertexArray.set(normal, i * stride + 3)
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