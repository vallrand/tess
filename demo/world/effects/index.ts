import { Application, Zero } from '../../engine/framework'
import { quat, vec2, vec3, vec4, ease } from '../../engine/math'
import { Spline } from '../../engine/math/ease'
import { GL, createTexture, VertexDataFormat, ShaderProgram } from '../../engine/webgl'
import { ParticleSystem, ParticleGeometry, GradientRamp, AttributeCurveSampler, ParticleOvertimeAttributes } from '../../engine/particles'
import { MaterialSystem } from '../../engine/Material'
import { ParticleEffectPass } from '../../engine/pipeline/ParticleEffectPass'
import { DeferredGeometryPass } from '../../engine/pipeline/GeometryPass'
import { shaders } from '../../engine/shaders'

import { MistEffect } from './MistEffect'
import { GrassEffect } from './GrassEffect'

import { GridEffect } from './GridEffect'
export { GridEffect }

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