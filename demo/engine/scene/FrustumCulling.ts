import { vec3, mat4 } from '../math'
import { OpaqueLayer } from '../webgl'
import { PerspectiveCamera } from './Camera'

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
    public update(matrix: mat4, radius: number, frame: number): void {
        this.scale[0] = Math.hypot(matrix[0],matrix[1],matrix[2])
        this.scale[1] = Math.hypot(matrix[4],matrix[5],matrix[6])
        this.scale[2] = Math.hypot(matrix[8],matrix[9],matrix[10])
        vec3.set(matrix[12], matrix[13], matrix[14], this.position)
        this.radius = radius * Math.max(this.scale[0], this.scale[1], this.scale[2])
        this.frame = frame
    }
    public fromVertices(vertices: Float32Array, stride: number, offset: number, frame: number){
        vec3.copy(vec3.ZERO, this.position)
        for(let i = 0; i < vertices.length; i+=stride){
            this.position[0] += vertices[i + offset + 0]
            this.position[1] += vertices[i + offset + 1]
            this.position[2] += vertices[i + offset + 2]
        }
        vec3.scale(this.position, vertices.length && stride / vertices.length, this.position)
        this.radius = calculateBoundingRadius(vertices, stride, offset, this.position)
        this.frame = frame
    }
}

export class FrustumCulling {
    private static temp: vec3 = vec3(0,0,0)
    public layerMask: number = OpaqueLayer.All
    private near: number
    private far: number
    private fieldOfView: number
    private aspectRatio: number
    private tangent: number
    private sphereFactorX: number
    private sphereFactorY: number
    private readonly modelMatrix: mat4 & Float32Array = mat4() as any
    private readonly AXIS_X: vec3 = this.modelMatrix.subarray(0, 3) as any
    private readonly AXIS_Y: vec3 = this.modelMatrix.subarray(4, 7) as any
    private readonly AXIS_Z: vec3 = this.modelMatrix.subarray(8, 11) as any
    private readonly position: vec3 = this.modelMatrix.subarray(12, 14) as any
    update(view: mat4, projection: mat4){
        this.near = projection[14] / (projection[10] - 1.0)
        this.far = projection[14] / (projection[10] + 1.0)
        this.fieldOfView = 2 * Math.atan(1 / projection[5])
        this.aspectRatio = projection[5] / projection[0]

        mat4.invert(view, this.modelMatrix)

        this.tangent = Math.tan(this.fieldOfView / 2)
        this.sphereFactorY = 1 / Math.cos(this.fieldOfView / 2)
        this.sphereFactorX = 1 / Math.cos(Math.atan(this.tangent * this.aspectRatio))
    }
    updateCamera(camera: PerspectiveCamera){
        this.fieldOfView = camera.fieldOfView
        this.aspectRatio = camera.aspectRatio
        this.near = camera.zNear
        this.far = camera.zFar

        this.tangent = Math.tan(this.fieldOfView / 2)
        this.sphereFactorY = 1 / Math.cos(this.fieldOfView / 2)
        this.sphereFactorX = 1 / Math.cos(Math.atan(this.tangent * this.aspectRatio))

        const modelMatrix = camera.transform?.matrix || mat4.IDENTITY
        vec3.set(modelMatrix[0], modelMatrix[1], modelMatrix[2], this.AXIS_X)
        vec3.set(modelMatrix[4], modelMatrix[5], modelMatrix[6], this.AXIS_Y)
        vec3.set(-modelMatrix[8], -modelMatrix[9], -modelMatrix[10], this.AXIS_Z)
        vec3.set(modelMatrix[12], modelMatrix[13], modelMatrix[14], this.position)
    }
    public cull(bounds: BoundingVolume, layer: OpaqueLayer): boolean {
        return (this.layerMask & layer) != 0
        && this.cullSphere(bounds.position, bounds.radius)
    }
    private cullSphere(center: vec3, radius: number): boolean {
        const direction = vec3.subtract(center, this.position, FrustumCulling.temp)
        const dz = -vec3.dot(direction, this.AXIS_Z)
        if(dz > this.far + radius || dz < this.near - radius) return false
        const dy = vec3.dot(direction, this.AXIS_Y)
        const edgeY = dz * this.tangent + radius * this.sphereFactorY
        if(dy > edgeY || dy < -edgeY) return false
        const dx = vec3.dot(direction, this.AXIS_X)
        const edgeX = dz * this.tangent * this.aspectRatio + radius * this.sphereFactorX
        if(dx > edgeX || dx < -edgeX) return false
        return true
    }
}