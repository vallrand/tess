import { vec2, vec3, quat, mat3x2, mat4 } from './math'
import { Application, System, Factory } from './framework'

export class Transform2D {
    public index: number = -1
    public frame: number = 0
    public readonly position: vec2 = vec2(0,0)
    public readonly scale: vec2 = vec2(1,1)
    public rotation: number = 0
    public readonly matrix: mat3x2 = mat3x2()
    public parent?: Transform2D
    public recalculate(frame: number): void {
        mat3x2.fromTransform(
            this.position[0], this.position[1], 0, 0,
            this.scale[0], this.scale[1], this.rotation, 0, 0, this.matrix
        )
        if(this.parent) mat3x2.multiply(this.parent.matrix, this.matrix, this.matrix)
        this.frame = frame
    }
}

export class Transform {
    public index: number = -1
    public frame: number = 0
    public readonly position: vec3 = vec3(0,0,0)
    public readonly scale: vec3 = vec3(1,1,1)
    public readonly rotation: quat = quat()
    public readonly matrix: mat4 = mat4()
    public parent?: Transform
    public recalculate(frame: number): void {
        mat4.fromRotationTranslationScale(this.rotation, this.position, this.scale, this.matrix)
        if(this.parent) mat4.multiply(this.parent.matrix, this.matrix, this.matrix)
        this.frame = frame
    }
}

export class TransformSystem extends Factory<Transform> implements System {
    constructor(private readonly context: Application){super(Transform)}
    public delete(transform: Transform): void {
        super.delete(transform)
        transform.frame = 0
        //TODO detach connected nodes? defer delete untill update loop?
    }
    public update(): void {
        for(let index = this.list.length - 1; index >= 0; index--){
            const transform = this.list[index]
            if(transform.frame && (!transform.parent || transform.frame >= transform.parent.frame)) continue
            if(transform.parent && transform.parent.index == -1) transform.parent = null
            if(transform.parent && transform.parent.index < index){
                this.list[transform.parent.index] = transform
                this.list[index] = transform.parent
                transform.index = transform.parent.index
                transform.parent.index = index++
                continue
            }
            transform.recalculate(this.context.frame)
        }
    }
}