import { GL, createTexture } from '../webgl'

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
    }, { flipY: true, mipmaps: GL.NONE, filter: GL.LINEAR, wrap: GL.CLAMP_TO_EDGE, type: GL.TEXTURE_2D, format: GL.RGBA8 })
}