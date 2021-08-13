import { Application } from '../../engine/framework'
import { vec2, vec3, vec4 } from '../../engine/math'
import { createTexture, VertexDataFormat, ShaderProgram, generateImageData } from '../../engine/webgl'
import { uint8x4 } from '../../engine/batch'
import { ParticleSystem, ParticleGeometry, GradientRamp } from '../../engine/particles'
import { MaterialSystem } from '../../engine/Material'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'

//import { SparkParticleEmitter } from './SparkParticleEmitter'

import { ShieldEffect } from './ShieldEffect'
import { GridEffect } from './GridEffect'
export { ShieldEffect, GridEffect }

export class EffectLibrary {
    public readonly dust: ParticleSystem<{
        uOrigin: vec4
        uLifespan: vec4
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>
    //public readonly sparks: ParticleSystem

    constructor(private readonly context: Application){
        // const particleTexture = createTexture(this.context.gl, generateImageData(128, 128, function(u: number, v: number){
        //     u = 2 * u - 1
        //     v = 2 * v - 1
        //     const distance = 1-Math.sqrt(u*u + v*v)
        //     return uint8x4(distance, distance, distance, distance);
        // }))

        this.dust = new ParticleSystem(
            context, { limit: 1024, format: VertexDataFormat.Particle, opaque: true, soft: false },
            ParticleGeometry.quad(context.gl),
            ShaderProgram(context.gl,
                require('../../engine/shaders/billboard_vert.glsl'),
                require('../../engine/shaders/billboard_frag.glsl'), { SPHERICAL: true, SOFT: false }),
            ShaderProgram(context.gl, require('../shaders/dust_vert.glsl'), null, {  })
        )
        this.dust.diffuse = this.context.get(MaterialSystem).addRenderTexture(
            this.context.get(MaterialSystem).createRenderTexture(128, 128), 0,
            this.context.get(MaterialSystem).fullscreenShader(require('../shaders/clouds_frag.glsl')), {}, 0
        ).target
        this.dust.gradientRamp = GradientRamp(this.context.gl, [
            0xBF,0xB9,0xaE,0xFF,
            0xBF,0xB9,0xaE,0xFF,
            0x54,0x4F,0x46,0xFF,
            0x00,0x00,0x00,0x00
        ])
        this.context.get(ParticleEffectPass).effects.push(this.dust)



        const emitter = this.dust.add({
            uOrigin: [0,0,0,0],
            uLifespan: [2,2,-0.5,0],
            uSize: [3,5],
            uRadius: [0.5,0.5],
            uForce: [4,6],
            uTarget: [0,-0.1,0]
        })
        window['emitter'] = emitter
        //)
        //this.sparks.texture = particleTexture
        //this.sparks.gradient = ramp()



    }
}