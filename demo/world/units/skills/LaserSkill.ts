import { lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEffectPass, PointLight, PointLightPass } from '../../../engine/pipeline'
import { ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill, DamageType } from '../../military'
import { DirectionTile } from '../../player'

const activateTimeline = {
    'mesh.armature': ModelAnimation('activate'),
    'mesh.color': PropertyAnimation([
        { frame: 0.8, value: vec4.ONE },
        { frame: 1.2, value: [10,0.5,0.8,1], ease: ease.quadOut },
        { frame: 1.6, value: vec4.ONE, ease: ease.sineIn }
    ], vec4.lerp),

    'light.radius': PropertyAnimation([
        { frame: 0.4, value: 0 },
        { frame: 1.4, value: 5, ease: ease.quadOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.4, value: 4 },
        { frame: 1.4, value: 0, ease: ease.sineIn }
    ], lerp),
    'light.color': PropertyAnimation([
        { frame: 0, value: [1,0.5,0.8] }
    ], vec3.lerp),

    'center.transform.scale': PropertyAnimation([
        { frame: 0.6, value: vec3.ZERO },
        { frame: 1.8, value: [6,6,6], ease: ease.quartOut }
    ], vec3.lerp),
    'center.color': PropertyAnimation([
        { frame: 0.6, value: vec4.ONE },
        { frame: 1.8, value: vec4.ZERO, ease: ease.cubicIn }
    ], vec4.lerp),

    'cylinder.transform.scale': PropertyAnimation([
        { frame: 0.4, value: [4,0,-4] },
        { frame: 1.0, value: [0.8,3,-0.8], ease: ease.cubicOut }
    ], vec3.lerp),
    'cylinder.transform.rotation': PropertyAnimation([
        { frame: 0.4, value: quat.IDENTITY },
        { frame: 1.0, value: quat.axisAngle(vec3.AXIS_Y, Math.PI, quat()), ease: ease.sineIn }
    ], quat.slerp),
    'cylinder.color': PropertyAnimation([
        { frame: 0.4, value: [0.4,1,0.8,0.2] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),

    'tubeX.transform.scale': PropertyAnimation([
        { frame: 0.6, value: [1,0,1] },
        { frame: 1.2, value: [1,8,1], ease: ease.quadOut }
    ], vec3.lerp),
    'tubeZ.transform.scale': PropertyAnimation([
        { frame: 0.6, value: [1,0,1] },
        { frame: 1.2, value: [1,8,1], ease: ease.quadOut }
    ], vec3.lerp),
    'tubeX.color': PropertyAnimation([
        { frame: 0.6, value: [1,1,1,0] },
        { frame: 1.2, value: [0.6,1,1,1], ease: ease.sineOut }
    ], vec4.lerp),
    'tubeZ.color': PropertyAnimation([
        { frame: 0.6, value: [1,1,1,0] },
        { frame: 1.2, value: [0.6,1,1,1], ease: ease.sineOut }
    ], vec4.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.4, value: vec3.ZERO },
        { frame: 1.0, value: [1,4,1], ease: ease.cubicOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.4, value: [1,0.2,0.5,0.2] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.rotation': PropertyAnimation([
        { frame: 0.5, value: quat.HALF_X },
        { frame: 1.0, value: quat.multiply(quat.axisAngle(vec3.AXIS_Y, -Math.PI, quat()), quat.HALF_X, quat()), ease: ease.quadOut }
    ], quat.slerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.5, value: vec3.ZERO },
        { frame: 1.0, value: [6,6,6], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.5, value: [0.6,1,0.9,0.4] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'beams.0.width': PropertyAnimation([
        { frame: 0.7, value: 0 },
        { frame: 1.4, value: 1, ease: ease.quadOut }
    ], lerp),
    'beams.1.width': PropertyAnimation([
        { frame: 0.7, value: 0 },
        { frame: 1.4, value: 1, ease: ease.quadOut }
    ], lerp),
    'beams.2.width': PropertyAnimation([
        { frame: 0.7, value: 0 },
        { frame: 1.4, value: 1, ease: ease.quadOut }
    ], lerp),
    'beams.3.width': PropertyAnimation([
        { frame: 0.7, value: 0 },
        { frame: 1.4, value: 1, ease: ease.quadOut }
    ], lerp)
}

const deactivateTimeline = {
    'mesh.armature': ModelAnimation('deactivate'),
    'tubeX.color': PropertyAnimation([
        { frame: 0, value: [0.6,1,1,1] },
        { frame: 0.6, value: [1,0,1,0], ease: ease.quadIn }
    ], vec4.lerp),
    'tubeZ.color': PropertyAnimation([
        { frame: 0, value: [0.6,1,1,1] },
        { frame: 0.6, value: [1,0,1,0], ease: ease.quadIn }
    ], vec4.lerp),
    'beams.0.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: [0,0.4,0.3,0.8], ease: ease.quadOut }
    ], vec4.lerp),
    'beams.1.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: [0,0.4,0.3,0.8], ease: ease.quadOut }
    ], vec4.lerp),
    'beams.2.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: [0,0.4,0.3,0.8], ease: ease.quadOut }
    ], vec4.lerp),
    'beams.3.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: [0,0.4,0.3,0.8], ease: ease.quadOut }
    ], vec4.lerp),
    'beams.0.width': PropertyAnimation([
        { frame: 0, value: 1 },
        { frame: 0.5, value: 0, ease: ease.sineIn }
    ], lerp),
    'beams.1.width': PropertyAnimation([
        { frame: 0, value: 1 },
        { frame: 0.5, value: 0, ease: ease.sineIn }
    ], lerp),
    'beams.2.width': PropertyAnimation([
        { frame: 0, value: 1 },
        { frame: 0.5, value: 0, ease: ease.sineIn }
    ], lerp),
    'beams.3.width': PropertyAnimation([
        { frame: 0, value: 1 },
        { frame: 0.5, value: 0, ease: ease.sineIn }
    ], lerp)
}

