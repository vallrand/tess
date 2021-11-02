import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { TerrainSystem } from '../terrain'
import { AIUnit } from './AIUnit'

export const enum DamageType {
    None = 0x0000,
    Kinetic = 0x0001,
    Electric = 0x0002,
    Temperature = 0x0004,
    Corrosion = 0x0008
}

export interface IDamageSource {
    readonly amount: number
    readonly type: DamageType
}

export abstract class AIUnitSkill {
    constructor(protected readonly context: Application){}
    readonly cost: number
    readonly radius: number
    readonly cardinal?: boolean
    readonly pierce?: boolean
    readonly damage: IDamageSource

    public active: boolean = false
    abstract use(source: AIUnit, target: vec2): Generator<ActionSignal>

    public static damage(this: AIUnitSkill, source: IDamageSource, target: vec2): void {
        const targetUnit = this.context.get(TerrainSystem).getTile<AIUnit>(target[0], target[1])
        if(targetUnit && targetUnit.damage) targetUnit.damage(source.amount, source.type)
    }
    public validate(origin: vec2, target: vec2): boolean {
        if(this.cardinal) return (
            origin[0] === target[0] && Math.abs(origin[1] - target[1]) <= this.radius ||
            origin[1] === target[1] && Math.abs(origin[0] - target[0]) <= this.radius
        )
        else return vec2.distanceSquared(origin, target) <= this.radius * this.radius
    }
    public aim(origin: vec2, tiles: vec2[]): vec2 | null {
        for(let i = tiles.length - 1; i >= 0; i--)
            if(this.validate(origin, tiles[i])) return tiles[i]
    }
}