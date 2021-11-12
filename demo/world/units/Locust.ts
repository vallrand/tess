import { vec2, vec4 } from '../../engine/math'
import { MeshSystem, BatchMesh, Sprite } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, ease } from '../../engine/animation'
import { ParticleEffectPass } from '../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../shared'
import { AIUnit, AIStrategyPlan, AIStrategy } from '../military'
import { FlamethrowerSkill } from './skills/FlamethrowerSkill'
import { ShieldLinkSkill } from './skills/ShieldLinkSkill'

export class Locust extends AIUnit {
    static readonly pool: Locust[] = []
    public readonly size: vec2 = vec2(2,2)
    readonly skills = [new FlamethrowerSkill(this.context), new ShieldLinkSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 8, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 1, amount: 0, gain: 0.25 }
    readonly group: number = 2
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('locust')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.skills[1].deactivate(true).next()
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        Locust.pool.push(this)
    }
    public deactivate(): Generator<ActionSignal> { return (this.skills[1] as ShieldLinkSkill).deactivate() }
    public execute(plan: AIStrategyPlan): Generator<ActionSignal> {
        const actions: Generator<ActionSignal>[] = []
        if(this.skills[1].active){
            plan.delay += 1
            actions.unshift(this.deactivate())
        }
        actions.push(super.execute(plan))

        const targets = (this.skills[1] as ShieldLinkSkill).query(this)
        if(targets.length >= 2 && !this.skills[1].active){
            this.movement.amount = 0
            actions.push(this.skills[1].use(this, null))
        }
        return AnimationSystem.join(actions)
    }
    
    private motorLeft: BatchMesh
    private motorRight: BatchMesh
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        this.motorLeft = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.motorLeft.material = SharedSystem.materials.effect.stripes
        this.motorLeft.transform = this.context.get(TransformSystem)
        .create([1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorLeft)
        
        this.motorRight = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.motorRight.material = SharedSystem.materials.effect.stripes
        this.motorRight.transform = this.context.get(TransformSystem)
        .create([-1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorRight)

        const animate = AnimationTimeline(this, {
            'motorLeft.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 1, value: [0.5,0.3,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp),
            'motorRight.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 1, value: [0.5,0.3,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp)
        })

        for(const generator = this.moveAlongPath(path, frames, true); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.motorLeft.transform)
        this.context.get(TransformSystem).delete(this.motorRight.transform)
        this.context.get(ParticleEffectPass).remove(this.motorLeft)
        this.context.get(ParticleEffectPass).remove(this.motorRight)
        this.motorLeft = void BatchMesh.delete(this.motorLeft)
        this.motorRight = void BatchMesh.delete(this.motorRight)
    }
}