export class LaserSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly minRange: number = 2
    readonly range: number = 8
    readonly cardinal: boolean = true
    readonly pierce: boolean = true
    readonly damageType: DamageType = DamageType.Temperature
    readonly damage: number = 1

    private beams: Line[] = []
    private targets: vec3[] = Array(4).fill(null).map(() => vec3())
    private beam: Sprite
    private ring: Sprite
    private tubeX: BatchMesh
    private tubeZ: BatchMesh
    private cylinder: BatchMesh
    private center: Sprite
    private light: PointLight
    private mesh: Mesh

    public aim(origin: vec2, tiles: vec2[], threshold?: number): vec2 | null {
        const map = this.context.get(TerrainSystem).pathfinder
        for(let i = 0; i < DirectionTile.length; i++){
            const weight = map.weight[map.tileIndex(origin[0] + DirectionTile[i][0], origin[1] + DirectionTile[i][1])]
            if(threshold != null && weight > threshold) return null
            else if(weight == 0) return null
        }
        return super.aim(origin, tiles)
    }
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        let hit: boolean = false
        const terrain = this.context.get(TerrainSystem), map = terrain.pathfinder
        for(let i = 0; i < DirectionTile.length; i++){
            let x: number, y: number, distance = 0
            while(++distance <= this.range){
                x = source.tile[0] + DirectionTile[i][0] * distance
                y = source.tile[1] + DirectionTile[i][1] * distance
                if(target[0] === x && target[1] === y) hit = true
                else if(map.weight[map.tileIndex(x, y)] == 0) break
            }
            terrain.tilePosition(x, y, this.targets[i])
            this.targets[i][1] = this.mesh.transform.position[1] + 0.8
        }

        if(this.active && hit) AIUnitSkill.damage(this, target)
        if(this.active) return
        this.active = true

        const origins = [
            vec3(0,0.8,0.5),vec3(0.5,0.8,0),vec3(0,0.8,-0.5),vec3(-0.5,0.8,0)
        ].map(relative => mat4.transform(relative, this.mesh.transform.matrix, vec3()))

        for(let i = 0; i < 4; i++){
            this.beams[i] = Line.create(2)
            this.beams[i].material = SharedSystem.materials.beamLinearRedMaterial
            this.context.get(ParticleEffectPass).add(this.beams[i])
            vec3.copy(origins[i], this.beams[i].path[0])            
        }

        this.center = Sprite.create(BillboardType.None)
        this.center.material = SharedSystem.materials.beamRadialRedMaterial
        this.center.transform = this.context.get(TransformSystem)
        .create([0,1,0],quat.HALF_X,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.center)


        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = SharedSystem.materials.sprite.beam
        this.beam.transform = this.context.get(TransformSystem)
        .create([0,2,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,2,0], quat.HALF_X, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.tubeX = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.tubeZ = BatchMesh.create(SharedSystem.geometry.cylinder)

        this.tubeX.transform = this.context.get(TransformSystem)
        .create([0,0.8,0], quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)
        this.tubeZ.transform = this.context.get(TransformSystem)
        .create([0,0.8,0], quat.axisAngle(vec3.AXIS_Z, 0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)

        this.tubeX.material = SharedSystem.materials.effect.stripesBlocky
        this.tubeZ.material = SharedSystem.materials.effect.stripesBlocky

        this.context.get(ParticleEffectPass).add(this.tubeX)
        this.context.get(ParticleEffectPass).add(this.tubeZ)

        this.cylinder = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.transform = this.context.get(TransformSystem).create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.cylinder.material = SharedSystem.materials.sprite.spiral

        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,2,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        const damage = EventTrigger([{ frame: 0.8, value: target }], AIUnitSkill.damage)
        const animate = AnimationTimeline(this, {
            ...activateTimeline,
            'beams.0.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[0] },
                { frame: 1.2, value: this.targets[0], ease: ease.cubicOut }
            ], vec3.lerp),
            'beams.1.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[1] },
                { frame: 1.2, value: this.targets[1], ease: ease.cubicOut }
            ], vec3.lerp),
            'beams.2.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[2] },
                { frame: 1.2, value: this.targets[2], ease: ease.cubicOut }
            ], vec3.lerp),
            'beams.3.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[3] },
                { frame: 1.2, value: this.targets[3], ease: ease.cubicOut }
            ], vec3.lerp)
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(hit) damage(elapsedTime, this.context.deltaTime, this)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.center.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.center)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        Sprite.delete(this.ring)
        Sprite.delete(this.center)
        Sprite.delete(this.beam)
        BatchMesh.delete(this.cylinder)
    }
    public *deactivate(immediate?: boolean): Generator<ActionSignal> {
        if(!this.active) return
        this.active = false

        const animate = AnimationTimeline(this, deactivateTimeline)
        if(!immediate)
        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.tubeX.transform)
        this.context.get(TransformSystem).delete(this.tubeZ.transform)
        this.context.get(ParticleEffectPass).remove(this.tubeX)
        this.context.get(ParticleEffectPass).remove(this.tubeZ)
        BatchMesh.delete(this.tubeX)
        BatchMesh.delete(this.tubeZ)
        for(let i = 0; i < 4; i++){
            this.context.get(ParticleEffectPass).remove(this.beams[i])
            Line.delete(this.beams[i])
        }
    }
}