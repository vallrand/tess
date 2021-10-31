import { vec2, vec3, quat, mat3x2, mat4, mat3 } from '../math'
import { Application, ISystem, Factory } from '../framework'

export class Transform2D {
    static readonly IDENTITY = new Transform2D()
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
    static readonly IDENTITY = new Transform()
    static readonly matrix: mat4 = mat4()
    static readonly normalMatrix: mat3 = mat3()
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
    public calculateNormalMatrix(): mat3 {
        return mat3.normalMatrix(this.matrix, Transform.normalMatrix)
    }
}

export class TransformSystem implements ISystem {
    private readonly pool: Transform[] = []
    private readonly list: Transform[] = []
    constructor(private readonly context: Application){}
    public create(position?: vec3, rotation?: quat, scale?: vec3, parent?: Transform): Transform {
        const component = this.pool.pop() || new Transform
        component.index = this.list.push(component) - 1

        component.frame = 0
        component.parent = parent || null
        vec3.copy(position || vec3.ZERO, component.position)
        vec3.copy(scale || vec3.ONE, component.scale)
        quat.copy(rotation || quat.IDENTITY, component.rotation)

        return component
    }
    public delete(component: Transform): void {
        if(component.index == -1) return
        this.list[component.index] = this.list[this.list.length - 1]
        this.list[component.index].index = component.index
        this.list.length--
        this.pool.push(component)
        component.index = -1
    }
    public update(): void {
        for(let index = this.list.length - 1; index >= 0; index--){
            const transform = this.list[index]
            if(transform.parent && transform.parent.index < index)
            if(transform.parent.index == -1) transform.parent = null
            else{
                this.list[transform.parent.index] = transform
                this.list[index] = transform.parent
                transform.index = transform.parent.index
                transform.parent.index = index++
                continue
            }
            if(transform.frame && (!transform.parent || transform.frame >= transform.parent.frame)) continue
            transform.recalculate(this.context.frame)
        }
    }
}