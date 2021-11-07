import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { TerrainSystem } from '../terrain'
import { Direction, DirectionTile } from '../player'
import { Unit } from './Unit'

export const enum DamageType {
    None = 0x0000,
    Kinetic = 0x0001,
    Electric = 0x0002,
    Temperature = 0x0004,
    Corrosion = 0x0008
}

export abstract class UnitSkill {
    constructor(protected readonly context: Application){}
    readonly cost: number = 0
    readonly minRange: number = -1
    readonly range: number
    readonly cardinal?: boolean
    readonly pierce?: boolean
    readonly damageType: DamageType = DamageType.None
    readonly damage: number = 0

    public active: boolean = false

    // protected query(origin: vec2, direction: Direction): vec2[] {
    //     return null
    // }
    public static damage(source: UnitSkill, target: vec2): void {
        const targetUnit = source.context.get(TerrainSystem).getTile<Unit>(target[0], target[1])
        if(targetUnit && targetUnit.damage) targetUnit.damage(source.damage, source.damageType)
    }
    public static queryArea(context: Application, origin: vec2, minRange: number, maxRange: number, group: number): vec2[] {
        const size = Math.ceil(maxRange)
        const min = minRange * minRange, max = maxRange * maxRange
        const terrain = context.get(TerrainSystem)
        const out: vec2[] = []
        for(let dx = -size; dx <= size; dx++) for(let dy = -size; dy <= size; dy++){
            const distance = dx*dx + dy*dy
            if(min > distance || distance > max) continue
            const unit = terrain.getTile<Unit>(origin[0] + dx, origin[1] + dy)
            if(!unit || !(unit instanceof Unit) || (unit.group & group) == 0) continue
            if(out.indexOf(unit.tile) == -1) out.push(unit.tile)
        }
        return out
    }
    public static queryLine(context: Application, origin: vec2, direction: Direction, range: number, group: number): vec2[] {
        const step = DirectionTile[direction]
        const terrain = context.get(TerrainSystem)
        const out: vec2[] = []
        for(let i = 1; i <= range; i++){
            const x = origin[0] + i * step[0]
            const y = origin[1] + i * step[1]
            const unit = terrain.getTile<Unit>(x, y)
            if(unit == null || !(unit instanceof Unit) || (unit.group & group) == 0) continue
            if(out.indexOf(unit.tile) == -1) out.push(unit.tile)
        }
        return out
    }
}