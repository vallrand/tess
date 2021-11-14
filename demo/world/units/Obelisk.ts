import { vec2, vec3 } from '../../engine/math'
import { MeshSystem } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, ease } from '../../engine/animation'

import { ModelAnimation } from '../shared'
import { AIUnit, AIStrategy, AIStrategyPlan } from '../military'
import { TerrainSystem } from '../terrain'
import { TurnBasedSystem, DirectionTile } from '../player'
import { LaserSkill } from './skills/LaserSkill'

export class Obelisk extends AIUnit {
    static readonly pool: Obelisk[] = []
    readonly skills = [new LaserSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 6, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 1, amount: 0, gain: 0.2 }
    readonly group: number = 2
    readonly movementDuration: number = 0.6
    private expanded: boolean = false

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('obelisk')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.skills[0].deactivate(true).next()
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        Obelisk.pool.push(this)
    }
    public execute(plan: AIStrategyPlan): Generator<ActionSignal> {
        if(this.expanded && plan.path){
            this.markTiles(false)
            this.expanded = false
            plan.delay += 1
            const map = this.context.get(TerrainSystem).pathfinder
            const time = this.context.currentTime + 2 * this.movementDuration + plan.delay
            for(let i = 0; i < DirectionTile.length; i++)
                map.marked[map.tileIndex(this.tile[0] + DirectionTile[i][0], this.tile[1] + DirectionTile[i][1])] = time
        }
        const action = super.execute(plan)
        if(plan.skill != -1) this.markTiles(this.expanded = true)
        return action
    }
    public markTiles(toggle: boolean){
        const terrain = this.context.get(TerrainSystem)
        terrain.setTile(this.tile[0], this.tile[1], toggle ? this : null)
        if(!this.expanded) return
        for(let i = 0; i < DirectionTile.length; i++){
            terrain.setTile(this.tile[0] + DirectionTile[i][0], this.tile[1] + DirectionTile[i][1], toggle ? this : null)
            if(toggle) this.context.get(TurnBasedSystem).signalEnterTile.broadcast(this.tile[0] + DirectionTile[i][0], this.tile[1] + DirectionTile[i][1], this)
        }
    }
    public deactivate(): Generator<ActionSignal> { return this.skills[0].deactivate() }
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        for(const generator = this.deactivate(); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }

        const animate = AnimationTimeline(this, {
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.5,0], ease: ease.sineOut }
            ], BlendTween.vec3)
        })
        
        for(const generator = this.moveAlongPath(path, frames, false); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }
    }
}