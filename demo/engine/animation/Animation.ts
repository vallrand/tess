import { Application, ISystem } from '../framework'

export interface ActionSignal {
    continue: boolean
}
export const ActionSignal = {
    WaitNextFrame: <ActionSignal> { continue: true }
}

export class AnimationSystem implements ISystem {
    public static *zip(generators: Generator<ActionSignal>[]): Generator<ActionSignal> {
        while(true){
            let signal = null
            for(let i = generators.length - 1; i >= 0; i--){
                const iterator = generators[i].next()
                if(!iterator.done) signal = iterator.value
            }
            if(!signal) break
            else yield signal
        }
    }
    public static *join(generators: Generator<ActionSignal>[]): Generator<ActionSignal> {
        for(let i = 0; i < generators.length; i++)
            for(const generator = generators[i]; true;){
                const iterator = generator.next()
                if(iterator.done) break
                else yield iterator.value
            }
    }

    private index: number = 1
    private readonly pending: Array<ActionSignal & { target: number }> = []
    private readonly queue: {
        generator: Generator<ActionSignal>
        iterator: IteratorResult<ActionSignal, ActionSignal>
        index: number
    }[] = []
    constructor(private readonly context: Application){}
    private indexOf(index: number): number {
        for(let i = 0; i < this.queue.length; i++)
            if(this.queue[i].index > index) return -1
            else if(this.queue[i].index === index) return i
        return -1
    }
    public await(index: number): ActionSignal {
        if(index == null || this.indexOf(index) == -1) return ActionSignal.WaitNextFrame
        const signal = { target: index, continue: false }
        this.pending.push(signal)
        return signal
    }
    public stop(index: number): void {
        for(let i = this.queue.length - 1; i >= 0; i--)
            if(this.queue[i].index === index){
                this.queue[i].generator.return(null)
                this.queue.splice(i, 1)
                this.dispatch(index)
                break
            }
    }
    private dispatch(index: number): void {
        let removed = 0
        for(let i = 0; i < this.pending.length; i++)
            if(this.pending[i].target === index){
                this.pending[i].continue = true
                removed++
            }else this.pending[i - removed] = this.pending[i]
        this.pending.length -= removed
    }
    public update(): void {
        let removed = 0
        for(let i = 0; i < this.queue.length; i++){
            const routine = this.queue[i]
            if(
                !routine.iterator ||
                routine.iterator.value === ActionSignal.WaitNextFrame ||
                routine.iterator.value.continue
            ) routine.iterator = routine.generator.next()

            if(routine.iterator.done) this.dispatch(routine.index)

            if(routine.iterator.done) removed++
            else this.queue[i - removed] = routine
        }
        this.queue.length -= removed
    }
    public start(generator: Generator<ActionSignal>, defer: boolean): number {
        const routine = { generator, iterator: null, index: this.index }
        if(!defer && (routine.iterator = routine.generator.next()).done) return
        this.queue.push(routine)
        return this.index++
    }
}