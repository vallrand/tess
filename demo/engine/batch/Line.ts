import { vec3, vec4, mat4 } from '../math'
import { ICamera } from '../Camera'
import { IBatched } from './GeometryBatch'
import { SpriteMaterial } from '../Sprite'

export class Line implements IBatched {
    private static readonly forward: vec3 = vec3()
    private static readonly normal: vec3 = vec3()
    private static readonly tangent: vec3 = vec3()
    public frame: number = 0
    public vertices: Float32Array = new Float32Array(0)
    public uvs: Float32Array = new Float32Array(0)
    public indices: Uint16Array = new Uint16Array(0)
    public readonly color: vec4 = vec4(1,1,1,1)
    public material: SpriteMaterial
    public path: vec3[]
    public width: number = 1
    public height: number = 0
    public recalculate(frame: number, camera: ICamera){
        if(this.frame > 0 && this.frame >= camera.frame) return
        this.frame = frame

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
            vec3.scale(tangent, 0.5 * this.width, tangent)

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
            this.uvs[i*4+0] = this.uvs[i*4+2] = 1 - i / (length - 1)
            this.uvs[i*4+1] = 0
            this.uvs[i*4+3] = 1
        }
    }
}
