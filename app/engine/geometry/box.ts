import { VertexDataFormat } from '../webgl/shared'
import { IGeometry } from './common'

export function createBox(options: {
    width: number
    height: number
    depth: number
    open: boolean
}): IGeometry {
    const x = 0.5 * options.width
    const y = 0.5 * options.height
    const z = 0.5 * options.depth
    return !options.open ? {
        format: VertexDataFormat.Static,
        vertexArray: new Float32Array([
            -x,-y, z, 0,0,1, 0,0,
             x,-y, z, 0,0,1, 1,0,
             x, y, z, 0,0,1, 1,1,
            -x, y, z, 0,0,1, 0,1,

            -x,-y,-z, 0,0,-1, 1,0,
            -x, y,-z, 0,0,-1, 1,1,
             x, y,-z, 0,0,-1, 0,1,
             x,-y,-z, 0,0,-1, 0,0,

            -x, y,-z, 0,1,0, 0,1,
            -x, y, z, 0,1,0, 0,0,
             x, y, z, 0,1,0, 1,0,
             x, y,-z, 0,1,0, 1,1,

            -x,-y,-z, 0,-1,0, 1,1,
             x,-y,-z, 0,-1,0, 0,1,
             x,-y, z, 0,-1,0, 0,0,
            -x,-y, z, 0,-1,0, 1,0,

             x,-y,-z, 1,0,0, 1,0,
             x, y,-z, 1,0,0, 1,1,
             x, y, z, 1,0,0, 0,1,
             x,-y, z, 1,0,0, 0,0,

            -x,-y,-z, -1,0,0, 0,0,
            -x,-y, z, -1,0,0, 1,0,
            -x, y, z, -1,0,0, 1,1,
            -x, y,-z, -1,0,0, 0,1
        ]),
        indexArray: new Uint16Array([
            0,1,2, 0,2,3,
            4,5,6, 4,6,7,
            8,9,10, 8,10,11,
            12,13,14, 12,14,15,
            16,17,18, 16,18,19,
            20,21,22, 20,22,23
        ])
    } : {
        format: VertexDataFormat.Static,
        vertexArray: new Float32Array([
            -x,-y, z, 0,0,1, 0.75,0,
             x,-y, z, 0,0,1, 0.5,0,
             x, y, z, 0,0,1, 0.5,1,
            -x, y, z, 0,0,1, 0.75,1,

            -x,-y,-z, 0,0,-1, 0.0,0,
            -x, y,-z, 0,0,-1, 0.0,1,
             x, y,-z, 0,0,-1, 0.25,1,
             x,-y,-z, 0,0,-1, 0.25,0,

             x,-y,-z, 1,0,0, 0.25,0,
             x, y,-z, 1,0,0, 0.25,1,
             x, y, z, 1,0,0, 0.5,1,
             x,-y, z, 1,0,0, 0.5,0,

            -x,-y,-z, -1,0,0, 1,0,
            -x,-y, z, -1,0,0, 0.75,0,
            -x, y, z, -1,0,0, 0.75,1,
            -x, y,-z, -1,0,0, 1,1
        ]),
        indexArray: new Uint16Array([
            0,1,2, 0,2,3,
            4,5,6, 4,6,7,
            
            8,9,10, 8,10,11,
            12,13,14, 12,14,15
        ])
    }
}