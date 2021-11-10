import { Application, ISystem } from '../../engine/framework'
import { range, vec2, hashCantor } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { TurnBasedSystem, IAgent } from '../common'

import { PlayerSystem } from '../player'
import { UnitFactory } from '../units'
import { TerrainSystem, Pathfinder } from '../terrain'
import { AIUnit } from './AIUnit'
import { AIStrategy, AIStrategyPlan } from './AIStrategy'

export class AISystem implements ISystem, IAgent {
    readonly order: number = 2

    public static readonly groups: Array<keyof typeof UnitFactory>[] = [
        [0,0,0,0,2,2],
        [1,1,4,4,8],
        [6,6,7,7]
    ]
    private readonly list: AIUnit[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
    }
    public update(): void {
        const { bounds, frame } = this.context.get(TerrainSystem)
        if(frame < this.context.frame) return

        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            if(item.tile[0] >= bounds[0] && item.tile[1] >= bounds[1] &&
                item.tile[0] < bounds[3] && item.tile[1] < bounds[3]
            ) continue
            this.remove(item)
            item.delete()
        }
    }
    public create<K extends keyof typeof UnitFactory>(column: number, row: number, type: K): InstanceType<typeof UnitFactory[K]> {
        const hash = hashCantor(column, row)
        for(let i = this.list.length - 1; i >= 0; i--) if(this.list[i].hash === hash) return null
        const factory = UnitFactory[type]
        const unit = factory.pool.pop() || new factory(this.context)
        unit.hash = hash
        unit.health.amount = unit.health.capacity
        unit.action.amount = unit.movement.amount = 0
        unit.strategy.unit = unit
        this.list.push(unit)
        unit.place(column, row)
        return unit as any
    }
    public remove(unit: AIUnit): void {
        const index = this.list.indexOf(unit)
        if(index === -1) return
        else if(index === this.list.length - 1) this.list.length--
        else this.list[index] = this.list.pop()
        unit.markTiles(false)
    }
    private readonly propagationRadius: number = 2
    private readonly revealRadius: number = 8
    public execute(): Generator<ActionSignal> {
        console.time('AI')
        const queue: AIUnit[] = [], actions: Generator<ActionSignal>[] = []
        const revealRadius = this.revealRadius * this.revealRadius
        const target = this.context.get(PlayerSystem).cube.tile
        awake: for(let i = this.list.length - 1; i >= 0; i--){
            const unit = this.list[i]
            if(unit.strategy.aware) continue
            unit.strategy.aware = vec2.distanceSquared(unit.tile, target) <= revealRadius
        }
        this.propagate(this.propagationRadius)
        update: for(let i = this.list.length - 1; i >= 0; i--){
            const unit = this.list[i]
            if(unit.health.amount <= 0) continue
            unit.regenerate()
            unit.strategy.precalculate()
            if(unit.strategy.aware) queue.push(unit)
        }

        tactics: while(queue.length){
            let index: number, optimal: AIStrategyPlan
            for(let i = queue.length - 1; i >= 0; i--){
                const plan = queue[i].strategy.plan(optimal?.priority)
                if(optimal && optimal.priority >= plan.priority) continue
                optimal = plan
                index = i
            }
            const unit = queue[index]
            queue[index] = queue[queue.length - 1]
            queue.length--
            unit.strategy.clear()
            actions.push(unit.execute(optimal))
        }
        console.timeEnd('AI')
        return AnimationSystem.zip(actions)
    }
    private propagate(radius: number): void {
        const radiusSquared = radius * radius
        const propagate: number[] = range(this.list.length)
        for(let i = this.list.length - 1; i >= 0; i--){
            const unit = this.list[i]
            if(unit.strategy.aware) continue

            for(let j = this.list.length - 1; j >= 0; j--){
                const neighbour = this.list[j]
                if(vec2.distanceSquared(unit.tile, neighbour.tile) > radiusSquared) continue
                if(neighbour.strategy.aware){
                    unit.strategy.aware = true
                    break
                }else if(j >= i) continue

                for(let last = j; true;){
                    let next = propagate[last]
                    if(next == i) break
                    else if(next == j){
                        propagate[last] = propagate[i]
                        propagate[i] = j
                        break
                    }
                    last = next
                }
            }
            if(unit.strategy.aware)
            for(let last = propagate[i]; last != i; last = propagate[last])
                this.list[last].strategy.aware = true
        }
    }
}