import { Application } from '../../engine/framework'
import { mod, vec2 } from '../../engine/math'
import { Mesh } from '../../engine/components'
import { ActionSignal } from '../../engine/animation'
import { ModelAnimation } from '../shared'
import { Cube, Direction } from '../player'
import { UnitSkill } from '../military'

export class CubeSkill extends UnitSkill {
    constructor(context: Application, protected readonly cube: Cube){super(context)}
    readonly group: number = 2
    get direction(): Direction { return mod(this.cube.direction + this.cube.sides[this.cube.side].direction, 4) }
    get mesh(): Mesh { return this.cube.meshes[this.cube.side] }
    public *open(): Generator<ActionSignal> {
        if(!this.validate()) return
        const state = this.cube.sides[this.cube.side]
        const mesh = this.cube.meshes[this.cube.side]
        const open = ModelAnimation('open')

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            open(elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        state.open = 1
    }
    public *close(): Generator<ActionSignal> {
        const state = this.cube.sides[this.cube.side]
        const mesh = this.cube.meshes[this.cube.side]
        const open = ModelAnimation('open')

        for(const duration = 0.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            open(1.0 - elapsedTime / duration, mesh.armature)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        state.open = 0
        this.clear()
    }
    public update(): void {}
    protected validate(): boolean { return true }
    protected clear(): void {}
    protected query(direction: Direction): vec2[] | vec2 | null { return null }
}