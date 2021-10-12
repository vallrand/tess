import { Application } from '../../engine/framework'
import { mod } from '../../engine/math'
import { Mesh } from '../../engine/components'
import { ActionSignal } from '../../engine/animation'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube, Direction } from '../player'

export class CubeSkill {
    constructor(protected readonly context: Application, protected readonly cube: Cube){}
    get direction(): Direction {
        return mod(this.cube.state.direction + this.cube.state.sides[this.cube.state.side].direction, 4)
    }
    get mesh(): Mesh { return this.cube.meshes[this.cube.state.side] }
    public *open(): Generator<ActionSignal> {
        if(!this.validate()) return
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            armatureAnimation.open(elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        state.open = 1
    }
    public *close(): Generator<ActionSignal> {
        const state = this.cube.state.sides[this.cube.state.side]
        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[state.type]]

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            armatureAnimation.open(1.0 - elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        state.open = 0
        this.clear()
    }
    protected validate(): boolean { return true }
    protected clear(): void {

    }
}