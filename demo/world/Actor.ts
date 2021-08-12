import { Application, System } from '../engine/framework'

export const enum ActionSignal {
    WaitNextFrame = 0,
    WaitQueueEnd = 1,
    WaitTurnStart = 2
}

export interface IActor {
    order: number
    prevAction: number
    place(column: number, row: number): void
    kill(): void
    execute(turn: number): Generator<ActionSignal>
}

export class TurnBasedSystem implements System {
    private readonly actors: IActor[] = []
    private readonly queue: {
        generator: Generator<ActionSignal>
        iterator: IteratorResult<ActionSignal>
        pending: boolean
        index: number
    }[] = []
    private index: number = 0
    private turn: number = 0

    private actionIndex: number = 0
    private lastActionIndex: number = 0

    constructor(private readonly context: Application){}
    public start(generator: Generator<ActionSignal>, pending: boolean): number {
        this.queue.push({ generator, iterator: null, pending, index: this.actionIndex++ })
        return this.actionIndex - 1
    }
    public add(actor: IActor): void {
        let index: number
        for(index = this.actors.length - 1; index >= 0 && this.actors[index].order - actor.order > 0; index--);
        this.actors.splice(index + 1, 0, actor)
        if(index + 1 <= this.index) this.index++
    }
    public remove(actor: IActor): void {
        const index = this.actors.indexOf(actor)
        this.actors.splice(index, 1)
        if(index <= this.index) this.index--
    }
    update(){
        turn: {
            if(!this.actors.length || this.lastActionIndex < this.actionIndex) break turn
            if(this.index >= this.actors.length){
                this.turn++
                this.index = 0
            }
            const lastAction = this.queue[0] ? this.queue[0].index : this.actionIndex-1
            while(this.index < this.actors.length){
                const actor = this.actors[this.index++]
                if(actor.prevAction >= lastAction) break turn
                const generator = actor.execute(this.turn)
                if(!generator) continue
                actor.prevAction = this.start(generator, true)
                break
            }
        }
        animate: {
            this.lastActionIndex = this.actionIndex
            let removed = 0
            outer: for(let i = 0; i < this.queue.length; i++){
                const action = this.queue[i]
                const index = i - removed
                if(
                    !action.iterator ||
                    action.iterator.value === ActionSignal.WaitNextFrame ||
                    action.iterator.value === ActionSignal.WaitTurnStart && this.lastActionIndex >= action.index || 
                    action.iterator.value === ActionSignal.WaitQueueEnd && index === 0
                ) action.iterator = action.generator.next()

                if(action.pending && !action.iterator.done)
                    this.lastActionIndex = Math.min(this.lastActionIndex, action.index)

                if(action.iterator.done) removed++
                else this.queue[index] = action
            }
            this.queue.length -= removed
        }
    }
}