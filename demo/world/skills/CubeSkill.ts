import { Application } from '../../engine/framework'
import { mod } from '../../engine/math'
import { _ActionSignal } from '../Actor'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube, Direction } from '../player'

export class CubeSkill {
    constructor(protected readonly context: Application, protected readonly cube: Cube){}
    get direction(): Direction {
        return mod(this.cube.state.direction + this.cube.state.sides[this.cube.state.side].direction, 4)
    }
    public *open(): Generator<_ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
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

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            armatureAnimation.open(1.0 - elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            yield _ActionSignal.WaitNextFrame
        }
        state.open = 0
    }
}