import { Application, One } from '../framework'
import { vec3, vec4, quat, mat4, vec2, ease, clamp } from '../math'
import { ICamera, BoundingVolume, IAnimationTrigger, Transform } from '../scene'
import { IBatched, uintNorm4x8 } from '../pipeline/batch'
import { SpriteMaterial } from '../materials'

export class Line implements IBatched {
    private static readonly forward: vec3 = vec3()
    private static readonly normal: vec3 = vec3()
    private static readonly tangent: vec3 = vec3()
    public order: number = 0
    public frame: number = 0
    public vertices: Float32Array = new Float32Array(0)
    public uvs: Float32Array = new Float32Array(0)
    public indices: Uint16Array = new Uint16Array(0)
    public colors: Uint32Array
    public readonly color: vec4 = vec4(1,1,1,1)
    public readonly normal: vec3 = vec3(0,1,0)
    public material: SpriteMaterial
    public readonly bounds = new BoundingVolume
    public path: vec3[]
    public ease: ease.IEase = One
    public width: number = 1
    public height: number = 0
    public update(context: Application, camera: ICamera){
        if(this.frame > 0 && this.frame >= camera.frame) return
        this.frame = context.frame

        const length = this.path.length
        if(!this.vertices || this.vertices.length != length * 6) this.resize(length)

        const { forward, normal, tangent } = Line
        vec3.copy(vec3.ZERO, tangent)
        vec3.set(-camera.viewMatrix[2], -camera.viewMatrix[6], -camera.viewMatrix[10], forward)
        let lengthSquared = 0
        for(let i = 0; i < length; i++){
            const prev = this.path[i]
            const next = this.path[i + 1] || prev

            vec3.subtract(next, prev, normal)
            vec3.normalize(normal, normal)
            vec3.add(tangent, normal, tangent)
            vec3.cross(forward, tangent, tangent)
            vec3.normalize(tangent, tangent)
            vec3.scale(tangent, this.ease(i / (length - 1)) * 0.5 * this.width, tangent)

            this.vertices[i*6+0] = prev[0] - tangent[0]
            this.vertices[i*6+1] = prev[1] - tangent[1]
            this.vertices[i*6+2] = prev[2] - tangent[2]
            this.vertices[i*6+3] = prev[0] + tangent[0]
            this.vertices[i*6+4] = prev[1] + tangent[1]
            this.vertices[i*6+5] = prev[2] + tangent[2]

            vec3.copy(normal, tangent)
            lengthSquared += vec3.distanceSquared(prev, next)
        }
        this.height = Math.sqrt(lengthSquared) / this.width
        this.bounds.fromVertices(this.vertices, 3, 0, context.frame)
    }
    private resize(length: number){
        this.vertices = new Float32Array(length * 2 * 3)
        this.uvs = new Float32Array(length * 2 * 2)
        this.indices = new Uint16Array((length-1) * 6)
        for(let i = length - 2; i >= 0; i--){
            this.indices[i*6+0]=i*2+0
            this.indices[i*6+1]=i*2+1
            this.indices[i*6+2]=i*2+2
            this.indices[i*6+3]=i*2+2
            this.indices[i*6+4]=i*2+1
            this.indices[i*6+5]=i*2+3
        }
        for(let i = length - 1; i >= 0; i--){
            this.uvs[i*4+1] = this.uvs[i*4+3] = 1 - i / (length - 1)
            this.uvs[i*4+0] = 0
            this.uvs[i*4+2] = 1
        }
    }
    public addColorFade(fade: ease.IEase){
        if(!this.colors || this.colors.length != this.path.length * 2)
            this.colors = new Uint32Array(this.path.length * 2)
        for(let i = 0; i < this.colors.length; i++){
            let f = Math.floor(i / 2) / (this.path.length - 1)
            const strength = fade(f)
            this.colors[i] = uintNorm4x8(strength,strength,strength,strength)
        }
    }
}

export const FollowTrail = (target: vec3, range: vec2, stiffness: number = 1): IAnimationTrigger<Line> =>
function(elapsedTime: number, deltaTime: number, line: Line){
    vec3.copy(target, line.path[0])
    for(let i = 1; i < line.path.length; i++){
        const prev = line.path[i-1]
        const next = line.path[i]
        const dx = next[0] - prev[0]
        const dy = next[1] - prev[1]
        const dz = next[2] - prev[2]
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)
        if(!distance) continue
        const offset = Math.max(0, distance - range[1]) + Math.min(0, distance - range[0])
        const factor = Math.min(1, deltaTime * 60) * stiffness * offset / distance
        next[0] -= dx * factor
        next[1] -= dy * factor
        next[2] -= dz * factor
    }
    line.frame = 0
}

export function FollowPath(options: {
    path: vec3[]
    frames: number[]
    length?: number
    tension?: number
    ease: ease.IEase
}, line: boolean): IAnimationTrigger<Line | Transform> {
    const { path, frames, length } = options
    const start = frames[0], duration = frames[frames.length - 1] - start
    const positions = frames.map(frame => (frame - start) / duration)
    const curveX = ease.Spline(path.map(value => value[0]), positions, 3, options.tension)
    const curveY = ease.Spline(path.map(value => value[1]), positions, 3, options.tension)
    const curveZ = ease.Spline(path.map(value => value[2]), positions, 3, options.tension)
    if(line) return function(elapsedTime: number, deltaTime: number, line: Line){
        for(let i = line.path.length - 1; i >= 0; i--){
            const time = options.ease(clamp((elapsedTime - start - i * length) / duration, 0, 1))
            vec3.set(curveX(time), curveY(time), curveZ(time), line.path[i])
        }
        line.frame = 0
    }
    const position = vec3(), normal = vec3()
    return function(elapsedTime: number, deltaTime: number, transform: Transform){
        const time = options.ease(clamp((elapsedTime - start) / duration, 0, 1))
        vec3.set(curveX(time), curveY(time), curveZ(time), position)
        vec3.subtract(position, transform.position, normal)
        vec3.normalize(normal, normal)
        quat.fromNormal(normal, vec3.AXIS_Y, transform.rotation)
        quat.normalize(transform.rotation, transform.rotation)
        vec3.copy(position, transform.position)
        transform.frame = 0
    }
}