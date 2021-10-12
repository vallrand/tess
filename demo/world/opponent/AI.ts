import { Application, ISystem } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { IActor, TurnBasedSystem } from '../common'

import { PlayerSystem } from '../player'
import { UnitFactory } from '../units'
import { TerrainSystem } from '../terrain'

type IUnitFactory = ReturnType<typeof UnitFactory>

import { AIUnit, AIStrategyPlan } from './AIUnit'

export class AISystem implements IActor, ISystem {
    readonly order: number = 2
    actionIndex: number

    private readonly factory: IUnitFactory = UnitFactory(this.context)
    private readonly list: AIUnit[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
    }
    public update(): void {}
    public execute(): Generator<ActionSignal> {
        const terrain = this.context.get(TerrainSystem)
        update: for(let i = this.list.length - 1; i >= 0; i--){
            const unit = this.list[i]
            unit.movementPoints = Math.min(unit.movementPoints + unit.gainMovementPoints, Math.max(1, unit.gainMovementPoints))
            unit.actionPoints = Math.min(unit.actionPoints + unit.gainActionPoints, Math.max(1, unit.gainActionPoints))
        }

        const queue = this.list.slice(), actions: Generator<ActionSignal>[] = []
        console.time('AI')
        tactics: while(queue.length){
            let index: number, optimal: AIStrategyPlan
            for(let i = queue.length - 1; i >= 0; i--){
                const plan = queue[i].strategy()
                if(optimal && optimal.priority <= plan.priority) continue
                optimal = plan
                index = i
            }
            const unit = queue.splice(index, 1)[0]
            actions.push(unit.execute(optimal))
        }
        console.timeEnd('AI')
        return AnimationSystem.zip(actions)
    }
    public create<K extends keyof IUnitFactory>(column: number, row: number, type: K): InstanceType<IUnitFactory[K]> {
        const unit = new this.factory[type](this.context)
        this.list.push(unit) //remove when dead?
        unit.place(column, row)
        return unit as any
    }
    public delete(unit: AIUnit): void {
        
    }
    public query(origin: vec2, radius: number): AIUnit[] {
        const out = []
        out.push(this.list[0])
        for(let i = this.list.length - 1; i >= 0; i--){

        }
        return out
    }
}