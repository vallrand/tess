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

    protected *moveAlongPath(path: vec2[], transform: Transform): Generator<ActionSignal> {
        const shadow = this.context.get(DecalPass).create(4)
        shadow.transform = this.context.get(TransformSystem).create()
        shadow.transform.parent = transform
        vec3.set(6,6,6, shadow.transform.scale)
        vec4.set(0.2+0.2,0+0.6,0.4+0.6,0*0.8, shadow.color)
        shadow.material = new DecalMaterial()
        shadow.material.program = this.context.get(DecalPass).program
        shadow.material.diffuse = SharedSystem.textures.glow

        const terrain = this.context.get(TerrainSystem)
        const floatHeight = 1, floatDuration = 0.4, direction = vec3(), previousRotation = quat.copy(transform.rotation, quat())
        const entry = vec3(), exit = vec3(), center = vec3()
        for(let last = path.length - 1, i = 0; i <= last; i++){
            const tile = path[i]
            terrain.tilePosition(tile[0], tile[1], center)
            vec2.copy(tile, this.tile)

            if(i == 0) vec3.copy(center, entry)
            else terrain.tilePosition(path[i - 1][0], path[i - 1][1], entry)
            if(i == last) vec3.copy(center, exit)
            else terrain.tilePosition(path[i + 1][0], path[i + 1][1], exit)

            vec3.centroid(entry, center, entry)
            vec3.centroid(exit, center, exit)
            if(i == 0 || i == last) vec3.centroid(entry, exit, center)

            const mode = i == 0 ? 0 : i == last ? 2 : 1
            const movementEase = mode == 0 ? ease.quadIn : mode == 2 ? ease.quadOut : ease.linear

            for(const duration = mode != 1 ? 2*floatDuration : floatDuration, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                const fraction = Math.min(1, elapsedTime / duration)
                quadraticBezier3D(entry, center, exit, movementEase(fraction), transform.position)
                quadraticBezierNormal3D(entry, center, exit, movementEase(fraction), direction)
                quat.fromNormal(vec3.normalize(direction, direction), vec3.AXIS_Y, transform.rotation)

                if(mode == 0) quat.slerp(previousRotation, transform.rotation, ease.quadOut(fraction), transform.rotation)

                if(mode == 0) transform.position[1] += floatHeight * ease.quartOut(fraction)
                else if(mode == 2) transform.position[1] += floatHeight * (1-ease.quartIn(fraction))
                else transform.position[1] += floatHeight

                transform.frame = 0

                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
        }

        this.context.get(TransformSystem).delete(shadow.transform)
        this.context.get(DecalPass).delete(shadow)
    }
}