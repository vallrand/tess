import { Application, ISystem } from '../../engine/framework'
import { AnimationSystem, ActionSignal } from '../../engine/animation'

export interface IActor {
    readonly order: number
    actionIndex: number
    execute(): Generator<ActionSignal, void>
}

export class TurnBasedSystem implements ISystem {
    private readonly actors: IActor[] = []
    public turn: number = 0
    private index: number = 0
    private lastAction: ActionSignal = ActionSignal.WaitNextFrame
    constructor(protected readonly context: Application){}
    public add(actor: IActor): void {
        let index = this.actors.length - 1
        while(index >= 0 && this.actors[index].order - actor.order > 0) index--
        this.actors.splice(index + 1, 0, actor)
        if(index + 1 <= this.index) this.index++
    }
    public remove(actor: IActor): void {
        const index = this.actors.indexOf(actor)
        this.actors.splice(index, 1)
        if(index <= this.index) this.index--
    }
    public update(): void {
        if(!this.lastAction.continue) return
        const animations = this.context.get(AnimationSystem)
        if(this.index >= this.actors.length && this.actors.length){
            this.index = 0
            this.turn++
        }
        while(this.index < this.actors.length){
            const actor = this.actors[this.index]

            this.lastAction = animations.await(actor.actionIndex)
            if(!this.lastAction.continue) break

            this.index++
            
            const generator = actor.execute()
            if(!generator) continue
            actor.actionIndex = animations.start(generator, true)

            this.lastAction = animations.await(actor.actionIndex)
            if(!this.lastAction.continue) break
        }
    }
}