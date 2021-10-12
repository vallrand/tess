import { Application, ISystem } from '../../engine/framework'
import { TerrainSystem } from '../terrain'

import { Workshop } from './Workshop'
import { ResourceSpot } from './ResourceSpot'

export class EconomySystem implements ISystem {
    private readonly pool: ResourceSpot[] = []
    private readonly list: ResourceSpot[] = []
    constructor(private readonly context: Application){}
    public update(): void {
        const { bounds, frame } = this.context.get(TerrainSystem)
        if(frame < this.context.frame) return

        for(let i = this.list.length - 1; i >= 0; i--){
            const spot = this.list[i]
            if(spot.tile[0] >= bounds[0] && spot.tile[1] >= bounds[1] &&
                spot.tile[0] < bounds[3] && spot.tile[1] < bounds[3]
            ) continue
            spot.delete()
            this.delete(spot)
        }
    }
    public createDeposit(column: number, row: number, capacity: number): ResourceSpot {
        const spot = this.pool.pop() || new ResourceSpot(this.context)
        spot.place(column, row)
        spot.capacity = spot.amount = capacity
        this.list.push(spot)
        return spot
    }
    public delete(component: ResourceSpot): void {
        const index = this.list.indexOf(component)
        if(index == -1) return
        this.pool.push(component)
        this.list[index] = this.list[this.list.length - 1]
        this.list.length--
    }
    public get(column: number, row: number): ResourceSpot | null {
        for(let i = this.list.length - 1; i >= 0; i--)
            if(this.list[i].tile[0] === column && this.list[i].tile[1] === row)
                return this.list[i]
        return null
    }
}