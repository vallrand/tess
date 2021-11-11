import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'

import { IAgent, TurnBasedSystem } from '../common'
import { TerrainSystem } from '../terrain'
import { UnitSkill, Unit, IUnitAttribute } from '../military'

export interface IUnitOrb extends UnitSkill {
    readonly tile: vec2
    readonly direction: vec2
    readonly health: IUnitAttribute
    readonly group: number
    delete(): void
    dissolve(): Generator<ActionSignal>
    move(target: vec2): Generator<ActionSignal>
}

export class CorrosionPhase implements IAgent {
    readonly order: number = 4
    readonly list: IUnitOrb[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
    }
    public execute(): Generator<ActionSignal> {
        const terrain = this.context.get(TerrainSystem), bounds = terrain.bounds
        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            if(item.tile[0] < bounds[0] || item.tile[1] < bounds[1] || item.tile[0] >= bounds[2] || item.tile[1] >= bounds[3])
                item.delete()
            else if(--item.health.amount <= 0)
                this.context.get(AnimationSystem).start(item.dissolve(), true)
            else{
                const entity = terrain.getTile<Unit>(item.tile[0], item.tile[1])
                if(entity == null || !(entity instanceof Unit) || (entity.group & item.group) == 0)
                    vec2.add(item.direction, item.tile, item.tile)
                let override = false
                for(let j = this.list.length - 1; j > i; j--){
                    const { tile, direction } = this.list[j]
                    if((tile[0] === item.tile[0] && tile[1] === item.tile[1]) || (
                        tile[0] === item.tile[0] - item.direction[0] &&
                        tile[1] === item.tile[1] - item.direction[1] &&
                        tile[0] - direction[0] === item.tile[0] &&
                        tile[1] - direction[1] === item.tile[1]
                    )){
                        override = true
                        break
                    }
                }
                if(override) this.context.get(AnimationSystem).start(item.dissolve(), true)
                else{
                    const entity = terrain.getTile<Unit>(item.tile[0], item.tile[1])
                    const target = (entity == null || !(entity instanceof Unit) || (entity.group & item.group) == 0) ? null : entity.tile
                    this.context.get(TurnBasedSystem).enqueue(item.move(target), true)
                    continue
                }
            }
            this.list.splice(i, 1)
        }
        return null
    }
    public add(item: IUnitOrb): void {
        for(let i = this.list.length - 1; i >= 0; i--){
            const replaced = this.list[i]
            if(replaced.tile[0] !== item.tile[0] || replaced.tile[1] !== item.tile[1]) continue
            this.list.splice(i, 1)
            this.context.get(AnimationSystem).start(replaced.dissolve(), true)
        }
        this.list.push(item)
    }
}