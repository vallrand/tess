import { Application } from '../../../engine/framework'
import { vec2, vec3, vec4, quat } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'
import { SpriteMaterial } from '../../../engine/materials'
import { ParticleEffectPass, PostEffectPass } from '../../../engine/pipeline'

import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AISystem, AIUnit, AIUnitSkill, IDamageSource, DamageType } from '../../military'
import { EnergyLinkEffect } from '../effects/EnergyLinkEffect'

export class ShieldLinkSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = 4
    public readonly cardinal: boolean = false

    private readonly links: EnergyLinkEffect[] = []
    private idleIndex: number = -1

    private cylinder: BatchMesh
    private wave: Sprite
    private core: BatchMesh
    private glow: Sprite
    private pillar: Sprite
    private circle: Sprite
    private bulge: Sprite
    private mesh: Mesh

    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        this.cylinder = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = new SpriteMaterial()
        this.cylinder.material.program = this.context.get(ParticleEffectPass).program
        this.cylinder.material.diffuse = SharedSystem.textures.wind
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,0.5,-1.3],quat.IDENTITY,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)
        
        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = new SpriteMaterial()
        this.wave.material.program = this.context.get(ParticleEffectPass).program
        this.wave.material.diffuse = SharedSystem.textures.ring
        this.wave.transform = this.context.get(TransformSystem)
        .create([0,4,-1.3],Sprite.FlatUp,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.wave)

        this.core = BatchMesh.create(SharedSystem.geometry.lowpolySphere)
        this.core.material = SharedSystem.materials.energyPurpleMaterial
        this.core.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)

        this.glow = Sprite.create(BillboardType.Sphere)
        this.glow.material = new SpriteMaterial()
        this.glow.material.program = this.context.get(ParticleEffectPass).program
        this.glow.material.diffuse = SharedSystem.textures.glow
        this.glow.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.pillar = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.pillar.material = new SpriteMaterial()
        this.pillar.material.program = this.context.get(ParticleEffectPass).program
        this.pillar.material.diffuse = SharedSystem.textures.raysBeam
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,2,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.circle = Sprite.create(BillboardType.None)
        this.circle.material = SharedSystem.materials.flashYellowMaterial
        this.circle.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.circle)

        this.bulge = Sprite.create(BillboardType.Sphere)
        this.bulge.material = new SpriteMaterial()
        this.bulge.material.blendMode = null
        this.bulge.material.program = SharedSystem.materials.distortion
        this.bulge.material.diffuse = SharedSystem.textures.bulge
        this.bulge.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.bulge)

        const affected = this.context.get(AISystem).query(source.tile, 0)
        for(let i = 0; i < affected.length; i++){
            const link = new EnergyLinkEffect(this.context)
            link.parent = source
            link.target = affected[i]
            this.links.push(link)
        }

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[this.mesh.armature.key].activate,

            'cylinder.transform.scale': PropertyAnimation([
                { frame: 0.0, value: [3,1,3] },
                { frame: 0.8, value: [1,5,1], ease: ease.quadOut }
            ], vec3.lerp),
            'cylinder.transform.rotation': PropertyAnimation([
                { frame: 0.0, value: quat.IDENTITY },
                { frame: 0.8, value: [0,-1,0,0], ease: ease.sineOut }
            ], quat.slerp),
            'cylinder.color': PropertyAnimation([
                { frame: 0.0, value: vec4.ZERO },
                { frame: 0.3, value: [0.4,0.6,1,0.6], ease: ease.quadOut },
                { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'wave.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 1.2, value: [4,4,4], ease: ease.cubicOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.6, value: [0.8,0.4,1,0.4] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'core.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.8, value: [1.4,1.4,1.4], ease: ease.elasticOut(1,0.6) }
            ], vec3.lerp),
            'core.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.4,1,0.8] }
            ], vec4.lerp),
            'core.transform.position': PropertyAnimation([
                { frame: 0.6, value: [0,5.5,-1.3] },
                { frame: 1.0, value: [0,4.5,-1.3], ease: ease.sineInOut }
            ], vec3.lerp),
            'glow.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 1.2, value: [4,4,4], ease: ease.quadOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0.6, value: vec4.ONE },
                { frame: 1.2, value: [0.6,0.4,1,0], ease: ease.sineIn }
            ], vec4.lerp),
            'glow.transform.position': PropertyAnimation([
                { frame: 0.6, value: [0,5.5,-1.3] },
                { frame: 1.0, value: [0,4.5,-1.3], ease: ease.sineInOut }
            ], vec3.lerp),
            'pillar.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.6, value: [4,6,4], ease: ease.quartOut }
            ], vec3.lerp),
            'pillar.color': PropertyAnimation([
                { frame: 0, value: [1,0.5,1,0] },
                { frame: 0.6, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'circle.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 1.8, value: [5,5,5], ease: ease.cubicOut }
            ], vec3.lerp),
            'circle.color': PropertyAnimation([
                { frame: 0.7, value: [0.4,0.2,1,1] },
                { frame: 1.8, value: [0,0,1,0], ease: ease.quadIn }
            ], vec4.lerp),
            'bulge.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'bulge.color': PropertyAnimation([
                { frame: 0.8, value: vec4.ONE },
                { frame: 1.4, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp),
            'links': EventTrigger(this.links.map((link, index) => ({
                frame: 0.5, value: index
            })), (links: EnergyLinkEffect[], index: number) => {
                if(links[index].idleIndex == -1)
                    links[index].idleIndex = this.context.get(AnimationSystem).start(links[index].activate(), true)
            })
        })

        for(const duration = 1.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.circle.transform)
        this.context.get(TransformSystem).delete(this.bulge.transform)

        this.context.get(PostEffectPass).remove(this.bulge)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.circle)
        Sprite.delete(this.bulge)
        Sprite.delete(this.wave)
        Sprite.delete(this.pillar)
        Sprite.delete(this.circle)
        BatchMesh.delete(this.cylinder)

        this.idleIndex = this.context.get(AnimationSystem).start(this.idle(), true)
        this.idleIndex = -1
    }
    private *idle(): Generator<ActionSignal> {
        let angle: number, angularVelocity = -0.5*Math.PI / 0.6
        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            angle = (elapsedTime * angularVelocity - 0.5 * Math.PI) % (2 * Math.PI)
            quat.axisAngle(vec3.AXIS_Y, angle, this.mesh.armature.nodes[2].rotation)
            this.mesh.armature.frame = 0
            if(this.idleIndex == -1) break
            else yield ActionSignal.WaitNextFrame
        }

        const animate = AnimationTimeline(this, {
            'mesh.armature.nodes.2.rotation': PropertyAnimation([
                { frame: 0, value: quat.axisAngle(vec3.AXIS_Y, angle, quat()) },
                { frame: 0.5, value: quat.IDENTITY, ease: ease.quadOut }
            ], quat.slerp),
            'mesh.armature': modelAnimations[this.mesh.armature.key].deactivate,
            'core.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.4,1,0.8] },
                { frame: 0.6, value: vec4.ZERO, ease: ease.quadOut }
            ], vec4.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0, value: [0.6,0.4,1,0] },
                { frame: 0.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(let i = 0; i < this.links.length; i++) this.links[i].idleIndex = -1

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.glow)
        Sprite.delete(this.glow)
        BatchMesh.delete(this.core)
    }
}