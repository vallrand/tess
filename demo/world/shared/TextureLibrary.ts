import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { MaterialSystem } from '../../engine/Material'
import { shaders } from '../../engine/shaders'

export function TextureLibrary(context: Application){
    const materials = context.get(MaterialSystem)

    const ring = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { RING: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const rays = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), {  }), {  }, 0
    ).target

    const directionalNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/directional_noise_frag.glsl'), {  }), {  }, 0
    ).target

    return { ring, rays, directionalNoise, grey: materials.white.diffuse }
}