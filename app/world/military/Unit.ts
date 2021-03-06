import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { DamageType } from './UnitSkill'

export interface IUnitAttribute {
    capacity: number
    amount: number
    gain?: number
}

export abstract class Unit {
    public readonly tile: vec2 = vec2()
    public abstract readonly weight: number
    public readonly size: vec2 = vec2.ONE
    constructor(protected readonly context: Application){}

    abstract readonly group: number
    abstract readonly health: IUnitAttribute
    abstract readonly action: IUnitAttribute
    abstract readonly movement: IUnitAttribute

    public regenerate(): void {
        if(this.health.amount <= 0) return
        this.health.amount = Math.min(this.health.capacity, this.health.amount + this.health.gain)
        this.action.amount = Math.min(this.action.capacity, this.action.amount + this.action.gain)
        this.movement.amount = Math.min(this.movement.capacity, this.movement.amount + this.movement.gain)
    }

    public abstract delete(): void
    public abstract place(column: number, row: number): void
    public abstract damage(amount: number, type: DamageType): void
}