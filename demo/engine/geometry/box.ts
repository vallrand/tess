import { VertexDataFormat } from '../webgl/shared'

export function createBox(options: {
    width: number
    height: number
    depth: number
}){
    const x = 0.5 * options.width
    const y = 0.5 * options.height
    const z = 0.5 * options.depth
    return {
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
    }
}

export function createBoxFrame(options: {
    outerWidth: number
    outerHeight: number
    outerDepth: number
    innerWidth: number
    innerHeight: number
    innerDepth: number
}){
    const ox = 0.5 * options.outerWidth, oy = 0.5 * options.outerHeight, oz = 0.5 * options.outerDepth
    const ix = 0.5 * options.innerWidth, iy = 0.5 * options.innerHeight, iz = 0.5 * options.innerDepth
    return {
        vertexArray: new Float32Array([
            -ox,-oy,+oz, 0,0,1, 0,0,
            +ox,-oy,+oz, 0,0,1, 1,0,
            +ox,+oy,+oz, 0,0,1, 1,1,
            -ox,+oy,+oz, 0,0,1, 0,1,

            

            -ox,-oy,-oz, 0,0,-1, 1,0,
            -ox,+oy,-oz, 0,0,-1, 1,1,
            +ox,+oy,-oz, 0,0,-1, 0,1,
            +ox,-oy,-oz, 0,0,-1, 0,0,

            -ox,+oy,-oz, 0,1,0, 0,1,
            -ox,+oy,+oz, 0,1,0, 0,0,
            +ox,+oy,+oz, 0,1,0, 1,0,
            +ox,+oy,-oz, 0,1,0, 1,1,

            -ox,-oy,-oz, 0,-1,0, 1,1,
            +ox,-oy,-oz, 0,-1,0, 0,1,
            +ox,-oy,+oz, 0,-1,0, 0,0,
            -ox,-oy,+oz, 0,-1,0, 1,0,

            +ox,-oy,-oz, 1,0,0, 1,0,
            +ox,+oy,-oz, 1,0,0, 1,1,
            +ox,+oy,+oz, 1,0,0, 0,1,
            +ox,-oy,+oz, 1,0,0, 0,0,

            -ox,-oy,-oz, -1,0,0, 0,0,
            -ox,-oy,+oz, -1,0,0, 1,0,
            -ox,+oy,+oz, -1,0,0, 1,1,
            -ox,+oy,-oz, -1,0,0, 0,1
        ]),
        indexArray: new Uint16Array([
            0,1,2, 0,2,3,
            4,5,6, 4,6,7,
            8,9,10, 8,10,11,
            12,13,14, 12,14,15,
            16,17,18, 16,18,19,
            20,21,22, 20,22,23
        ])
    }
}