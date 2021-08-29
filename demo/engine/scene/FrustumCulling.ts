import { vec3, mat4 } from '../math'
import { PerspectiveCamera } from './Camera'
import { Transform } from './Transform'

export function calculateBoundingRadius(vertices: Float32Array, stride: number, offset: number, center: vec3 = vec3.ZERO): number {
    let squareRadius = 0
    for(let i = 0; i < vertices.length; i+=stride){
        const x = vertices[i + offset + 0] - center[0]
        const y = vertices[i + offset + 1] - center[1]
        const z = vertices[i + offset + 2] - center[2]
        squareRadius = Math.max(squareRadius, x*x+y*y+z*z)
    }
    return Math.sqrt(squareRadius)
}

export class BoundingVolume {
    public frame: number = -1
    public readonly position: vec3 = vec3(0,0,0)
    public readonly scale: vec3 = vec3(1,1,1)
    public radius: number = 0
    public update(transform: Transform, radius: number): void {
        this.scale[0] = Math.hypot(transform.matrix[0],transform.matrix[1],transform.matrix[2])
        this.scale[1] = Math.hypot(transform.matrix[4],transform.matrix[5],transform.matrix[6])
        this.scale[2] = Math.hypot(transform.matrix[8],transform.matrix[9],transform.matrix[10])
        vec3.set(transform.matrix[12], transform.matrix[13], transform.matrix[14], this.position)
        this.radius = radius * Math.max(this.scale[0], this.scale[1], this.scale[2])
        this.frame = transform.frame
    }
    public fromVertices(vertices: Float32Array, stride: number, offset: number, frame: number){
        vec3.copy(vec3.ZERO, this.position)
        for(let i = 0; i < vertices.length; i+=stride){
            this.position[0] += vertices[i + offset + 0]
            this.position[1] += vertices[i + offset + 1]
            this.position[2] += vertices[i + offset + 2]
        }
        vec3.scale(this.position, stride / vertices.length, this.position)
        this.radius = calculateBoundingRadius(vertices, stride, offset, this.position)
        this.frame = frame
    }
}

export class FrustumCulling {
    private static temp: vec3 = vec3(0,0,0)
    private tangent: number
    private sphereFactorX: number
    private sphereFactorY: number
    private readonly AXIS_X: vec3 = vec3(1,0,0)
    private readonly AXIS_Y: vec3 = vec3(0,1,0)
    private readonly AXIS_Z: vec3 = vec3(0,0,1)
    private readonly position: vec3 = vec3(0,0,0)
    constructor(private readonly camera: PerspectiveCamera){}
    update(camera: PerspectiveCamera){
        this.tangent = Math.tan(this.camera.fieldOfView / 2)
        this.sphereFactorY = 1 / Math.cos(this.camera.fieldOfView / 2)
        this.sphereFactorX = 1 / Math.cos(Math.atan(this.tangent * this.camera.aspectRatio))

        const modelMatrix = this.camera.transform?.matrix || mat4.IDENTITY
        vec3.set(modelMatrix[0], modelMatrix[1], modelMatrix[2], this.AXIS_X)
        vec3.set(modelMatrix[4], modelMatrix[5], modelMatrix[6], this.AXIS_Y)
        vec3.set(-modelMatrix[8], -modelMatrix[9], -modelMatrix[10], this.AXIS_Z)
        vec3.set(modelMatrix[12], modelMatrix[13], modelMatrix[14], this.position)
    }
    public cull(bounds: BoundingVolume): boolean { return this.cullSphere(bounds.position, bounds.radius) }
    private cullSphere(center: vec3, radius: number): boolean {
        const direction = vec3.subtract(center, this.position, FrustumCulling.temp)
        const dz = vec3.dot(direction, this.AXIS_Z)
        if(dz > this.camera.zFar + radius || dz < this.camera.zNear - radius) return false
        const dy = vec3.dot(direction, this.AXIS_Y)
        const edgeY = dz * this.tangent + radius * this.sphereFactorY
        if(dy > edgeY || dy < -edgeY) return false
        const dx = vec3.dot(direction, this.AXIS_X)
        const edgeX = dz * this.tangent * this.camera.aspectRatio + radius * this.sphereFactorX
        if(dx > edgeX || dx < -edgeX) return false
        return true
    }
}