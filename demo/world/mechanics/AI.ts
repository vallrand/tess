import { Application, ISystem } from '../../engine/framework'
import { vec2 } from '../../engine/math'
import { ActionSignal } from '../../engine/scene'
import { IActor, TurnBasedSystem } from './TurnBasedFlow'

import { PlayerSystem } from '../player'
import { ControlUnit, UnitFactory } from '../units'
import { TerrainSystem } from '../terrain'

type IUnitFactory = ReturnType<typeof UnitFactory>

export class AISystem implements IActor, ISystem {
    readonly order: number = 2
    actionIndex: number

    private readonly factory: IUnitFactory = UnitFactory(this.context)
    private readonly list: ControlUnit[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
    }
    public update(): void {}
    public *execute(): Generator<ActionSignal> {
        const { cube } = this.context.get(PlayerSystem)
        const terrain = this.context.get(TerrainSystem)
        const target = cube.state.tile

        hivemind: for(let i = 0; i < this.list.length; i++){
            const unit = this.list[i]
            
        }
    }
    public create<K extends keyof IUnitFactory>(column: number, row: number, type: K): InstanceType<IUnitFactory[K]> {
        const unit = new this.factory[type](this.context)
        this.list.push(unit) //remove when dead?
        unit.place(column, row)
        return unit as any
    }
    public query(origin: vec2, radius: number): ControlUnit[] {
        const out = []
        out.push(this.list[0])
        for(let i = this.list.length - 1; i >= 0; i--){

        }
        return out
    }
}