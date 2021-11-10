import { Application } from '../../engine/framework'
import { vec2, vec4 } from '../../engine/math'
import { createTexture, GL, ShaderProgram } from '../../engine/webgl'
import { MaterialSystem } from '../../engine/materials/Material'
import * as shaders from '../../engine/shaders'
import * as localShaders from '../shaders'

function TextureArray(context: Application){
    const materials = context.get(MaterialSystem)
    const layers = [
        { shader: localShaders.solid, rate: 0, uniforms: { uColor: [0,0,0,0.5] }},
        { shader: localShaders.solid, rate: 0, uniforms: { uColor: [0.91, 0.23, 0.52, 1] }}, 
        { shader: localShaders.solid, rate: 0, uniforms: { uColor: [0.2, 0.2, 0.2, 0.12] }}, 
        { shader: localShaders.circuit, rate: 2, uniforms: {  }}, 
        { shader: localShaders.hatch, rate: 0, uniforms: { uColor: [0.8,0.9,1.0], uScale: 4 }},
        { shader: localShaders.rust, define: { RUST: false }, rate: 0, uniforms: {  }}, 
        { shader: localShaders.wires, rate: 2, uniforms: {  }}, 
        { shader: localShaders.rust, define: { RUST: true }, rate: 0, uniforms: {  }}, 
        { shader: localShaders.rust, define: { PIPE: true }, rate: 0, uniforms: {  }}
    ]

    const textureArray = materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize, layers.length)
    for(let index = 0; index < layers.length; index++)
    materials.addRenderTexture(
        textureArray, index,
        ShaderProgram(context.gl, shaders.fullscreen_vert, layers[index].shader, layers[index].define),
        layers[index].uniforms, layers[index].rate
    )

    return { array: textureArray.target, arrayLayers: layers.length }
}

export function TextureLibrary(context: Application){
    const materials = context.get(MaterialSystem)

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

    const perlinNoise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            PERLIN: true
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

    const noise = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.noise_frag, {
            //WARP: true, SKEW: true
        }), {
            uColor: [3,2.5,1.5,1]
        }, 0
    ).target

    return {
        noise, cloudNoise, cellularNoise, voronoiNoise, perlinNoise, sineNoise,

        noiseDirectional: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.noise_directional, {  }), {  }, 0
        ).target,

        white: createTexture(context.gl, { width: 1, height: 1, data: new Uint8Array([0xFF,0xFF,0xFF,0xFF]) }),
        black: createTexture(context.gl, { width: 1, height: 1, data: new Uint8Array([0x00,0x00,0x00,0x00]) }),
        flatNormal: createTexture(context.gl, { width: 1, height: 1, data: new Uint8Array([0x7F,0x7F,0xFF,0xFF]) }),

        indexedTexture: TextureArray(context),

        particle: materials.addRenderTexture(
            materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.circle), { uColor: vec4.ONE }, 0
        ).target,
        glow: materials.addRenderTexture(
            materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.glow), { uColor: vec4.ONE }, 0
        ).target,
        bulge: materials.addRenderTexture(
            materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.bulge), { uColor: vec4.ONE }, 0
        ).target,
        ring: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.ring), { uColor: vec4.ONE }, 0
        ).target,
        wave: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.wave), { uColor: vec4.ONE }, 0
        ).target,
        sparkle: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.sparkle), { uColor: vec4.ONE }, 0
        ).target,
        blink: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.blink), { uColor: vec4.ONE }, 0
        ).target,
        rectangle: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.rectangle), {
                    uColor: vec4.ONE, uRadius: 0.4, uSize: 0.2
                }, 0
        ).target,
        reticle: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.reticle), { uColor: vec4.ONE }, 0
        ).target,

        rays: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.rays), { uColor: vec4.ONE }, 0
        ).target,
        halo: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.rays, { OUTER: true }), { uColor: vec4.ONE }, 0
        ).target,
        burst: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.rays, { INNER: true }), { uColor: vec4.ONE }, 0
        ).target,
        swirl: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.swirl), { uColor: vec4.ONE }, 0
        ).target,
        beam: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.streak), { uColor: vec4.ONE }, 0
        ).target,
        streak: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.streak, { WRAP: true }), { uColor: vec4.ONE }, 0
        ).target,
        dust: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.streak, { GROUND: true }), { uColor: vec4.ONE }, 0
        ).target,


        sandstone: materials.addRenderTexture(
            materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.sandstone), { uScale: vec2.ONE, uColor: vec4.ONE }, 0
        ).target,
        dunesNormal: materials.addRenderTexture(
            materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.dunes), { uScreenSize: [MaterialSystem.textureSize, MaterialSystem.textureSize] }, 0
        ).target,
        wreck: materials.addRenderTexture(
            materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.wreck), { uScale: vec2.ONE, uColor: vec4.ONE }, 0
        ).target,
        spiral: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.spiral), { uColor: vec4.ONE }, 0
        ).target,
        blocklines: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.blocklines), { uColor: vec4.ONE }, 0
        ).target,
        stripes: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.stripes), { uColor: [0.6,1,1,0.6] }, 0
        ).target,

        spike: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.spike), { uColor: vec4.ONE, uTiles: [2,2] }, 0
        ).target,
        lightning: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.lightning), { uColor: vec4.ONE, uTiles: [4,4] }, 0
        ).target,
        plant: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.plant), { uColor: vec4.ONE, uTiles: [2,2] }, 0
        ).target,
        moss: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.moss), { uColor: vec4.ONE, uTiles: vec2.ONE }, 0
        ).target,


        stamp: materials.addRenderTexture(
            materials.createRenderTexture(512, 512, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.stamp), {}, 0
        ).target,
        stampNormal: materials.addRenderTexture(
            materials.createRenderTexture(256, 256, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.stamp, { NORMAL_MAP: true }), {}, 0
        ).target,
        shatter: materials.addRenderTexture(
            materials.createRenderTexture(512, 512, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.shatter), {}, 0
        ).target,
        shatterNormal: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.shatter, { NORMAL_MAP: true }), {}, 0
        ).target,
        cracks: materials.addRenderTexture(
            materials.createRenderTexture(256, 256, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.cracks), {}, 0
        ).target,
        cracksNormal: materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.cracks, { NORMAL_MAP: true }), {}, 0
        ).target
    }
}