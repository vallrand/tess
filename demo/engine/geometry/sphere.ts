import { VertexDataFormat } from '../webgl/shared'
import { IGeometry } from './common'

export function createSphere(options: {
    longitude: number
    latitude: number
    radius: number
    thetaStart?: number
    thetaLength?: number
    phiStart?: number
    phiLength?: number
}): IGeometry {
    const {
        longitude = 32, latitude = 32, radius = 1,
        thetaStart = 0, thetaLength = Math.PI,
        phiStart = 0, phiLength = 2 * Math.PI
    } = options
    const vertexArray = new Float32Array(longitude * latitude * 4 * (3 + 3 + 2))
    const indexArray = new Uint16Array(longitude * latitude * 6)

    let vertexOffset = 0, indexOffset = 0
    for(let i = 0; i < latitude; i++){
        const u0 = i / latitude, u1 = (i + 1) / latitude
        const angle00 = thetaStart + thetaLength * u0
        const angle01 = thetaStart + thetaLength* u1
        const sin00 = Math.sin(angle00), sin01 = Math.sin(angle01)
        const cos00 = Math.cos(angle00), cos01 = Math.cos(angle01)
        for(let j = 0; j < longitude; j++){
            const v0 = j / longitude, v1 = (j + 1) / longitude
            const angle10 = phiStart + phiLength * v0
            const angle11 = phiStart + phiLength * v1
            const sin10 = Math.sin(angle10), sin11 = Math.sin(angle11)
            const cos10 = Math.cos(angle10), cos11 = Math.cos(angle11)
            const index = vertexOffset * (3+3+2)

            vertexArray[index + 0] = sin00 * cos10 * radius
            vertexArray[index + 1] = cos00 * radius
            vertexArray[index + 2] = sin00 * sin10 * radius

            vertexArray[index + 8] = sin00 * cos11 * radius
            vertexArray[index + 9] = cos00 * radius
            vertexArray[index + 10] = sin00 * sin11 * radius

            vertexArray[index + 16] = sin01 * cos10 * radius
            vertexArray[index + 17] = cos01 * radius
            vertexArray[index + 18] = sin01 * sin10 * radius

            vertexArray[index + 24] = sin01 * cos11 * radius
            vertexArray[index + 25] = cos01 * radius
            vertexArray[index + 26] = sin01 * sin11 * radius

            vertexArray[index + 3] = sin00 * cos10
            vertexArray[index + 4] = cos00
            vertexArray[index + 5] = sin00 * sin10

            vertexArray[index + 11] = sin00 * cos11
            vertexArray[index + 12] = cos00
            vertexArray[index + 13] = sin00 * sin11

            vertexArray[index + 19] = sin01 * cos10
            vertexArray[index + 20] = cos01
            vertexArray[index + 21] = sin01 * sin10

            vertexArray[index + 27] = sin01 * cos11
            vertexArray[index + 28] = cos01
            vertexArray[index + 29] = sin01 * sin11

            vertexArray[index + 6] = vertexArray[index + 22] = 1 - v0
            vertexArray[index + 7] = vertexArray[index + 15] = 1 - u0
            vertexArray[index + 14] = vertexArray[index + 30] = 1 - v1
            vertexArray[index + 23] = vertexArray[index + 31] = 1 - u1

            indexArray[indexOffset + 0] = vertexOffset + 0
            indexArray[indexOffset + 1] = vertexOffset + 1
            indexArray[indexOffset + 2] = vertexOffset + 2
            indexArray[indexOffset + 3] = vertexOffset + 2
            indexArray[indexOffset + 4] = vertexOffset + 1
            indexArray[indexOffset + 5] = vertexOffset + 3

            vertexOffset += 4
            indexOffset += 6
        }
    }
    return { format: VertexDataFormat.Static, vertexArray, indexArray }
}