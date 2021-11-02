import { Application, ISystem } from '../../engine/framework'
import { vec2, hashCantor } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { IActor, TurnBasedSystem } from '../common'

import { PlayerSystem } from '../player'
import { UnitFactory } from '../units'
import { TerrainSystem, Pathfinder } from '../terrain'
import { AIUnit } from './AIUnit'
import { AIStrategy, AIStrategyPlan } from './AIStrategy'

type IUnitType = keyof typeof UnitFactory
type ValueOf<T> = T[keyof T]

export class AISystem implements IActor, ISystem {
    readonly order: number = 2
    actionIndex: number

    public static readonly groups: Array<keyof typeof UnitFactory>[] = [
        [0,0,0,0,2,2],
        [1,1,4,4,8],
        [6,6,7,7]
    ]
    private readonly list: AIUnit[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
    }
    public update(): void {}
    public create<K extends keyof typeof UnitFactory>(column: number, row: number, type: K): InstanceType<typeof UnitFactory[K]> {
        const hash = hashCantor(column, row)
        for(let i = this.list.length - 1; i >= 0; i--) if(this.list[i].hash === hash) return null
        const factory = UnitFactory[type]
        const unit = factory.pool.pop() || new factory(this.context)
        unit.hash = hash
        unit.healthPoints = unit.maxHealthPoints
        unit.movementPoints = 0
        unit.actionPoints = 0
        unit.strategy.unit = unit
        this.list.push(unit)
        unit.place(column, row)
        return unit as any
    }
    public delete(unit: AIUnit): void {
        const index = this.list.indexOf(unit)
        if(index === -1) return
        else if(index === this.list.length - 1) this.list.length--
        else this.list[index] = this.list.pop()

        unit.delete()
        const factory: typeof UnitFactory[keyof typeof UnitFactory] = unit.constructor as any
        factory.pool.push(unit as any)
    }
    public query(origin: vec2, radius: number): AIUnit[] {
        const out = []
        out.push(this.list[0])
        for(let i = this.list.length - 1; i >= 0; i--){

        }
        return out
    }
    public execute(): Generator<ActionSignal> {
        console.time('AI')
        const queue: AIUnit[] = [], actions: Generator<ActionSignal>[] = []
        update: for(let i = this.list.length - 1; i >= 0; i--){
            const unit = this.list[i]
            if(unit.healthPoints <= 0) continue
            unit.movementPoints = Math.min(unit.movementPoints + unit.gainMovementPoints, Math.max(1, unit.gainMovementPoints))
            unit.actionPoints = Math.min(unit.actionPoints + unit.gainActionPoints, Math.max(1, unit.gainActionPoints))
            unit.strategy.precalculate()
            if(unit.strategy.aware) queue.push(unit)
        }
        return function*(){
            while(true) yield ActionSignal.WaitNextFrame
        }()

        tactics: while(queue.length){
            let index: number, optimal: AIStrategyPlan
            for(let i = queue.length - 1; i >= 0; i--){
                const plan = queue[i].strategy.plan(optimal?.priority)
                if(optimal && optimal.priority >= plan.priority) continue
                optimal = plan
                index = i
            }
            const unit = queue.splice(index, 1)[0]
            unit.strategy.clear()
            actions.push(unit.execute(optimal))
        }
        console.timeEnd('AI')
        return AnimationSystem.zip(actions)
    }
}