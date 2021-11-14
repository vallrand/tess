import { vec2, vec3, vec4, quat } from '../../engine/math'
import { MeshSystem } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { DecalPass, Decal } from '../../engine/pipeline'
import { ParticleEmitter } from '../../engine/particles'
import { ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, ease } from '../../engine/animation'

import { TerrainSystem } from '../terrain'
import { SharedSystem, ModelAnimation } from '../shared'
import { AIUnit, AIStrategy } from '../military'
import { StaticOrbSkill } from './skills/StaticOrbSkill'

export class Isopod extends AIUnit {
    static readonly pool: Isopod[] = []
    readonly skills = [new StaticOrbSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 6, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 0.25 }
    readonly movement = { capacity: 1, amount: 0, gain: 0.5 }
    readonly group: number = 2
    readonly movementDuration: number = 0.4

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('isopod')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.dust = void SharedSystem.particles.dust.remove(this.dust)
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        Isopod.pool.push(this)
    }

    private dust: ParticleEmitter
    private shadow: Decal
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        this.shadow = this.context.get(DecalPass).create(4)
        this.shadow.transform = this.context.get(TransformSystem).create()
        this.shadow.transform.parent = this.mesh.transform
        this.shadow.material = SharedSystem.materials.decal.glow

        this.dust = this.dust || SharedSystem.particles.dust.add({
            uOrigin: vec3.ZERO, uTarget: vec3.ZERO,
            uLifespan: [0.6,1.2,0,0], uSize: [2,4],
            uRadius: [0,0.2], uOrientation: quat.IDENTITY,
            uForce: [2,5], uGravity: vec3.ZERO,
            uRotation: [0, 2 * Math.PI], uAngular: [-Math.PI,Math.PI,0,0]
        })

        const animate = AnimationTimeline(this, {
            'shadow.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'shadow.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.6,1,0.4] }
            ], vec4.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,1,0], ease: ease.quartOut }
            ], BlendTween.vec3)
        })
        
        this.context.get(TerrainSystem).tilePosition(path[path.length - 1][0], path[path.length - 1][1], this.dust.uniform.uniforms['uOrigin'] as any)
        const dustEmit = EventTrigger([{ frame: frames[frames.length - 1] - 0.1, value: 16 }], EventTrigger.emit)
        
        for(const generator = this.moveAlongPath(path, frames, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            animate(this.movementFloat, this.context.deltaTime)
            dustEmit(elapsedTime, this.context.deltaTime, this.dust)
            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.shadow.transform)
        this.shadow = void this.context.get(DecalPass).delete(this.shadow)
    }
}