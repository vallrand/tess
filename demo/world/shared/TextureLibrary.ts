import { Application } from '../../engine/framework'
import { vec4 } from '../../engine/math'
import { createTexture, GL, ShaderProgram } from '../../engine/webgl'
import { MaterialSystem } from '../../engine/materials/Material'
import { shaders } from '../../engine/shaders'


function TextureArray(context: Application){
    const materials = context.get(MaterialSystem)
    const layers = [
        { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0,0,0,0.5] }},
        { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.91, 0.23, 0.52, 1] }}, 
        { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.69, 0.71, 0.73, 0] }}, 
        { shader: require('../shaders/circuit_frag.glsl'), rate: 2, uniforms: {  }}, 
        { shader: require('../shaders/hatch_frag.glsl'), rate: 0, uniforms: { uColor: [0.8,0.9,1.0] }}, 
        { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.46, 0.61, 0.7, 0.5] }}, 
        { shader: require('../shaders/wires_frag.glsl'), rate: 2, uniforms: {  }}, 
        { shader: require('../shaders/rust_frag.glsl'), rate: 0, uniforms: {  }}, 
        { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.46, 0.6, 0.62, 0.5] }}
    ]

    const textureArray = materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize, layers.length)
    for(let index = 0; index < layers.length; index++)
    materials.addRenderTexture(
        textureArray, index,
        ShaderProgram(context.gl, shaders.fullscreen_vert, layers[index].shader),
        layers[index].uniforms, layers[index].rate
    )

    return { array: textureArray.target, arrayLayers: layers.length }
}

export function TextureLibrary(context: Application){
    const materials = context.get(MaterialSystem)

    const particle = materials.addRenderTexture(
        materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { CIRCLE: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const glow = materials.addRenderTexture(
        materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { GLOW: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const sparkle = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { SPARKLE: true }), { uColor: [1,1,1,1] }, 0
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

    const swirl = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), { SWIRL: true }), {  }, 0
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

    const trail = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/directional_noise_frag.glsl'), { LINE: true }), {  }, 0
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
            uColor: vec4.ONE
        }, 0
    ).target

    const cellularNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            CELLULAR: true
        }), {
            uColor: vec4.ONE
        }, 0
    ).target

    const voronoiNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            VORONOI: true
        }), {
            uColor: vec4.ONE
        }, 0
    ).target

    const sineNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            SINE: true
        }), {
            uColor: vec4.ONE
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

    const boxStripes = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/wind_frag.glsl'), { BOX_STRIPE: true }), { uColor: [1,1,1,1] }, 0
    ).target

    const white = createTexture(context.gl, {
        width: 1, height: 1, data: new Uint8Array([0xFF,0xFF,0xFF,0xFF])
    })
    const black = createTexture(context.gl, {
        width: 1, height: 1, data: new Uint8Array([0x00,0x00,0x00,0x00])
    })

    const noise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            //WARP: true, SKEW: true
        }), {
            uColor: [3,2.5,1.5,1]
        }, 0
    ).target

    const indexedTexture = TextureArray(context)

    const cracks = materials.addRenderTexture(
        materials.createRenderTexture(256, 256, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), { CRACKS: true }), {  }, 0
    ).target
    const groundDust = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/rays_frag.glsl'), { GROUND: true }), {  }, 0
    ).target
    const cracksNormal = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.bumpmap_frag, { PREMULTIPLY: true }), {
        uSampler: cracks, uScale: -MaterialSystem.heightmapScale,
        uScreenSize: [128, 128]
    }, 0).target

    return {
        particle, glow, sparkle, ring, wave, swirl, rays, raysRing, raysBeam, wind, stripes, boxStripes, trail,
        noise, directionalNoise, cloudNoise, cellularNoise, voronoiNoise, sineNoise,
        white, black, grey: materials.white.diffuse, cracksNormal, cracks, groundDust,

        indexedTexture
    }
}