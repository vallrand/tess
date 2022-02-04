import { lerp, mat3, mat4, vec2, vec3, vec4, quat } from '../math'
import { IVertexAttribute, VertexDataFormat } from '../webgl'

export interface IGeometry {
    index?: number
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

function signedPolygonArea(vertices: vec2[], start: number = 0, end: number = vertices.length): number {
    let total = 0
    for(let i = start, j = end - 1; i < end; j = i++)
        total += (vertices[j][0] - vertices[i][0]) * (vertices[j][1] + vertices[i][1])
    return -0.5 * total
}

export function extrudePolygon(path: vec2[], height: number): IGeometry {
    const ccw = signedPolygonArea(path) < 0
    const stride = (3 + 3 + 2)
    const vertexArray = new Float32Array(path.length * 4 * stride)
    const indexArray = new Uint16Array(path.length * 6)
    const normal = vec2()
    for(let i = path.length - 1, j = 0; i >= 0; j = i, i--){
        const prev = path[i], next = path[j]
        vec2.subtract(next, prev, normal)
        if(ccw) vec2.rotate90cw(normal, normal)
        else vec2.rotate90ccw(normal, normal)
        vec2.normalize(normal, normal)
        const i00 = (i*4+0) * stride
        const i01 = (i*4+1) * stride
        const i11 = (i*4+2) * stride
        const i10 = (i*4+3) * stride

        vertexArray[i00 + 0] = vertexArray[i10 + 0] = prev[0]
        vertexArray[i01 + 0] = vertexArray[i11 + 0] = next[0]
        vertexArray[i00 + 2] = vertexArray[i10 + 2] = prev[1]
        vertexArray[i01 + 2] = vertexArray[i11 + 2] = next[1]
        vertexArray[i00 + 1] = vertexArray[i01 + 1] = 0
        vertexArray[i11 + 1] = vertexArray[i10 + 1] = height

        vertexArray[i00 + 3] = vertexArray[i01 + 3] = vertexArray[i11 + 3] = vertexArray[i10 + 3] = normal[0]
        vertexArray[i00 + 5] = vertexArray[i01 + 5] = vertexArray[i11 + 5] = vertexArray[i10 + 5] = normal[1]

        vertexArray[i00 + 6] = vertexArray[i10 + 6] = i / (path.length - 1)
        vertexArray[i01 + 6] = vertexArray[i11 + 6] = j / (path.length - 1)
        vertexArray[i00 + 7] = vertexArray[i01 + 7] = 0
        vertexArray[i10 + 7] = vertexArray[i11 + 7] = 1

        indexArray[i * 6 + 0] = i*4
        indexArray[i * 6 + 1] = i*4 + 1
        indexArray[i * 6 + 2] = i*4 + 2
        indexArray[i * 6 + 3] = i*4 + 2
        indexArray[i * 6 + 4] = i*4 + 3
        indexArray[i * 6 + 5] = i*4
    }

    return { format: VertexDataFormat.Static, vertexArray, indexArray }
}