import { Application } from '../../../engine/framework'
import { randomFloat, clamp, quat, vec2, vec3, vec4, lerp, solveQuadratic } from '../../../engine/math'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, IAnimationTween, ease } from '../../../engine/animation'
import { TransformSystem } from '../../../engine/scene'
import { AudioSystem } from '../../../engine/audio'
import { ParticleEmitter } from '../../../engine/particles'
import { Sprite, BillboardType, MeshSystem, Mesh, Armature } from '../../../engine/components'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass, PointLightPass, PointLight } from '../../../engine/pipeline'

import { SharedSystem, ModelAnimation, CubeModuleModel } from '../../shared'
import { Cube, Direction, DirectionAngle, CubeModule, PlayerSystem } from '../../player'

const actionTimeline = {
    'cube.light.intensity': PropertyAnimation([
        { frame: 0.2, value: 1 },
        { frame: 0.6, value: 0, ease: ease.quadIn }
    ], lerp),
    'debris.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.6, value: [0,0,0,0.02], ease: ease.quadIn }
    ], vec4.lerp),
    'wreck.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.8, value: [0.2,0.2,0.2,0.02], ease: ease.quadIn }
    ], vec4.lerp),
    'spikes': EventTrigger([
        { frame: 0, value: 36 }
    ], EventTrigger.emit),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.4, value: 8, ease: ease.cubicOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 10 },
        { frame: 0.4, value: 0, ease: ease.sineIn }
    ], lerp),
    'wave.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [12,12,12], ease: ease.cubicOut }
    ], vec3.lerp),
    'wave.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'burn.transform.scale': PropertyAnimation([
        { frame: 0.2, value: vec3.ZERO },
        { frame: 0.6, value: [10,10,10], ease: ease.cubicOut }
    ], vec3.lerp),
    'burn.color': PropertyAnimation([
        { frame: 0.2, value: [0,0,0,1] },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.4, value: [6,6,6], ease: ease.quartOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0, value: [1,0.5,0.6,0.6] },
        { frame: 0.4, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

function ImpulseAnimation(tracks: {
    index: number
    position: vec3
    rotation: quat
    velocity: vec3
    angular: vec3
    gravity: vec3
}[]): IAnimationTween<Armature> {
    const endTime = tracks.map(({ gravity, velocity, position }) => solveQuadratic(gravity[1], 2*velocity[1], 2*position[1]))
    return function(elapsedTime: number, target: Armature){
        for(let i = tracks.length - 1; i >= 0; i--){
            const { index, position: p, rotation: r, velocity: v, angular: a, gravity } = tracks[i]
            const time = clamp(elapsedTime, 0, endTime[i])
            const node = target.nodes[index]

            node.position[0] = p[0] + time * v[0] + 0.5 * time * time * gravity[0]
            node.position[1] = p[1] + time * v[1] + 0.5 * time * time * gravity[1]
            node.position[2] = p[2] + time * v[2] + 0.5 * time * time * gravity[2]

            node.rotation[0] = r[0] + 0.5 * time * (a[0] * r[3] + a[1] * r[2] - a[2] * r[1])
            node.rotation[1] = r[1] + 0.5 * time * (a[1] * r[3] + a[2] * r[0] - a[0] * r[2])
            node.rotation[2] = r[2] + 0.5 * time * (a[2] * r[3] + a[0] * r[1] - a[1] * r[0])
            node.rotation[3] = r[3] + 0.5 * time * (-a[0] * r[0] - a[1] * r[1] - a[2] * r[2])
        }
        target.frame = 0
        return target
    }
}

export class DeathEffect {
    public static create(context: Application, source: Cube): DeathEffect {
        const effect = new DeathEffect(context)
        effect.index = context.get(AnimationSystem).start(effect.play(source), true)
        return effect
    }
    
    public index: number
    private spikes: ParticleEmitter
    private light: PointLight
    private wreck: Mesh
    private wave: Sprite
    private burn: Decal
    private ring: Sprite
    private debris: Mesh
    private cube: Cube

    constructor(private readonly context: Application){}
    public *play(cube: Cube): Generator<ActionSignal> {
        this.cube = cube
        vec4.copy(vec4.ZERO, this.cube.meshes[this.cube.side].color)
        this.wreck = this.context.get(MeshSystem).loadModel(CubeModuleModel[CubeModule.Death])
        this.wreck.transform = this.cube.transform
        const side = this.cube.sides[this.cube.side]
        const rotation = DirectionAngle[(this.cube.direction + side.direction) % 4]
        quat.copy(rotation, this.wreck.armature.nodes[0].rotation)
        ModelAnimation('close')(0, this.wreck.armature)
        this.context.get(PlayerSystem).tilemap.renderSubstitute(this.wreck.material)

        this.spikes = SharedSystem.particles.spikes.add({
            uLifespan: [0.5,1,-0.1,0],
            uOrigin: this.wreck.transform.position, uTarget: [0,-0.2,0],
            uGravity: vec3.ZERO, uRotation: vec2.ZERO,
            uFrame: [0,2], uSize: [1,4],
            uRadius: [0.2,0.4], uForce: [1,4]
        })
        this.light = this.context.get(PointLightPass).create([1,0.4,0.6])
        this.light.transform = this.context.get(TransformSystem)
        .create([0,1,0],quat.IDENTITY,vec3.ONE,this.wreck.transform)

        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.displacement.ring
        this.wave.transform = this.context.get(TransformSystem)
        .create([0,1,0], quat.HALF_X, vec3.ONE,this.wreck.transform)
        this.context.get(PostEffectPass).add(this.wave)

        this.burn = this.context.get(DecalPass).create(4)
        this.burn.material = SharedSystem.materials.decal.rays
        this.burn.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.wreck.transform)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.burst
        this.ring.transform = this.context.get(TransformSystem)
        .create(vec3.AXIS_Y, quat.HALF_X, vec3.ONE, this.wreck.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.debris = this.context.get(SharedSystem).debris.create(this.wreck.transform.position)

        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'wreck.armature': ImpulseAnimation(this.wreck.armature.nodes.slice(1).map(function(node, index){
                const position = vec3.copy(node.position, vec3())
                const rotation = quat.copy(node.rotation, quat())
                const force = vec3.subtract(position, [
                    randomFloat(-0.4,0.4,SharedSystem.random()),
                    randomFloat(-2.0,-1.0,SharedSystem.random()),
                    randomFloat(-0.4,0.4,SharedSystem.random())
                ], vec3())
                vec3.normalize(force, force)
                vec3.scale(force, randomFloat(6,12,SharedSystem.random()), force)

                const torque = vec3.subtract(vec3.AXIS_Y, position, vec3())
                vec3.cross(torque, force, torque)

                return {
                    index: index + 1, position, rotation,
                    gravity: vec3(0, -30, 0), velocity: force, angular: torque
                }
            })),
            'wreck.armature.nodes.0.position': PropertyAnimation([
                { frame: 1.2, value: vec3.ZERO },
                { frame: 1.6, value: [0,-1,0], ease: ease.quadIn }
            ], vec3.lerp)
        })
        this.context.get(AudioSystem).create(`assets/cube_death.mp3`, 'sfx', this.wreck.transform).play(0)

        for(const duration = 1.6, startTime = this.context.currentTime + 0.2; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(SharedSystem).debris.delete(this.debris)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        SharedSystem.particles.spikes.remove(this.spikes)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(MeshSystem).delete(this.wreck)
        Sprite.delete(this.ring)
        Sprite.delete(this.wave)
    }
}