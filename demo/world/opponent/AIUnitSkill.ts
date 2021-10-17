import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { TerrainSystem } from '../terrain'
import { AIUnit } from './AIUnit'

export abstract class AIUnitSkill {
    constructor(protected readonly context: Application){}
    readonly cost: number
    readonly radius: number
    readonly cardinal?: boolean
    readonly pierce?: boolean
    readonly damage: number

    public active: boolean = false
    abstract use(source: AIUnit, target: vec2): Generator<ActionSignal>

    public static damage(this: AIUnitSkill, amount: number, target: vec2): void {
        const targetUnit = this.context.get(TerrainSystem).getTile<AIUnit>(target[0], target[1])
        if(targetUnit) targetUnit.damage(amount)
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