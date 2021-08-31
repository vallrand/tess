import { Application } from '../../engine/framework'
import { _ActionSignal } from '../Actor'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube } from '../player'

export abstract class CubeSkill {
    constructor(protected readonly context: Application, protected readonly cube: Cube){}
    public *open(): Generator<_ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            armatureAnimation.open(elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }
        state.open = 1
    }
    public *close(): Generator<_ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            armatureAnimation.open(1.0 - elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }
        state.open = 0
    }
}