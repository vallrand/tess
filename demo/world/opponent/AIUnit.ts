import { Application } from '../../engine/framework'
import { clamp, vec2, vec3, quat, quadraticBezier3D, quadraticBezierNormal3D } from '../../engine/math'
import { AnimationSystem, ActionSignal, ease } from '../../engine/animation'
import { Mesh } from '../../engine/components'
import { TerrainSystem, IUnitTile } from '../terrain'
import { AIUnitSkill } from './AIUnitSkill'
import { AIStrategy, AIStrategyPlan } from './AIStrategy'

export abstract class AIUnit implements IUnitTile {
    public readonly tile: vec2 = vec2()
    public readonly size: vec2 = vec2.ONE
    public mesh: Mesh
    public abstract readonly skills: AIUnitSkill[]
    public abstract readonly strategy: AIStrategy
    constructor(protected readonly context: Application){}

    public actionIndex: number
    public weight: number = 8

    abstract movementDuration: number
    protected movementFloat: number = 0
    public movementPoints: number = 0
    public actionPoints: number = 0
    public healthPoints: number = 0
    public maxHealthPoints: number = 10
    public readonly gainMovementPoints: number = 1
    public readonly gainActionPoints: number = 1

    public execute(plan: AIStrategyPlan): Generator<ActionSignal> {
        const map = this.context.get(TerrainSystem).pathfinder
        const actions: Generator<ActionSignal>[] = []
        if(plan.path){
            this.movementPoints -= plan.path.length - 1
            const frames = []
            let time = this.context.currentTime
            for(let i = 0; i < plan.path.length - 1; i++){
                const prev = plan.path[i], next = plan.path[i + 1]
                const availableTime = map.marked[map.tileIndex(next[0], next[1])]
                time = Math.max(time, availableTime)
                frames.push(time - this.context.currentTime)
                time += i ? this.movementDuration : (2 * this.movementDuration)
                map.marked[map.tileIndex(prev[0], prev[1])] = time
            }
            frames.push(time - this.context.currentTime)
            frames.push(frames[frames.length - 1] + 2 * this.movementDuration)

            actions.push(this.move(plan.path, frames))
            this.markTiles(false)
            vec2.copy(plan.path[plan.path.length - 1], this.tile)
            this.markTiles(true)
        }
        if(plan.skill != -1){
            this.actionPoints -= this.skills[plan.skill].cost
            const action = this.skills[plan.skill].use(this, plan.target)
            if(plan.reverse) actions.unshift(action)
            else actions.push(action)
        }
        return AnimationSystem.join(actions)
    }

    public abstract delete(): void
    public abstract place(column: number, row: number): void
    public abstract damage(amount: number): void

    public abstract move(path: vec2[], frames: number[], target?: vec2): Generator<ActionSignal>

    protected *moveAlongPath(path: vec2[], frames: number[], rotate: boolean): Generator<ActionSignal> {
        const transform = this.mesh.transform
        const direction = vec3(), previousRotation = quat.copy(transform.rotation, quat())
        const entry = vec3(), exit = vec3(), center = vec3()
        const startTime = this.context.currentTime, totalDuration = frames[frames.length - 1]
        for(let last = path.length - 1, i = 0; i <= last; i++){
            const tile = path[i]
            this.snapPosition(tile, center)

            if(i == 0) vec3.copy(center, entry)
            else this.snapPosition(path[i - 1], entry)
            if(i == last) vec3.copy(center, exit)
            else this.snapPosition(path[i + 1], exit)
    
            vec3.centroid(entry, center, entry)
            vec3.centroid(exit, center, exit)
            if(i == 0 || i == last) vec3.centroid(entry, exit, center)
    
            const mode = i == 0 ? 0 : i == last ? 2 : 1
            const movementEase = mode == 0 ? ease.quadIn : mode == 2 ? ease.quadOut : ease.linear
    
            for(const delay = frames[i], duration = frames[i + 1] - delay; true;){
                const elapsedTime = Math.max(0, this.context.currentTime - startTime - delay)
                const fraction = Math.min(1, elapsedTime / duration)
                quadraticBezier3D(entry, center, exit, movementEase(fraction), transform.position)
    
                if(rotate) if(mode == 0){
                    vec3.subtract(exit, entry, direction)
                    quat.fromNormal(vec3.normalize(direction, direction), vec3.AXIS_Y, transform.rotation)
                    quat.slerp(previousRotation, transform.rotation, ease.quadOut(fraction), transform.rotation)
                }else{
                    quadraticBezierNormal3D(entry, center, exit, movementEase(fraction), direction)
                    quat.fromNormal(vec3.normalize(direction, direction), vec3.AXIS_Y, transform.rotation)
                    quat.normalize(transform.rotation, transform.rotation)
                }
    
                transform.frame = 0

                let totalElapsed = this.context.currentTime - startTime
                this.movementFloat = clamp(Math.min(totalDuration-totalElapsed,totalElapsed)/this.movementDuration,0,1)
    
                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
        }
    }
    public *rotate(target: vec2): Generator<ActionSignal> {
        const angle = Math.atan2(target[0] - this.tile[0], target[1] - this.tile[1])
        const prevRotation = this.mesh.transform.rotation
        const nextRotation = quat.axisAngle(vec3.AXIS_Y, angle, quat())
        if(quat.angle(prevRotation, nextRotation) < 1e-3) return
        for(const duration = this.movementDuration, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            const fraction = Math.min(1, elapsedTime / duration)
            quat.slerp(prevRotation, nextRotation, ease.quadInOut(fraction), this.mesh.transform.rotation)
            this.mesh.transform.frame = 0
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    }
    protected snapPosition(tile: vec2, out: vec3){
        const column = tile[0] + 0.5 * (this.size[0] - 1)
        const row = tile[1] + 0.5 * (this.size[1] - 1)
        this.context.get(TerrainSystem).tilePosition(column, row, out)
    }
    protected markTiles(toggle: boolean){
        const terrain = this.context.get(TerrainSystem)
        for(let c = 0; c < this.size[0]; c++)
        for(let r = 0; r < this.size[1]; r++)
            terrain.setTile(this.tile[0] + c, this.tile[1] + r, toggle ? this : null)
    }
}