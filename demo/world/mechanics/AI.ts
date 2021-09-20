import { Application, ISystem } from '../../engine/framework'
import { ActionSignal } from '../../engine/scene'
import { IActor, TurnBasedSystem } from './TurnBasedFlow'

import { PlayerSystem } from '../player'
import { ControlUnit, UnitFactory } from '../units'
import { TerrainSystem } from '../terrain'

export class AISystem implements IActor, ISystem {
    readonly order: number = 2
    actionIndex: number

    private readonly factory = UnitFactory(this.context)
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
    create(column: number, row: number, type: number): ControlUnit {
        const unit = new this.factory[type](this.context)
        this.list.push(unit) //remove when dead?
        unit.place(column, row)
        return unit
    }
}