import { Application } from '../../engine/framework'
import { random, lerp, vec2 } from '../../engine/math'
import { TerrainSystem, Pathfinder } from '../terrain'
import { PlayerSystem } from '../player'
import { AIUnit } from './AIUnit'

export interface AIStrategyPlan {
    priority: number
    path?: vec2[]
    target?: vec2
    skill: number
    reverse?: boolean
}

export class AIStrategy {
    public static readonly skipTurn: AIStrategyPlan = { priority: Number.MIN_SAFE_INTEGER, skill: -1 }
    private static readonly tile: vec2 = vec2()
    constructor(private readonly context: Application){}
    readonly lookahead: number = 2
    public diagonal: boolean = false
    public fuzzy: number = 0
    static lineOfSight(map: Pathfinder, start: vec2, end: vec2): boolean {
        const tx = start[0] <= end[0] ? 1 : -1, ty = start[1] <= end[1] ? 1 : -1
        const nx = Math.abs(end[0] - start[0]), ny = Math.abs(end[1] - start[1])
        let x = start[0], y = start[1]
        for(let ix = 0, iy = 0; ix < nx || iy < ny;){
            let direction = (1 + 2*ix) * ny - (1 + 2*iy) * nx
            if(direction === 0){
                if(
                    map.weight[map.tileIndex(x + tx, y)] == 0 &&
                    map.weight[map.tileIndex(x, y + ty)] == 0
                ) return false
                x += tx
                y += ty
                ix++
                iy++
            }else if(direction < 0){
                x += tx
                ix++
            }else{
                y += ty
                iy++
            }
            if(map.weight[map.tileIndex(x, y)] == 0) return false
        }
        return true
    }
    private tension: Uint32Array
    private size: number
    unit: AIUnit
    skill: number = 0
    clear(){
        const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
        for(let i = 0; i < this.tension.length; i++)
            map.influence[i] -= this.tension[i]
    }
    precalculate(unit: AIUnit){
        const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
        resize: {
            // const movementRange = Math.max(1, unit.gainMovementPoints)
            // const size = 2 * (movementRange * this.lookahead) + 1
            this.size = map.size
            this.tension = new Uint32Array(this.size * this.size)
        }

        let max = 0
        map.propagate(unit.tile, (localTile: vec2, distance: number) => {
            vec2.subtract(localTile, map.offset, tile)
            const index = localTile[0] + localTile[1] * map.size
            const score = this.evaluate(unit, 0, tile, distance) | 0
            this.tension[index] = score
            map.influence[index] += score
            max = Math.max(max, score)
            
            return score > 0 && distance < unit.movementPoints// * this.lookahead
        }, this.diagonal)
        if(max > 1) return
        const path = this.routing(unit, 0).reverse()
        for(let i = 0; i < path.length; i++){
            const tile = path[i]
            const index = map.tileIndex(tile[0], tile[1])
            const score = i
            //(path.length - i) + this.evaluate(unit, 0, tile, i) | 0
            console.log(`${i} ${tile} ${score}`)

            map.influence[index] -= this.tension[index]
            this.tension[index] = score
            map.influence[index] += score
        }
    }
    routing(unit: AIUnit, skillIndex: number): vec2[] {
        const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
        const target = this.context.get(PlayerSystem).cube
        const { radius, cardinal } = unit.skills[skillIndex]
        const size = Math.ceil(radius), radius2 = radius * radius
        for(let x = -size; x <= size; x++)
        for(let y = -size; y <= size; y++){
            if(x*x + y*y > radius2) continue
            else if(cardinal && x != 0 && y != 0) continue
            vec2.set(target.tile[0] + x, target.tile[1] + y, tile)
            const weight = map.weight[map.tileIndex(tile[0], tile[1])]
            if(weight === 0) continue
            map.add(tile, unit.tile, this.diagonal)
        }
        const path = map.search(null, unit.tile, this.diagonal)
        return path
    }
    plan(unit: AIUnit, skillIndex: number, limit?: number): AIStrategyPlan {
        const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
        let optimal: AIStrategyPlan = AIStrategy.skipTurn
        map.propagate(unit.tile, (localTile: vec2, distance: number) => {
            vec2.subtract(localTile, map.offset, tile)
            const index = localTile[0] + localTile[1] * map.size

            const internal = this.tension[index]
            const external = map.influence[index] - internal
            const priority = internal / (1 + external / internal)

            if(priority > optimal.priority){
                console.log(`${tile} D${distance} (${internal} vs ${external}) = ${priority}`)
                optimal = { skill: -1, priority, target: [tile[0], tile[1]] }
            }
            return distance < unit.movementPoints
        }, this.diagonal, 1)

        if(optimal === AIStrategy.skipTurn) return optimal
        move: {
            optimal.path = map.search(unit.tile, optimal.target, this.diagonal, 1)
            optimal.path = optimal.path.slice(0, 1 + Math.floor(unit.movementPoints))
            if(optimal.path.length < 2) optimal.path = null
        }
        action: {
            const target = this.context.get(PlayerSystem).cube
            const { radius, cardinal } = unit.skills[skillIndex]
            const size = Math.ceil(radius), radius2 = radius * radius

            const lastTile = optimal.path ? optimal.path[optimal.path.length - 1] : unit.tile
            if(cardinal && lastTile[0] != target.tile[0] && lastTile[1] != target.tile[1]) break action
            if(vec2.distanceSquared(lastTile, target.tile) > radius2) break action
            if(unit.skills[skillIndex].cost > unit.actionPoints) break action

            optimal.skill = skillIndex
            optimal.target = target.tile
        }

        return optimal
    }







