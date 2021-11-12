import { lerp, vec2, vec3, vec4, quat } from '../../engine/math'
import { MeshSystem, BatchMesh } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { ParticleEffectPass, PointLightPass, PointLight } from '../../engine/pipeline'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, ease } from '../../engine/animation'

import { SharedSystem, ModelAnimation } from '../shared'
import { AIUnit, AIStrategyPlan, AIStrategy } from '../military'
import { PlayerSystem } from '../player'
import { ShockwaveSkill } from './skills/ShockwaveSkill'
import { TurretSkill } from './skills/TurretSkill'
import { SpawnerSkill } from './skills/SpawnerSkill'

export class Monolith extends AIUnit {
    static readonly pool: Monolith[] = []
    public readonly size: vec2 = vec2(3,3)
    readonly skills = [new TurretSkill(this.context),new SpawnerSkill(this.context),new ShockwaveSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 12, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 1, amount: 0, gain: 0.2 }
    readonly group: number = 2
    readonly movementDuration: number = 1

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('monolith')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        Monolith.pool.push(this)
    }
    public execute(plan: AIStrategyPlan): Generator<ActionSignal> {
        const actions = [super.execute(plan)]
        const origin = vec2.subtract(this.tile, vec2.ONE, vec2())

        spawn:{
            if(plan.path) break spawn
            const skill: SpawnerSkill = this.skills[1] as SpawnerSkill
            console.log(ShockwaveSkill.queryArea(this.context, origin, 0, 8, 2))
            if(!skill.validate(this.tile, null)) break spawn
            if(ShockwaveSkill.queryArea(this.context, origin, 0, 8, 2).length > 4) break spawn
            actions.push(skill.use(this, null))
        }
        wave:{
            if(plan.path || plan.skill != -1) break wave
            const skill: ShockwaveSkill = this.skills[2] as ShockwaveSkill
            const unit = this.context.get(PlayerSystem).cube
            if(!skill.validate(this.tile, unit.tile)) break wave
            actions.push(skill.use(this, unit.tile))
        }

        return AnimationSystem.join(actions)
    }

    private glow: BatchMesh
    private light: PointLight
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        this.glow = BatchMesh.create(SharedSystem.geometry.openBox)
        this.glow.material = SharedSystem.materials.gradientMaterial
        this.glow.transform = this.context.get(TransformSystem).create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create([0,2,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        const animate = AnimationTimeline(this, {
            'glow.transform.scale': PropertyAnimation([
                { frame: 0, value: [6,0,6] },
                { frame: 1, value: [6,3,6], ease: ease.quadOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0, value: [1,0,0.5,1] },
                { frame: 0.5, value: [0.5,0.7,1,0.2], ease: ease.sineIn }
            ], vec4.lerp),
            'light.color': PropertyAnimation([
                { frame: 0, value: [1,0,0.5] },
                { frame: 0.5, value: [0.5,0.7,1], ease: ease.sineIn }
            ], vec3.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 6, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 8, ease: ease.sineOut }
            ], lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.2,0], ease: ease.sineInOut }
            ], BlendTween.vec3)
        })

        for(const generator = this.moveAlongPath(path, frames, false); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.light = void this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.glow = void BatchMesh.delete(this.glow)
    }
}