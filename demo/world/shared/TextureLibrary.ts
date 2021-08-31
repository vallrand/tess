import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { MaterialSystem } from '../../engine/materials/Material'
import { shaders } from '../../engine/shaders'

export function TextureLibrary(context: Application){
    const materials = context.get(MaterialSystem)

    const particle = materials.addRenderTexture(
        materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { CIRCLE: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const ring = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { RING: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const wave = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { WAVE: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const rays = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), {  }), {  }, 0
    ).target

    const raysRing = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), { RING: true }), {  }, 0
    ).target

    const raysBeam = materials.addRenderTexture(
        materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), { BEAM: true }), {  }, 0
    ).target

    const directionalNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/directional_noise_frag.glsl'), {  }), {  }, 0
    ).target

    const cloudNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {

        }), {

        }, 0
    ).target

    const cellularNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            CELLULAR: true
        }), {

        }, 0
    ).target

    const sineNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            SINE: true
        }), {

        }, 0
    ).target

    const wind = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/wind_frag.glsl'), {  }), { uColor: [1,1,1,1] }, 0
    ).target

    const stripes = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { STRIPE: true }), { uColor: [0.6,1,1,0.6] }, 0
    ).target

    return {
        particle, ring, wave, rays, raysRing, raysBeam, wind, stripes,
        directionalNoise, cloudNoise, cellularNoise, sineNoise, grey: materials.white.diffuse
    }
}