    // private moves = []
    // propagate(unit: AIUnit, weight: number){
    //     const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
    //     map.propagate(unit.tile, (localTile: vec2, distance: number) => {
    //         vec2.subtract(localTile, map.offset, tile)
    //         const index = localTile[0] + localTile[1] * map.size
    //         const score = this.evaluate(unit, 0, tile, distance)
    //         map.influence[index] += weight * score
    //         this.moves.push(index, score)
            
    //         return score > 0 && distance < unit.movementPoints * this.lookahead
    //     }, this.diagonal)
    // }
    evaluate(unit: AIUnit, skillIndex: number, tile: vec2, distance: number): number {
        const target = this.context.get(PlayerSystem).cube
        const { radius, cardinal, damage } = unit.skills[skillIndex]
        let total = 1
        defence: {
            if(cardinal || radius <= 2) break defence
            const abs = Math.min(Math.abs(tile[0] - target.tile[0]), Math.abs(tile[1] - target.tile[1]))
            total *= Math.min(1,0.5+0.25*abs)
        }
        offense: {
            if(cardinal && tile[0] != target.tile[0] && tile[1] != target.tile[1]) break offense
            if(vec2.distanceSquared(tile, target.tile) > radius * radius) break offense

            total *= 10// + 2 * damage
        }
        movement: {
            const turns = Math.ceil(Math.max(0, distance - unit.movementPoints) / unit.gainMovementPoints)
            total *= Math.max(0, 1 - turns / this.lookahead)
        }
        return total
    }
    
    // plan(unit: AIUnit, skillIndex: number, limit?: number): AIStrategyPlan {
    //     const map: Pathfinder = this.context.get(TerrainSystem).pathfinder, tile = AIStrategy.tile
    //     const target = this.context.get(PlayerSystem).cube
    //     //const heuristic = this.diagonal ? Pathfinder.heuristic.diagonal : Pathfinder.heuristic.manhattan

    //     let optimal: AIStrategyPlan = AIStrategy.skipTurn
    //     const path = this.routing(unit, skillIndex)
    //     map.propagate(unit.tile, (localTile: vec2, distance: number) => {
    //         vec2.subtract(localTile, map.offset, tile)
    //         const priority = this.evaluate(unit, skillIndex, tile, 0) / (1 + map.influence[localTile[0] + localTile[1] * map.size])

    //         return distance < unit.movementPoints
    //     }, this.diagonal, 1)

    //     // const { radius, cardinal } = unit.skills[skillIndex]
    //     // const size = Math.ceil(radius), radius2 = radius * radius
    //     // for(let x = -size; x <= size; x++)
    //     // for(let y = -size; y <= size; y++){
    //     //     if(x*x + y*y > radius2) continue
    //     //     else if(cardinal && x != 0 && y != 0) continue
    //     //     vec2.set(target.tile[0] + x, target.tile[1] + y, tile)
    //     //     const weight = map.weight[map.tileIndex(tile[0], tile[1])]
    //     //     if(weight === 0) continue
    //     //     map.add(tile, unit.tile, this.diagonal)

    //     //     //const influence = 0.1 * map.influence[map.tileIndex(tile[0], tile[1])]
    //     //     //const fuzzy = 1 + this.fuzzy * (random()*2-1)
    //     //     //const priority = fuzzy * this.evaluate(unit, skillIndex, tile, 0) / (1 + heuristic(unit.tile, tile) + influence)
    //     //     //console.log(`RUN ${this.evaluate(unit, skillIndex, tile, 0)} D ${heuristic(unit.tile, tile)} inf ${influence}`)
    //     //     //if(optimal.priority >= priority) continue
    //     //     //console.log('new optimal?')
    //     //     //optimal = { priority, target: [tile[0], tile[1]], skill: -1 }
    //     // }
    //     // const path = map.search(tile, unit.tile, this.diagonal)




    //     // if(optimal === AIStrategy.skipTurn) return optimal
    //     // move: {
    //     //     optimal.path = map.search(unit.tile, optimal.target, this.diagonal)
    //     //     optimal.path = optimal.path.slice(0, 1 + Math.floor(unit.movementPoints))
    //     //     for(let i = 1; i < optimal.path.length; i++){
    //     //         const waypoint = optimal.path[i]
    //     //         if(map.weight[map.tileIndex(waypoint[0], waypoint[1])] == 1) continue
    //     //         optimal.path.length = i
    //     //         break
    //     //     }
    //     //     if(optimal.path.length < 2) optimal.path = null
    //     // }
    //     // action: {
    //     //     const lastTile = optimal.path ? optimal.path[optimal.path.length - 1] : unit.tile
    //     //     if(cardinal && lastTile[0] != target.tile[0] && lastTile[1] != target.tile[1]) break action
    //     //     if(vec2.distanceSquared(lastTile, target.tile) > radius2) break action
    //     //     if(unit.skills[skillIndex].cost > unit.actionPoints) break action

    //     //     optimal.skill = skillIndex
    //     //     optimal.target = target.tile
    //     // }
    //     return optimal
    // }
}