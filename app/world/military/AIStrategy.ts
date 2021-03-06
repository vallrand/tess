import { Application } from '../../engine/framework'
import { vec2, randomFloat, mulberry32 } from '../../engine/math'
import { TerrainSystem, Pathfinder } from '../terrain'
import { PlayerSystem } from '../player'
import { AIUnit } from './AIUnit'

export interface AIStrategyPlan {
    priority: number
    delay: number
    path?: vec2[]
    origin: vec2
    target?: vec2
    skill: number
    reverse?: boolean
}

export class AIStrategy {
    private static readonly random = mulberry32()
    private static readonly tile: vec2 = vec2()
    static lineOfSight(map: Pathfinder, start: vec2, end: vec2): boolean {
        const tx = start[0] <= end[0] ? 1 : -1, ty = start[1] <= end[1] ? 1 : -1
        const nx = Math.abs(end[0] - start[0]), ny = Math.abs(end[1] - start[1])
        for(let ix = 0, iy = 0; ix < nx || iy < ny;){
            let direction = (1 + 2*ix) * ny - (1 + 2*iy) * nx
            const x = start[0] + ix * tx
            const y = start[1] + iy * ty
            if(map.weight[map.tileIndex(x, y)] == 0) return false

            if(direction === 0){
                if(
                    map.weight[map.tileIndex(x + tx, y)] == 0 &&
                    map.weight[map.tileIndex(x, y + ty)] == 0
                ) return false
                ix++
                iy++
            }else if(direction < 0) ix++
            else iy++
        }
        return true
    }
    constructor(private readonly context: Application, private readonly lookahead: number = 6){}
    private readonly size: number = this.lookahead * 2 + 1
    private readonly influence: Uint16Array = new Uint16Array(this.size * this.size).fill(0xFFFF)
    private readonly map: Pathfinder = this.context.get(TerrainSystem).pathfinder
    private readonly optimal: AIStrategyPlan = {
        priority: 0, delay: 0, skill: -1, origin: vec2()
    }

    public diagonal: boolean = false
    public fuzzy: number = 0
    unit: AIUnit
    skill: number = 0
    aware: boolean = false

