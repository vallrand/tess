import { Application } from '../../engine/framework'
import { vec2, vec3, vec4 } from '../../engine/math'
import { GL, createTexture, VertexDataFormat, ShaderProgram } from '../../engine/webgl'
import { ParticleSystem, ParticleGeometry, GradientRamp } from '../../engine/particles'
import { MaterialSystem } from '../../engine/Material'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
import { DeferredGeometryPass } from '../../engine/deferred/GeometryPass'

import { MistEffect } from './MistEffect'
import { GrassEffect } from './GrassEffect'
import { BeamEffect } from './BeamEffect'

import { ShieldEffect } from './ShieldEffect'
import { GridEffect } from './GridEffect'
export { ShieldEffect, GridEffect }

export class EffectLibrary {
    public readonly textures: {
        ring: WebGLTexture
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
        uOrigin: vec4
        uLifespan: vec4
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
        uGravity: vec3
        uTrailLength: [number]
    }>
    public readonly mist: MistEffect
    public readonly grass: GrassEffect
    public readonly beam: BeamEffect

    constructor(private readonly context: Application){
        const materials = this.context.get(MaterialSystem)

        this.textures.ring = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl,
                require('../../engine/deferred/fullscreen_vert.glsl'),
                require('../shaders/shape_frag.glsl'), { RING: true }), { uColor: [0.5,0.5,0.5,1] }, 0
        ).target

        this.dust = new ParticleSystem(
            context, { limit: 1024, format: VertexDataFormat.Particle, soft: false, blend: 1 },
            ParticleGeometry.quad(context.gl),
            ShaderProgram(context.gl,
                require('../../engine/shaders/billboard_vert.glsl'),
                require('../../engine/shaders/billboard_frag.glsl')
                , { SPHERICAL: true, SOFT: false, MASK: true, GRADIENT: true, UV_OFFSET: 0.2 }),
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
            context, { limit: 1024, format: VertexDataFormat.Particle, soft: false, blend: 2 },
            ParticleGeometry.stripe(context.gl, 8, (x: number) => x * 2),
            ShaderProgram(context.gl,
                require('../../engine/shaders/stripe_vert.glsl'),
                require('../../engine/shaders/billboard_frag.glsl'), { STRIP: true, SOFT: false, MASK: true, GRADIENT: true }),
            ShaderProgram(context.gl, require('../shaders/sparks_vert.glsl'), null, { SPHERE: true })
        )
        this.sparks.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl,
                require('../../engine/deferred/fullscreen_vert.glsl'),
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

        const e = window['emitter'] = this.sparks.add({
            uOrigin: [0,0,0,0],
            uLifespan: [1,1,-1,0],
            uSize: [0.4,0.8],
            uRadius: [0.2,0.5],
            uForce: [8,10],
            uTarget: [0,0,0],
            uGravity: [0,-9.8,0],
            uTrailLength: [0.2]
        })

        this.mist = new MistEffect(context, 256, [-8,0,-8,8,6,8])
        this.mist.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl,
                require('../../engine/deferred/fullscreen_vert.glsl'),
                require('../shaders/shape_frag.glsl'), { CIRCLE: true }), { uColor: [0.5,0.5,0.5,1] }, 0
        ).target
        this.mist.enabled = false

        this.beam = new BeamEffect(context, 64)

        // this.grass = new GrassEffect(context)
        // this.grass.fill(128, [-10,0,-10,10,2,10])

        // this.context.get(DeferredGeometryPass).effects.push(this.grass)
        this.context.get(ParticleEffectPass).effects
        .push(this.dust, this.beam, this.sparks, this.mist)
    }
}