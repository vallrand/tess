import { Application } from '../../engine/framework'
import { vec2, vec3, vec4, quat, ease, quadraticBezier3D, quadraticBezierNormal3D } from '../../engine/math'
import { DecalMaterial } from '../../engine/materials'
import { DecalPass } from '../../engine/pipeline'
import { ActionSignal, Transform, TransformSystem } from '../../engine/scene'
import { SharedSystem } from '../shared'
import { IUnit, TerrainSystem } from '../terrain'

interface MovementStrategy {
    evaluate(): Generator<{
        column: number
        row: number
        cost: number
    }>
}

export abstract class ControlUnit implements IUnit {
    public readonly tile: vec2 = vec2()
    public readonly size: vec2 = vec2.ONE
    actionIndex: number
    turn: number

    movementStrategy: any
    actionStrategy: any

    constructor(protected readonly context: Application){}
    public abstract place(column: number, row: number): void 
    public abstract kill(): void

    //public abstract appear(): Generator<ActionSignal>
    //public abstract disappear(): Generator<ActionSignal>
    //public abstract damage(): Generator<ActionSignal>
    public abstract move(path: vec2[]): Generator<ActionSignal>
    public abstract strike(target: vec3): Generator<ActionSignal>

    protected snapPosition(tile: vec2, out: vec3){
        const column = tile[0] + 0.5 * (this.size[0] - 1)
        const row = tile[1] + 0.5 * (this.size[1] - 1)
        this.context.get(TerrainSystem).tilePosition(column, row, out)
    }
    protected *moveAlongPath(
        path: vec2[], transform: Transform, floatDuration: number, rotate: boolean
    ): Generator<ActionSignal> {
        const direction = vec3(), previousRotation = quat.copy(transform.rotation, quat())
        const entry = vec3(), exit = vec3(), center = vec3()

        for(let last = path.length - 1, i = 0; i <= last; i++){
            const tile = path[i]
            this.snapPosition(tile, center)
            vec2.copy(tile, this.tile)

            if(i == 0) vec3.copy(center, entry)
            else this.snapPosition(path[i - 1], entry)
            if(i == last) vec3.copy(center, exit)
            else this.snapPosition(path[i + 1], exit)

            vec3.centroid(entry, center, entry)
            vec3.centroid(exit, center, exit)
            if(i == 0 || i == last) vec3.centroid(entry, exit, center)

            const mode = i == 0 ? 0 : i == last ? 2 : 1
            const movementEase = mode == 0 ? ease.quadIn : mode == 2 ? ease.quadOut : ease.linear

            for(const duration = mode != 1 ? 2*floatDuration : floatDuration, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
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

                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
        }
    }
}