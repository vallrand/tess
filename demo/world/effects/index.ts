import { Application, Zero } from '../../engine/framework'
import { quat, vec2, vec3, vec4, ease } from '../../engine/math'
import { Spline } from '../../engine/math/ease'
import { GL, createTexture, VertexDataFormat, ShaderProgram } from '../../engine/webgl'
import { ParticleSystem, ParticleGeometry, GradientRamp, AttributeCurveSampler, ParticleOvertimeAttributes } from '../../engine/particles'
import { MaterialSystem } from '../../engine/Material'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
import { DeferredGeometryPass } from '../../engine/deferred/GeometryPass'
import { SpriteMaterial } from '../../engine/Sprite'
import { shaders } from '../../engine/shaders'

import { MistEffect } from './MistEffect'
import { GrassEffect } from './GrassEffect'

import { ShieldEffect } from './ShieldEffect'
import { GridEffect } from './GridEffect'
export { ShieldEffect, GridEffect }

export class EffectLibrary {
    public readonly textures: {
        ring: WebGLTexture
        rays: WebGLTexture
        directionalNoise: WebGLTexture
    } = Object.create(null)

    public readonly dust: ParticleSystem<{
        uOrigin: vec4
        uLifespan: vec4
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>
    public readonly sparks: ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uLength: vec2
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>
    public readonly mist: MistEffect
    public readonly grass: GrassEffect

    public readonly beamMaterial: SpriteMaterial
    public readonly convergeMaterial: SpriteMaterial

    constructor(private readonly context: Application){
        const materials = this.context.get(MaterialSystem)

        this.textures.ring = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/shape_frag.glsl'), { RING: true }), { uColor: [1,1,1,1] }, 0
        ).target
        this.textures.rays = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/rays_frag.glsl'), {  }), {  }, 0
        ).target
        this.textures.directionalNoise = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.REPEAT, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/directional_noise_frag.glsl'), {  }), {  }, 0
        ).target

        this.beamMaterial = new SpriteMaterial()
        this.beamMaterial.program = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'))
        this.convergeMaterial = new SpriteMaterial()
        this.convergeMaterial.program = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/converge_frag.glsl'))
        this.convergeMaterial.texture = this.textures.directionalNoise

        this.dust = new ParticleSystem(
            context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 1 },
            ParticleGeometry.quad(context.gl),
            ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
                SPHERICAL: true, SOFT: false, MASK: true, GRADIENT: true, UV_OFFSET: 0.2
            }),
            ShaderProgram(context.gl, require('../shaders/dust_vert.glsl'), null, { CIRCLE: true })
        )
        this.dust.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128), 0,
            materials.fullscreenShader(require('../shaders/clouds_frag.glsl')), {}, 0
        ).target
        this.dust.gradientRamp = GradientRamp(this.context.gl, [
            0xBFB9AEFF, 0x706A5FFF, 0x544F467F, 0x00000000,
            0x544F467F, 0x00000000, 0x00000000, 0x00000000
        ], 2)

        this.sparks = new ParticleSystem(
            context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
            ParticleGeometry.stripe(context.gl, 8, (x: number) => x * 2),
            ShaderProgram(context.gl, shaders.stripe_vert, shaders.billboard_frag, {
                STRIP: true, SOFT: false, MASK: true, GRADIENT: true
            }),
            ShaderProgram(context.gl, shaders.particle_vert, null, {
                SPHERE: true, TARGETED: true, STATIC: true, TRAIL: true
            })
        )
        this.sparks.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/shape_frag.glsl'), { ROUNDED_BOX: true }), {
                    uColor: [1,1,1,1], uRadius: 0.4, uSize: 0.2
                }, 0
        ).target

        this.sparks.gradientRamp = GradientRamp(this.context.gl, [
            0x00000000, 0xc7fcf0af, 0x8ee3e67f, 0x4383ba3f, 0x21369400, 0x09115400,
            0x00000000, 0x81d4cd7f, 0x4f94a13f, 0x27588a00, 0x13236300, 0x060c3300,
            0x00000000, 0x2a828700, 0x204c7800, 0x101c5700, 0x06092b00, 0x00000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000
        ], 4)

        
        const emitter = this.sparks.add({
            uLifespan: [1,1,-1,0],
            uOrigin: [0,0,0],
            uLength: [0.2,0.2],
            uGravity: [0,-9.8,0],
            uSize: [0.4,0.8],
            uRadius: [0.2,0.5],
            uForce: [8,10],
            uTarget: [0,0,0]
        })
        window['e'] = emitter

        this.mist = new MistEffect(context, 256, [-8,0,-8,8,6,8])
        this.mist.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/shape_frag.glsl'), { CIRCLE: true }), { uColor: [0.5,0.5,0.5,1] }, 0
        ).target
        this.mist.enabled = false

        // this.grass = new GrassEffect(context)
        // this.grass.fill(128, [-10,0,-10,10,2,10])

        // this.context.get(DeferredGeometryPass).effects.push(this.grass)
        this.context.get(ParticleEffectPass).effects
        .push(this.dust, this.sparks, this.mist)
    }
}