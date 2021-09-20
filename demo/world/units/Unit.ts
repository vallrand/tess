import { Application } from '../../engine/framework'
import { vec2, vec3 } from '../../engine/math'
import { ActionSignal } from '../../engine/scene'
import { IUnit, TerrainSystem } from '../terrain'

interface MovementStrategy {
    evaluate(): Generator<{
        column: number
        row: number
        cost: number
    }>
}

export abstract class ControlUnit implements IUnit {
    actionIndex: number
    turn: number

    movementStrategy: any
    actionStrategy: any

    constructor(protected readonly context: Application){}
    public abstract place(column: number, row: number): void 
    public abstract kill(): void

    //public abstract appear(): Generator<ActionSignal>
    //public abstract disappear(): Generator<ActionSignal>
    //public abstract damage(): Generator<ActionSignal>
    public abstract move(path: vec2[]): Generator<ActionSignal>
    public abstract strike(target: vec3): Generator<ActionSignal>
}