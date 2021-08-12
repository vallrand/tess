import { Application } from '../../engine/framework'
import { createTexture, generateImageData } from '../../engine/webgl'
import { uint8x4 } from '../../engine/batch'
import { ParticleSystem } from '../../engine/particles'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'

import { SparkParticleEmitter } from './SparkParticleEmitter'

import { ShieldEffect } from './ShieldEffect'
import { GridEffect } from './GridEffect'
export { ShieldEffect, GridEffect }

export class EffectLibrary {
    //public readonly sparks: ParticleSystem

    constructor(private readonly context: Application){
        // const particleTexture = createTexture(this.context.gl, generateImageData(128, 128, function(u: number, v: number){
        //     u = 2 * u - 1
        //     v = 2 * v - 1
        //     const distance = 1-Math.sqrt(u*u + v*v)
        //     return uint8x4(distance, distance, distance, distance);
        // }))


        //this.context.get(ParticleEffectPass).particleSystems.push(
            //this.sparks = 
            new SparkParticleEmitter(this.context)
        //)
        //this.sparks.texture = particleTexture
        //this.sparks.gradient = ramp()



    }
}