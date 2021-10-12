import { Application } from '../../engine/framework'
import { lerp, vec2, vec3, quat } from '../../engine/math'
import { TransformSystem } from '../../engine/scene'
import { StaticParticleEmitter } from '../../engine/particles'
import { DecalPass, Decal } from '../../engine/pipeline'
import { ActionSignal, AnimationTimeline, PropertyAnimation, ease } from '../../engine/animation'
import { SharedSystem } from '../shared'
import { TerrainSystem } from '../terrain'
import { EconomySystem } from './Economy'

export class ResourceSpot {
    public readonly tile: vec2 = vec2()
    private decal: Decal
    private emitter: StaticParticleEmitter

    public capacity: number
    public amount: number

    constructor(private readonly context: Application){}
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        const position = this.context.get(TerrainSystem).tilePosition(column, row, vec3())

        this.decal = this.context.get(DecalPass).create(8)
        this.decal.transform = this.context.get(TransformSystem).create(position, quat.IDENTITY, [10,2,10])
        this.decal.material = SharedSystem.materials.resourceSpotMaterial

        this.emitter = SharedSystem.particles.glow.start(16, {
            uLifespan: [1,2,-3,0],
            uOrigin: position,
            uRadius: [0,1.8],
            uSize: [0.2,0.6],
            uGravity: [0,4.2,0]
        })
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.context.get(DecalPass).delete(this.decal)
        SharedSystem.particles.glow.stop(this.emitter)
    }
    public *drain(duration: number): Generator<ActionSignal> {
        this.amount--
        const animate = AnimationTimeline(this, {
            'decal.threshold': PropertyAnimation([
                { frame: 0, value: this.decal.threshold },
                { frame: duration, value: lerp(1, 0, this.amount / this.capacity), ease: ease.linear }
            ], lerp)
        })

        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        if(this.amount > 0) return
        
        this.delete()
        this.context.get(EconomySystem).delete(this)
    }
}