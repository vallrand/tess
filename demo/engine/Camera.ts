import { vec3, quat, mat4, vec4 } from './math'
import { Application } from './framework'
import { GL, UniformBlock } from './webgl'
import { TransformSystem, Transform } from './Transform'
import { FrustumCulling } from './FrustumCulling'

export interface ICamera {
    frame: number
    viewMatrix: mat4
    projectionMatrix: mat4
}

export class PerspectiveCamera implements ICamera {
    public frame: number = 0
    public transform: Transform
    public zNear: number = 0.1
    public zFar: number = 100
    public fieldOfView: number = Math.PI / 2
    public aspectRatio: number = 1
    public readonly viewMatrix: mat4 = mat4()
    public readonly projectionMatrix: mat4 = mat4()
    public readonly viewProjectionMatrix: mat4 = mat4()
    public uniform: UniformBlock
    public culling = new FrustumCulling(this)
}

export class CameraSystem {
    public camera: PerspectiveCamera
    public uniform: UniformBlock
    constructor(private readonly context: Application){
        this.camera = new PerspectiveCamera()
        this.camera.transform = this.context.get(TransformSystem).create()
        this.uniform = new UniformBlock(this.context.gl, { byteSize: 4 * 4 })
    }
    update(){
        this.uniform.data[0] = this.context.currentTime
        this.uniform.data[1] = this.context.deltaTime
        this.uniform.data[2] = this.context.frame
        this.uniform.data[3] = this.context.currentTime % 1e3
        this.updatePerspectiveCamera(this.camera)
    }
    private updatePerspectiveCamera(camera: PerspectiveCamera){
        if(camera.frame && camera.frame >= camera.transform.frame) return
        if(!camera.uniform) camera.uniform = new UniformBlock(this.context.gl, { byteSize: 4*(16+16+4) })

        if(!camera.frame){
            camera.aspectRatio = this.context.gl.drawingBufferWidth / this.context.gl.drawingBufferHeight
            mat4.perspective(camera.fieldOfView, camera.aspectRatio, camera.zNear, camera.zFar, camera.projectionMatrix)
        }
        camera.culling.update(camera)

        const modelMatrix = camera.transform ? camera.transform.matrix : mat4.IDENTITY
        mat4.invert(modelMatrix, camera.viewMatrix)
        mat4.multiply(camera.projectionMatrix, camera.viewMatrix, camera.viewProjectionMatrix)
        camera.uniform.data.set(camera.viewProjectionMatrix, 0)
        camera.uniform.data.set(camera.viewMatrix, 16)
        camera.uniform.data[16+16] = modelMatrix[12]
        camera.uniform.data[16+17] = modelMatrix[13]
        camera.uniform.data[16+18] = modelMatrix[14]

        camera.frame = this.context.frame
    }
}