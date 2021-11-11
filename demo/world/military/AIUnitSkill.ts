import { vec2 } from '../../engine/math'
import { ActionSignal } from '../../engine/animation'
import { UnitSkill } from './UnitSkill'
import { AIUnit } from './AIUnit'

export abstract class AIUnitSkill extends UnitSkill {
    readonly group: number = 1
    readonly duration: number = 0
    abstract use(source: AIUnit, target: vec2): Generator<ActionSignal>

    public validate(origin: vec2, target: vec2): boolean {
        const dx = Math.abs(origin[0] - target[0])
        const dy = Math.abs(origin[1] - target[1])
        if(this.cardinal) return (
            dx === 0 && dy <= this.range && dy >= this.minRange ||
            dy === 0 && dx <= this.range && dx >= this.minRange
        )
        const distance = dx*dx+dy*dy
        return distance <= this.range * this.range && distance >= this.minRange * this.minRange
    }
    public aim(origin: vec2, tiles: vec2[], threshold?: number): vec2 | null {
        for(let i = tiles.length - 1; i >= 0; i--)
            if(this.validate(origin, tiles[i])) return tiles[i]
    }
}