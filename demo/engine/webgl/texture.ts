import { int32pow2 } from '../math/common'
import { GL } from './constants'

export type ImageData = {
    width: number
    height: number
    depth?: number
    data?: Uint8Array | HTMLImageElement
}

export interface TextureOptions {
    flipY?: boolean
    format?: number
    mipmaps?: number
    type?: number
    wrap?: number
    filter?: number
}

export function createTexture(
    gl: WebGL2RenderingContext, image: ImageData,
    {
        flipY,
        format = GL.RGBA8,
        mipmaps = GL.NEAREST,
        wrap = GL.REPEAT,
        filter = GL.LINEAR,
        type = GL.TEXTURE_2D
    }: TextureOptions = {}
): WebGLTexture {
    const texture = gl.createTexture()
    gl.activeTexture(GL.TEXTURE0)
    gl.bindTexture(type, texture)
    gl.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, flipY)
    const pow2 = int32pow2(image.width) && int32pow2(image.height)

    if(pow2 && mipmaps){
        gl.texParameteri(type, GL.TEXTURE_MAG_FILTER, filter)
        gl.texParameteri(type, GL.TEXTURE_MIN_FILTER,
            filter === GL.LINEAR ?
                mipmaps === GL.LINEAR ? GL.LINEAR_MIPMAP_LINEAR : GL.LINEAR_MIPMAP_NEAREST :
                mipmaps === GL.LINEAR ? GL.NEAREST_MIPMAP_LINEAR : GL.NEAREST_MIPMAP_NEAREST
            )
    }else{
        gl.texParameteri(type, GL.TEXTURE_MAG_FILTER, filter)
        gl.texParameteri(type, GL.TEXTURE_MIN_FILTER, filter)
    }
    gl.texParameteri(type, GL.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(type, GL.TEXTURE_WRAP_T, wrap)

    if(type === GL.TEXTURE_2D){
        gl.texStorage2D(type, 1, format, image.width, image.height)
        if(image.data)
            gl.texSubImage2D(type, 0, 0, 0, image.width, image.height, GL.RGBA, GL.UNSIGNED_BYTE, image.data as Uint8Array)
    }else if(type === GL.TEXTURE_2D_ARRAY){
        gl.texStorage3D(type, 1, format, image.width, image.height, image.depth)
        if(image.data)
            gl.texSubImage3D(type, 0, 0, 0, 0, image.width, image.height, image.depth, GL.RGBA, GL.UNSIGNED_BYTE, image.data as Uint8Array)
    }

    if(image.data && pow2 && mipmaps) gl.generateMipmap(type)

    return texture
}