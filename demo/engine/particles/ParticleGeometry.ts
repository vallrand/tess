import { GL, createTexture } from '../webgl'
import { IEase } from '../math/ease'
import { MeshBuffer } from '../Mesh'

export function GradientRamp(gl: WebGL2RenderingContext, colors: number[], height: number = 1): WebGLTexture {
    const data = new Uint8Array(colors.length * 4)
    for(let i = 0; i < colors.length; i++){
        data[i * 4 + 0] = (colors[i] >>> 24) & 0xFF
        data[i * 4 + 1] = (colors[i] >>> 16) & 0xFF
        data[i * 4 + 2] = (colors[i] >>> 8) & 0xFF
        data[i * 4 + 3] = (colors[i] >>> 0) & 0xFF
    }
    return createTexture(gl, {
        width: colors.length / height, height, data
    }, { flipY: true, mipmaps: GL.NONE, filter: GL.LINEAR, wrap: GL.CLAMP_TO_EDGE, type: GL.TEXTURE_2D })
}

export class ParticleGeometry {
    public static quad(gl: WebGL2RenderingContext): MeshBuffer {
        const vbo = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, vbo)
        gl.bufferData(GL.ARRAY_BUFFER, new Float32Array([
            -0.5,0.5,0, 0,0,
            -0.5,-0.5,0, 0,1,
            0.5,-0.5,0, 1,1,
            0.5,0.5,0, 1,0
        ]), GL.STATIC_DRAW)
        return {
            drawMode: GL.TRIANGLE_FAN, vbo, frame: 0, indexOffset: 0, indexCount: 4,
            vao: null, aabb: null, radius: 0.5,
            format: [
                {name:'aPosition',size:3,type:GL.FLOAT,stride:20,offset:0},
                {name:'aUV',size:2,type:GL.FLOAT,stride:20,offset:12}
            ]
        }
    }
    public static stripe(gl: WebGL2RenderingContext, length: number, ease: IEase): MeshBuffer {
        const vbo = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, vbo)
        const vertexData = new Float32Array(length * 2 * (3+2))
        for(let i = 0; i < length; i++){
            const l = i / (length - 1)
            vertexData[i * 2 * 5 + 0] = -0.5 * ease(l)
            vertexData[i * 2 * 5 + 1] = l
            vertexData[i * 2 * 5 + 2] = 0

            vertexData[i * 2 * 5 + 3] = 0
            vertexData[i * 2 * 5 + 4] = l
            
            vertexData[i * 2 * 5 + 5] = 0.5 * ease(l)
            vertexData[i * 2 * 5 + 6] = l
            vertexData[i * 2 * 5 + 7] = 0

            vertexData[i * 2 * 5 + 8] = 1
            vertexData[i * 2 * 5 + 9] = l
        }
        gl.bufferData(GL.ARRAY_BUFFER, vertexData, GL.STATIC_DRAW)
        return {
            drawMode: GL.TRIANGLE_STRIP, vbo, frame: 0, indexOffset: 0, indexCount: 2 * length,
            vao: null, aabb: null, radius: 0,
            format: [
                {name:'aPosition',size:3,type:GL.FLOAT,stride:20,offset:0},
                {name:'aUV',size:2,type:GL.FLOAT,stride:20,offset:12}
            ]
        }
    }
}