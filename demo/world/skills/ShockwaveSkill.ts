import { mat4, quat, vec3 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { Decal, DecalPass } from '../../engine/deferred/DecalPass'
import { TransformSystem } from '../../engine/Transform'
import { SpriteMaterial } from '../../engine/Sprite'
import { ActionSignal } from '../Actor'
import { animations } from '../animations'
import { AnimationTimeline, PropertyAnimation } from '../animations/timeline'
import { Cube, cubeModules } from '../player'
import { SharedSystem } from '../shared'

const timelineTracks = {
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: [3,3,3] }
    ], vec3.lerp)
}

export class ShockwaveSkill {
    private ring: Decal
    constructor(private readonly context: Application, private readonly cube: Cube){
        this.ring = this.context.get(DecalPass).create()
        this.ring.transform = this.context.get(TransformSystem).create()
        this.ring.material = new SpriteMaterial()
        this.ring.material.diffuse = SharedSystem.textures.raysRing
        vec3.set(3,3,3, this.ring.transform.scale)
    }
    public *activate(transform: mat4, orientation: quat): Generator<ActionSignal> {

        this.ring = this.context.get(DecalPass).create()
        this.ring.transform = this.context.get(TransformSystem).create()
        this.ring.material = new SpriteMaterial()
        this.ring.material.diffuse = SharedSystem.textures.raysRing


        const mesh = this.cube.meshes[this.cube.state.side]
        const moduleSettings = cubeModules[this.cube.state.sides[this.cube.state.side].type]

        const animate = AnimationTimeline(this, {
            ...timelineTracks
        })

        for(let duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            animations[moduleSettings.model].activate(elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    }
}