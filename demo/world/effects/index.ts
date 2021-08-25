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
    // public readonly dust: ParticleSystem<{
    //     uLifespan: vec4
    //     uOrigin: vec3
    //     uGravity: vec3
    //     uRotation: vec2
    //     uAngular: vec4
    //     uSize: vec2
    //     uRadius: vec2
    //     uForce: vec2
    //     uTarget: vec3
    // }>
    public readonly mist: MistEffect
    public readonly grass: GrassEffect

    constructor(private readonly context: Application){
        const materials = this.context.get(MaterialSystem)

        // this.dust = new ParticleSystem(
        //     context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        //     ParticleGeometry.quad(context.gl),
        //     ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
        //         SPHERICAL: true, SOFT: false, MASK: true, GRADIENT: true, UV_OFFSET: 0.2
        //     }),
        //     ShaderProgram(context.gl, shaders.particle_vert, null, {
        //         CIRCLE: true, TARGETED: true, LUT: true, ANGULAR: true
        //     })
        // )
        // this.dust.diffuse = materials.addRenderTexture(
        //     materials.createRenderTexture(128, 128), 0,
        //     materials.fullscreenShader(require('../shaders/clouds_frag.glsl')), {}, 0
        // ).target
        // this.dust.gradientRamp = GradientRamp(this.context.gl, [
        //     0xBFB9AEFF, 0x706A5FFF, 0x1917125f, 0x00000000,
        //     0x1917127f, 0x00000000, 0x00000000, 0x00000000
        // ], 2)
        // this.dust.curveSampler = AttributeCurveSampler(context.gl, 32, 
        //     Object.values(<ParticleOvertimeAttributes> {
        //         size0: ease.cubicOut,
        //         size1: ease.cubicOut,
        //         linear0: x => 1 - 0.2 * ease.linear(x),
        //         linear1: x => 1 - 0.2 * ease.linear(x),
        //         rotational0: Zero, rotational1: Zero,
        //         radial0: Zero, radial1: Zero,
        //     })
        // )

        
        // const emitter = this.dust.add({
        //     uOrigin: [0,2,0],
        //     uLifespan: [0.8,1.2,-0.16,0],
        //     uGravity: [0.0, 9.8, 0.0],
        //     uRotation: [0, 2 * Math.PI],
        //     uAngular: [-Math.PI,Math.PI,-2*Math.PI,2*Math.PI],
        //     uSize: [2,4],
        //     uRadius: [0.2,0.4],
        //     uForce: [4,8],
        //     uTarget: [0,-0.1+2,0]
        // })
        // window['e'] = emitter

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
        .push(this.mist)
    }
}