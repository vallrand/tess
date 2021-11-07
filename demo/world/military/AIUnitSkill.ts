import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { AnimationSystem, ActionSignal } from '../../engine/animation'
import { UnitSkill } from './UnitSkill'
import { AIUnit } from './AIUnit'

export abstract class AIUnitSkill extends UnitSkill {
    abstract use(source: AIUnit, target: vec2): Generator<ActionSignal>

    public validate(origin: vec2, target: vec2): boolean {
        if(this.cardinal) return (
            origin[0] === target[0] && Math.abs(origin[1] - target[1]) <= this.range ||
            origin[1] === target[1] && Math.abs(origin[0] - target[0]) <= this.range
        )
        else return vec2.distanceSquared(origin, target) <= this.range * this.range
    }
    public aim(origin: vec2, tiles: vec2[]): vec2 | null {
        for(let i = tiles.length - 1; i >= 0; i--)
            if(this.validate(origin, tiles[i])) return tiles[i]
    }
}