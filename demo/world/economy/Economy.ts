import { Application, ISystem } from '../../engine/framework'
import { aabb2 } from '../../engine/math'
import { ActionSignal } from '../../engine/animation'
import { TerrainSystem } from '../terrain'
import { TurnBasedSystem, IAgent, Cube } from '../player'

import { UpgradeMenu } from './UpgradeMenu'
import { Workshop } from './Workshop'
import { ResourceSpot } from './ResourceSpot'

export class EconomySystem implements ISystem, IAgent {
    readonly order: number = 1
    private readonly list: ResourceSpot[] = []
    readonly menu: UpgradeMenu = new UpgradeMenu(this.context)
    private workshops: Workshop[] = []
    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this)
        this.context.get(TurnBasedSystem).signalEnterTile.add((column: number, row: number, cube: Cube) => {
            if(cube instanceof Cube) for(let i = this.workshops.length - 1; i >= 0; i--)
                this.context.get(TurnBasedSystem).enqueue(this.workshops[i].react(cube), true)
        })
        this.context.get(TurnBasedSystem).signalReset.add(() => {
            while(this.list.length) this.list.pop().delete()
            while(this.workshops.length) this.workshops.pop().delete()
        })
    }
    public execute(): Generator<ActionSignal> {
        for(let i = this.workshops.length - 1; i >= 0; i--)
            if(this.workshops[i].cube) return this.workshops[i].enterWorkshop(this.workshops[i].cube)
    }
    public update(): void {
        const { bounds, frame } = this.context.get(TerrainSystem)
        if(frame < this.context.frame) return

        for(let i = this.list.length - 1; i >= 0; i--){
            const spot = this.list[i]
            if(aabb2.inside(bounds, spot.tile)) continue
            this.delete(spot)
        }
        for(let i = this.workshops.length - 1; i >= 0; i--)
            if(!aabb2.inside(bounds, this.workshops[i].tile))
                this.workshops.splice(i, 1)[0].delete()
    }
    public createDeposit(column: number, row: number): ResourceSpot {
        const spot = ResourceSpot.pool.pop() || new ResourceSpot(this.context)
        spot.place(column, row)
        spot.capacity = spot.amount = 1
        this.list.push(spot)
        return spot
    }
    public createWorkshop(column: number, row: number): Workshop {
        const workshop = Workshop.pool.pop() || new Workshop(this.context)
        workshop.place(column, row)
        workshop.menu = this.menu
        this.workshops.push(workshop)
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