import { ease, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { AnimationTimeline, PropertyAnimation, EmitterTrigger, AnimationSystem, ActionSignal } from '../../engine/scene/Animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, EffectMaterial, ShaderMaterial, SpriteMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'
import { shaders } from '../../engine/shaders'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { _ActionSignal } from '../Actor'
import { Cube } from '../player'
import { CubeSkill } from './CubeSkill'

const actionTimeline = {

}

export class ExtractSkill extends CubeSkill {
    //excavation
    constructor(context: Application, cube: Cube){
        super(context, cube)
    }
    public *activate(transform: mat4, orientation: quat): Generator<_ActionSignal> {
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const animate = AnimationTimeline(this, {
            ...actionTimeline
        })

        for(const duration = 2.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }
    }
}