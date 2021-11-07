import { Application, ISystem } from '../../engine/framework'
import { ActionSignal } from '../../engine/animation'
import { TerrainSystem } from '../terrain'
import { TurnBasedSystem, IAgent } from '../common'
import { Cube } from '../player'

import { Workshop } from './Workshop'
import { ResourceSpot } from './ResourceSpot'

export class EconomySystem implements ISystem, IAgent {
    readonly order: number = 1
    private readonly list: ResourceSpot[] = []
    private workshop: Workshop
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
        this.context.get(TurnBasedSystem).signalEnterTile.add((column: number, row: number, cube: Cube) => {
            if(!(cube instanceof Cube) || !this.workshop) return
            this.context.get(TurnBasedSystem).enqueue(this.workshop.react(cube), true)
        })
    }
    public execute(): Generator<ActionSignal> {
        if(this.workshop && this.workshop.cube) return this.workshop.enterWorkshop(this.workshop.cube)
    }
    public update(): void {
        const { bounds, frame } = this.context.get(TerrainSystem)
        if(frame < this.context.frame) return

        for(let i = this.list.length - 1; i >= 0; i--){
            const spot = this.list[i]
            if(spot.tile[0] >= bounds[0] && spot.tile[1] >= bounds[1] &&
                spot.tile[0] < bounds[3] && spot.tile[1] < bounds[3]
            ) continue
            this.delete(spot)
        }
    }
    public createDeposit(column: number, row: number, capacity: number): ResourceSpot {
        const spot = ResourceSpot.pool.pop() || new ResourceSpot(this.context)
        spot.place(column, row)
        spot.capacity = spot.amount = capacity
        this.list.push(spot)
        return spot
    }
    public createWorkshop(column: number, row: number): Workshop {
        const workshop = Workshop.pool.pop() || new Workshop(this.context)
        workshop.place(column, row)
        this.workshop = workshop
        return workshop
    }
    public delete(item: ResourceSpot): void {
        const index = this.list.indexOf(item)
        if(index == -1) return
        else if(index === this.list.length - 1) this.list.length--
        else this.list[index] = this.list.pop()
        item.delete()
    }
    public get(column: number, row: number): ResourceSpot | null {
        for(let i = this.list.length - 1; i >= 0; i--)
            if(this.list[i].tile[0] === column && this.list[i].tile[1] === row)
                return this.list[i]
        return null
    }
}