    public precalculate(): void {
        if(!this.aware) return
        const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
        const target = this.context.get(PlayerSystem).cube
        const { range, cardinal } = this.unit.skills[this.skill]
        const size = Math.ceil(range), range2 = range * range
        for(let x = -size; x <= size; x++)
        for(let y = -size; y <= size; y++){
            if(x*x + y*y > range2) continue
            else if(cardinal && x != 0 && y != 0) continue
            vec2.set(target.tile[0] + x, target.tile[1] + y, tile)
            const weight = map.weight[map.tileIndex(tile[0], tile[1])]
            if(weight === 0) continue
            map.add(tile)
            const index = this.tileIndex(tile[0], tile[1])
            if(index != -1) this.influence[index] = 0
        }
        const path = map.linkPath(map.search(this.unit.tile, this.unit.size, this.diagonal))
        map.clear()
        for(let i = 0; i < path.length; i++){
            map.indexTile(path[i], tile)
            const index = this.tileIndex(tile[0], tile[1])
            if(index != -1) this.influence[index] = i
        }

        map.add(this.unit.tile)
        map.walk(this.walkPropagate, this, this.unit.size, this.diagonal, undefined, true)

        for(let c = 0; c < this.size; c++)
        for(let r = 0; r < this.size; r++){
            tile[0] = c + this.unit.tile[0] - this.lookahead
            tile[1] = r + this.unit.tile[1] - this.lookahead
            const internalIndex = c + r * this.size
            const externalIndex = map.tileIndex(tile[0], tile[1])

            this.influence[internalIndex] = !map.flags[externalIndex] ? 0 : this.evaluate(
                tile, map.distance[externalIndex], this.influence[internalIndex]
            ) | 0
            map.influence[externalIndex] += this.influence[internalIndex]
        }
        map.clear()
    }
    plan(limit?: number): AIStrategyPlan {
        if(!this.aware) return this.optimal
        this.optimal.delay = 0
        this.optimal.priority = Number.MIN_SAFE_INTEGER
        vec2.copy(this.unit.tile, this.optimal.origin)
        this.map.add(this.unit.tile)
        this.unit.markTiles(false)
        this.map.walk(this.walkFind, this, this.unit.size, this.diagonal, 1, false)
        move: {
            this.optimal.path = null
            if(this.optimal.priority === Number.MIN_SAFE_INTEGER || this.optimal.priority < limit) break move
            const path = this.map.linkPath(this.map.tileIndex(this.optimal.origin[0], this.optimal.origin[1]))
            .slice(0, 1 + Math.floor(this.unit.movement.amount))
            if(path.length < 2) break move
            this.optimal.path = path.map(index => this.map.indexTile(index, vec2()))
        }
        this.map.clear()
        action: {
            this.optimal.skill = -1
            if(this.unit.skills[this.skill].cost > this.unit.action.amount) break action
            const target = this.context.get(PlayerSystem).cube
            this.optimal.target = this.unit.skills[this.skill].aim(this.optimal.origin, target.tiles, 1)
            if(this.optimal.reverse = !this.optimal.target)
                this.optimal.target = this.unit.skills[this.skill].aim(this.unit.tile, target.tiles, 1)
            if(this.optimal.target) this.optimal.skill = this.skill
            else this.optimal.priority *= 0.5
        }
        this.unit.markTiles(true)
        return this.optimal
    }
    private walkPropagate(index: number, tile: vec2, distance: number, parent: number, first: boolean): boolean {
        if(distance > this.lookahead) return false
        const nextIndex = this.tileIndex(tile[0], tile[1])

        if(parent !== -1){
            const parentTile = this.map.indexTile(parent, AIStrategy.tile)
            const parentIndex = this.tileIndex(parentTile[0], parentTile[1])
    
            this.influence[nextIndex] = Math.min(this.influence[nextIndex], this.influence[parentIndex] + 1)
            this.influence[parentIndex] = Math.min(this.influence[parentIndex], this.influence[nextIndex] + 1)
        }
        if(first) this.map.estimate[index] = this.influence[nextIndex]

        return true
    }
    private walkFind(index: number, tile: vec2, distance: number, parent: number, first: boolean): boolean {
        if(distance > this.unit.movement.amount || !first) return false
        const internal = this.influence[this.tileIndex(tile[0], tile[1])]
        const external = this.map.influence[index] - internal
        const priority = randomFloat(1-this.fuzzy,1+this.fuzzy, AIStrategy.random()) * internal / (1 + external / internal)

        if(priority > this.optimal.priority){
            vec2.copy(tile, this.optimal.origin)
            this.optimal.priority = priority
        }

        return true
    }
    protected evaluate(tile: vec2, originDistance: number, targetDistance: number): number {
        const target = this.context.get(PlayerSystem).cube
        const { range, cardinal, damage } = this.unit.skills[this.skill]
        let total = 0xFF / (1 + targetDistance)
        offense: {
            if(!this.unit.skills[this.skill].aim(tile, target.tiles)) break offense
            total = 2 * 0xFF
        }
        defense: {
            if(cardinal || range < 2) break defense
            const abs = Math.min(Math.abs(tile[0] - target.tile[0]), Math.abs(tile[1] - target.tile[1]))
            total *= Math.min(1,0.8+0.1*abs)
        }
        movement: {
            const turns = Math.ceil(Math.max(0, originDistance - this.unit.movement.amount) / this.unit.movement.gain)
            total *= Math.pow(0.5, turns)
        }
        return total
    }
    private tileIndex(column: number, row: number): number {
        column -= this.unit.tile[0] - this.lookahead
        row -= this.unit.tile[1] - this.lookahead
        if(column < 0 || row < 0 || column >= this.size || row >= this.size) return -1
        return column + row * this.size
    }
    public clear(): void {
        const offsetX = this.unit.tile[0] - this.lookahead
        const offsetY = this.unit.tile[1] - this.lookahead
        for(let c = 0; c < this.size; c++)
        for(let r = 0; r < this.size; r++){
            const internalIndex = c + r * this.size
            const externalIndex = this.map.tileIndex(c + offsetX, r + offsetY)
            this.map.influence[externalIndex] -= this.influence[internalIndex]
            this.influence[internalIndex] = 0xFFFF
        }
    }
}