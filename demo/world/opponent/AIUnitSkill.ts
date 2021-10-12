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
    abstract use(source: AIUnit, target: vec2): Generator<ActionSignal>

    public static damage(this: AIUnitSkill, amount: number, target: vec2): void {
        const targetUnit = this.context.get(TerrainSystem).getTile<AIUnit>(target[0], target[1])
        if(targetUnit) targetUnit.damage(amount)
    }
}