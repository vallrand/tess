import { Application } from '../../engine/framework'
import { random, vec2 } from '../../engine/math'
import { TerrainSystem, Pathfinder } from '../terrain'
import { PlayerSystem } from '../player'
import { AIUnit, AIStrategyPlan } from './AIUnit'

function lineOfSight(map: Pathfinder, start: vec2, end: vec2): boolean {
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

export function CloseCombatStrategy(context: Application, unit: AIUnit, skillIndex: number, diagonals?: boolean): AIStrategyPlan {
    const map = context.get(TerrainSystem).pathfinder
    const target = context.get(PlayerSystem).cube
    const fuzzy = 0
    const heuristic = diagonals ? Pathfinder.heuristic.diagonal : Pathfinder.heuristic.manhattan

    const candidates: AIStrategyPlan[] = []
    const { radius, cardinal } = unit.skills[skillIndex]
    const size = Math.ceil(radius), radius2 = radius * radius
    for(let x = -size; x <= size; x++)
    for(let y = -size; y <= size; y++){
        if(x*x + y*y > radius2) continue
        else if(cardinal && x != 0 && y != 0) continue
        const column = target.tile[0] + x, row = target.tile[1] + y
        const weight = map.weight[map.tileIndex(column, row)]
        if(weight === 0) continue

        const plan: AIStrategyPlan = {
            priority: 0, estimate: 0,
            target: [column, row], skill: -1
        }
        const distance = heuristic(unit.tile, plan.target)
        if(distance) plan.estimate = distance + (weight-1) * 100 + fuzzy * (random()*2-1)
        candidates.push(plan)
    }
    candidates.sort((a, b) => a.estimate - b.estimate)
    let optimal: AIStrategyPlan = CloseCombatStrategy.skipTurn
    for(let i = 0; i < candidates.length; i++){
        const plan = candidates[i]
        if(plan.estimate > optimal.priority) break
        plan.path = map.search(unit.tile, plan.target, diagonals)
        plan.priority = plan.path.length
        if(optimal.priority <= plan.priority) continue
        optimal = plan
    }

    const allowedMovement = unit.movementPoints | 0
    const allowedAction = unit.actionPoints | 0
    move:{
        if(!optimal.path) break move
        optimal.path = optimal.path.slice(0, 1 + allowedMovement)
        for(let i = 1; i < optimal.path.length; i++){
            const waypoint = optimal.path[i]
            if(map.weight[map.tileIndex(waypoint[0], waypoint[1])] == 1) continue
            optimal.path.length = i
            break
        }
        if(optimal.path.length < 2) optimal.path = null
    }
    action:{
        const lastTile = optimal.path ? optimal.path[optimal.path.length - 1] : unit.tile
        if(cardinal && lastTile[0] != target.tile[0] && lastTile[1] != target.tile[1]) break action
        if(vec2.distanceSquared(lastTile, target.tile) > radius2) break action
        if(unit.skills[skillIndex].cost > allowedAction) break action

        optimal.skill = skillIndex
        optimal.target = target.tile
    }
    return optimal
}

CloseCombatStrategy.skipTurn = <AIStrategyPlan> { priority: Number.MAX_VALUE, estimate: 0, skill: -1 }