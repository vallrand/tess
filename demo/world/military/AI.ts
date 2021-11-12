import { Application, ISystem } from '../../engine/framework'
import { range, vec2, aabb2 } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { TurnBasedSystem, IAgent, PlayerSystem } from '../player'
import { UnitFactory, UnitType } from '../units'
import { TerrainSystem } from '../terrain'
import { AIUnit } from './AIUnit'
import { AIStrategyPlan } from './AIStrategy'
import { StatusBar } from '../units/effects/StatusBar'

function WeightTable<T>(values: T[], weights: number[]){
    const total = weights.reduce((total, value) => total + value, 0)
    return function(random: number){
        const index = random * total | 0
        for(let weight = 0, i = 0; i < weights.length; i++)
            if(index < (weight += weights[i])) return values[i]
    }
}

export class AISystem implements ISystem, IAgent {
    readonly order: number = 2

    public static readonly special = WeightTable<{
        value: UnitType
        size: number
    }>([
        {size:0,value:null},
        {size:2,value:UnitType.Locust},
        {size:3,value:UnitType.Monolith}
    ], [2,3,1])
    public static readonly groups: Array<UnitType>[] = [
        [UnitType.Scarab,UnitType.Scarab,UnitType.Scarab,UnitType.Scarab,UnitType.Stingray,UnitType.Stingray],
        [UnitType.Tarantula,UnitType.Tarantula,UnitType.Obelisk,UnitType.Obelisk,UnitType.TarantulaVariant],
        [UnitType.Decapod,UnitType.Decapod,UnitType.Isopod,UnitType.Isopod]
    ]
    private readonly list: AIUnit[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
        this.context.get(TurnBasedSystem).signalReset.add(() => {
            for(let i = this.list.length - 1; i >= 0; i--){
                const item = this.list[i]
                this.remove(item)
                item.delete()
            }
        })
    }
    public update(): void {
        const { bounds, frame } = this.context.get(TerrainSystem)
        if(frame < this.context.frame) return

        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            if(aabb2.inside(bounds, item.tile)) continue
            this.remove(item)
            item.delete()
        }
    }
    public create<K extends keyof typeof UnitFactory>(column: number, row: number, type: K, hash?: number): InstanceType<typeof UnitFactory[K]> {
        if(hash) for(let i = this.list.length - 1; i >= 0; i--) if(this.list[i].hash === hash) return null
        const factory = UnitFactory[type]
        const unit = factory.pool.pop() || new factory(this.context)
        unit.hash = hash
        unit.health.amount = unit.health.capacity
        unit.action.amount = unit.movement.amount = 0
        unit.strategy.unit = unit
        unit.strategy.aware = false
        this.list.push(unit)
        unit.place(column, row)
        unit.status = StatusBar.create(this.context, unit)
        return unit as any
    }
    public remove(unit: AIUnit): void {
        const index = this.list.indexOf(unit)
        if(index === -1) return
        else if(index === this.list.length - 1) this.list.length--
        else this.list[index] = this.list.pop()
        unit.status.delete()
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