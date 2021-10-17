import { Application } from '../../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { SpriteMaterial } from '../../../engine/materials'
import { ParticleEffectPass, PointLight, PointLightPass } from '../../../engine/pipeline'
import { ActionSignal, PropertyAnimation, AnimationTimeline, ease } from '../../../engine/animation'

import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIUnitSkill } from '../../opponent'

const actionTimeline = {
    
}

export class BeamSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = 8
    public readonly cardinal: boolean = true
    public readonly damage: number = 1

    private beams: Line[] = []
    private beam: Sprite
    private ring: Sprite
    private tubeX: BatchMesh
    private tubeZ: BatchMesh
    private cylinder: BatchMesh
    private center: Sprite
    private light: PointLight
    private mesh: Mesh

    public active: boolean = false
    public use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        if(this.active) return this.deactivate()
        else return this.activate()   
    }
    private *activate(): Generator<ActionSignal> {
        this.active = true
        this.beams[0] = new Line(2)
        this.beams[1] = new Line(2)
        this.beams[2] = new Line(2)
        this.beams[3] = new Line(2)

        const beamMaterial = new SpriteMaterial()
        beamMaterial.program = SharedSystem.materials.beamLinearProgram
        vec2.set(4, 8, beamMaterial.uvTransform as any)
        beamMaterial.diffuse = SharedSystem.gradients.redPurple

        this.beams[0].material = beamMaterial
        this.beams[1].material = beamMaterial
        this.beams[2].material = beamMaterial
        this.beams[3].material = beamMaterial

        this.context.get(ParticleEffectPass).add(this.beams[0])
        this.context.get(ParticleEffectPass).add(this.beams[1])
        this.context.get(ParticleEffectPass).add(this.beams[2])
        this.context.get(ParticleEffectPass).add(this.beams[3])

        const origins = [
            vec3(0,0.8,0.5),vec3(0.5,0.8,0),vec3(0,0.8,-0.5),vec3(-0.5,0.8,0)
        ].map(relative => mat4.transform(relative, this.mesh.transform.matrix, vec3()))
        const targets = [
            vec3(0,0.8,20),vec3(20,0.8,0),vec3(0,0.8,-20),vec3(-20,0.8,0)
        ].map(relative => mat4.transform(relative, this.mesh.transform.matrix, vec3()))

        vec3.copy(origins[0], this.beams[0].path[0])
        vec3.copy(origins[1], this.beams[1].path[0])
        vec3.copy(origins[2], this.beams[2].path[0])
        vec3.copy(origins[3], this.beams[3].path[0])

        this.center = Sprite.create(BillboardType.None)
        this.center.material = new SpriteMaterial()
        this.center.material.program = SharedSystem.materials.beamRadialProgram
        vec2.set(8, -16, this.center.material.uvTransform as any)
        this.center.material.diffuse = SharedSystem.gradients.redPurple

        this.center.transform = this.context.get(TransformSystem)
        .create([0,1,0],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.center)


        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam

        this.beam.transform = this.context.get(TransformSystem)
        .create([0,2,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl

        this.ring.transform = this.context.get(TransformSystem)
        .create([0,2,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.tubeX = new BatchMesh(SharedSystem.geometry.cylinder)
        this.tubeZ = new BatchMesh(SharedSystem.geometry.cylinder)

        this.tubeX.transform = this.context.get(TransformSystem)
        .create([0,0.8,0], quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)
        this.tubeZ.transform = this.context.get(TransformSystem)
        .create([0,0.8,0], quat.axisAngle(vec3.AXIS_Z, 0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)

        this.tubeX.material = this.tubeZ.material = SharedSystem.materials.stripesBlockyMaterial

        this.context.get(ParticleEffectPass).add(this.tubeX)
        this.context.get(ParticleEffectPass).add(this.tubeZ)

        this.cylinder = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,0,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        this.cylinder.material = new SpriteMaterial()
        this.cylinder.material.program = this.context.get(ParticleEffectPass).program
        this.cylinder.material.diffuse = SharedSystem.textures.wind

        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem)
        .create([0,2,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[this.mesh.armature.key].activate,
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
                { frame: 0.5, value: Sprite.FlatUp },
                { frame: 1.0, value: quat.multiply(quat.axisAngle(vec3.AXIS_Y, -Math.PI, quat()), Sprite.FlatUp, quat()), ease: ease.quadOut }
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
            ], lerp),
            'beams.0.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[0] },
                { frame: 1.2, value: targets[0], ease: ease.cubicOut }
            ], vec3.lerp),
            'beams.1.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[1] },
                { frame: 1.2, value: targets[1], ease: ease.cubicOut }
            ], vec3.lerp),
            'beams.2.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[2] },
                { frame: 1.2, value: targets[2], ease: ease.cubicOut }
            ], vec3.lerp),
            'beams.3.path.1': PropertyAnimation([
                { frame: 0.7, value: origins[3] },
                { frame: 1.2, value: targets[3], ease: ease.cubicOut }
            ], vec3.lerp)
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
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
    }
    public *deactivate(): Generator<ActionSignal> {
        this.active = false

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[this.mesh.armature.key].deactivate,
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
        })

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.tubeX.transform)
        this.context.get(TransformSystem).delete(this.tubeZ.transform)

        this.context.get(ParticleEffectPass).remove(this.tubeX)
        this.context.get(ParticleEffectPass).remove(this.tubeZ)
        this.context.get(ParticleEffectPass).remove(this.beams[0])
        this.context.get(ParticleEffectPass).remove(this.beams[1])
        this.context.get(ParticleEffectPass).remove(this.beams[2])
        this.context.get(ParticleEffectPass).remove(this.beams[3])
    }
}