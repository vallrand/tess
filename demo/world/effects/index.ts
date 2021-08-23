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
import { BeamEffect } from './BeamEffect'

import { ShieldEffect } from './ShieldEffect'
import { GridEffect } from './GridEffect'
export { ShieldEffect, GridEffect }

export class EffectLibrary {
    public readonly textures: {
        ring: WebGLTexture
        rays: WebGLTexture
    } = Object.create(null)

    public readonly dust: ParticleSystem<{
        uOrigin: vec4
        uLifespan: vec4
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>
    public readonly energy: ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uRotation: vec2
        uGravity: vec3
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

    public readonly beamMaterial: SpriteMaterial

    constructor(private readonly context: Application){
        const materials = this.context.get(MaterialSystem)

        this.beamMaterial = new SpriteMaterial()
        this.beamMaterial.program = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'))

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

        this.dust = new ParticleSystem(
            context, { limit: 1024, format: VertexDataFormat.Particle, depthRead: true, depthWrite: false, cull: GL.NONE, blend: 1 },
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


        this.energy = new ParticleSystem(
            context, { limit: 512, format: VertexDataFormat.Particle, depthRead: !true, depthWrite: false, cull: GL.NONE, blend: 0 },
            ParticleGeometry.quad(context.gl),
            ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
                SPHERICAL: true, SOFT: false, MASK: !true, GRADIENT: true, ALIGNED: true, STRETCH: 0.2
            }),
            ShaderProgram(context.gl, shaders.emitter_vert, null, {
                SPHERE: true, TARGETED: true, LUT: true, RADIAL: true
            })
        )
        this.energy.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/shape_frag.glsl'), { BLINK: true }), {
                    uColor: [1,1,1,1]
                }, 0
        ).target
        this.energy.gradientRamp = GradientRamp(this.context.gl, [
            0x00000000, 0x3238317f, 0x264d3e3f, 0x8db8b600,
            0x00000000, 0x111c134f, 0x1d4a3b3f, 0x3f999600,
            0x00000000, 0x08120a2f, 0x0d261f2f, 0x395c5b1f,
            0x00000000, 0x00000000, 0x00000000, 0x00000000
        ], 4)
        this.energy.curveSampler = AttributeCurveSampler(this.context.gl, 32, 
            Object.values(<ParticleOvertimeAttributes> {
                size0: x => 1 - ease.quadIn(x),
                size1: x => 1 - ease.quartIn(x),
                linear0: x => 1 - 0.2 * ease.quadIn(x),
                linear1: x => 1 - 0.2 * ease.cubicIn(x),
                rotational0: Zero,
                rotational1: Zero,
                radial0: x => 1 * ease.quadIn(x),
                radial1: x => 1 * ease.quadIn(x),
            })
        )

        const emitter = this.energy.add({
            uLifespan: [2,4,0,0],
            uOrigin: [0,0,0],
            uRotation: [0,0],
            uGravity: [0,0,0],
            uSize: [0.4,0.8],
            uRadius: [8,12],
            uForce: [0,0],
            uTarget: [0,0,0]
        })
        window['e'] = emitter

        this.sparks = new ParticleSystem(
            context, { limit: 1024, format: VertexDataFormat.Particle, depthRead: true, depthWrite: false, cull: GL.NONE, blend: 2 },
            ParticleGeometry.stripe(context.gl, 8, (x: number) => x * 2),
            ShaderProgram(context.gl, shaders.stripe_vert, shaders.billboard_frag, {
                STRIP: true, SOFT: false, MASK: true, GRADIENT: true
            }),
            ShaderProgram(context.gl, require('../shaders/sparks_vert.glsl'), null, { SPHERE: true })
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

        this.mist = new MistEffect(context, 256, [-8,0,-8,8,6,8])
        this.mist.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert,
                require('../shaders/shape_frag.glsl'), { CIRCLE: true }), { uColor: [0.5,0.5,0.5,1] }, 0
        ).target
        this.mist.enabled = false

        this.beam = new BeamEffect(context, 64)

        // this.grass = new GrassEffect(context)
        // this.grass.fill(128, [-10,0,-10,10,2,10])

        // this.context.get(DeferredGeometryPass).effects.push(this.grass)
        this.context.get(ParticleEffectPass).effects
        .push(this.dust, this.beam, this.energy, this.sparks, this.mist)
    }
}