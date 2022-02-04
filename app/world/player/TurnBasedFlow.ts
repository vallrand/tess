import { Application, ISystem, Signal } from '../../engine/framework'
import { AnimationSystem, ActionSignal } from '../../engine/animation'

export interface IAgent {
    readonly order: number
    execute(): Generator<ActionSignal, void, void>
}

export class TurnBasedSystem implements ISystem {
    readonly signalEnterTile = new Signal<(column: number, row: number, unit: any) => void>()
    readonly signalReset = new Signal<() => void>()

    private readonly agents: IAgent[] = []
    private readonly queue: ActionSignal[] = []
    private index: number = 0
    constructor(protected readonly context: Application){}
    public add(agent: IAgent): void {
        let index = this.agents.length - 1
        while(index >= 0 && this.agents[index].order - agent.order > 0) index--
        this.agents.splice(index + 1, 0, agent)
        if(index + 1 <= this.index) this.index++
    }
    public remove(agent: IAgent): void {
        const index = this.agents.indexOf(agent)
        this.agents.splice(index, 1)
        if(index <= this.index) this.index--
    }
    public update(): void {
        while(this.index < this.agents.length){
            while(this.queue.length)
                if(!this.queue[0].continue) return
                else this.queue.shift()

            const action = this.agents[this.index++].execute()
            if(action) this.enqueue(action, true)
        }
        this.index = 0
    }
    public enqueue(generator: Generator<ActionSignal, void, void>, blocking: boolean): void {
        const animations = this.context.get(AnimationSystem)
        this.queue.push(animations.await(animations.start(generator, true)))
    }
}