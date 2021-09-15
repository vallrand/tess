import { vec3, quat, mat4, vec4 } from '../math'
import { Application } from '../framework'
import { GL, UniformBlock } from '../webgl'
import { TransformSystem, Transform } from './Transform'
import { FrustumCulling } from './FrustumCulling'

export interface ICamera {
    frame: number
    readonly viewMatrix: mat4
    readonly projectionMatrix: mat4
    readonly position: vec3
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
    public readonly position: vec3 = vec3()
    public uniform: UniformBlock
    public culling = new FrustumCulling()
}

class CameraController {
    public readonly cameraTarget: vec3 = vec3(0,0,0)
    public readonly cameraOffset: vec3 = vec3(0, 8, 4)
    private readonly cameraPivot: vec3 = vec3(0,0,0)
    private readonly cameraYaw: quat = quat()
    private readonly cameraPitch: quat = quat()
    private readonly cameraSmoothness: number = 0.1
    constructor(private readonly camera: PerspectiveCamera){}
    public adjustCamera(target: vec3){        
        vec3.add(this.cameraOffset, target, this.cameraPivot)
        vec3.lerp(this.camera.transform.position, this.cameraPivot, this.cameraSmoothness, this.camera.transform.position)

        vec3.copy(target, this.cameraTarget)

        const dx = this.camera.transform.position[0] - target[0]
        const dy = this.camera.transform.position[1] - target[1]
        const dz = this.camera.transform.position[2] - target[2]
        const dw = Math.sqrt(dx*dx+dz*dz)
        
        quat.axisAngle(vec3.AXIS_Y, Math.atan2(dx, dz), this.cameraYaw)
        quat.axisAngle(vec3.AXIS_X, Math.atan2(-dy, dw), this.cameraPitch)
        quat.multiply(this.cameraYaw, this.cameraPitch, this.camera.transform.rotation)
        quat.normalize(this.camera.transform.rotation, this.camera.transform.rotation)
        this.camera.transform.frame = 0
    }
}

export class CameraSystem {
    public camera: PerspectiveCamera
    public controller: CameraController
    public uniform: UniformBlock
    constructor(private readonly context: Application){
        this.camera = new PerspectiveCamera()
        this.camera.transform = this.context.get(TransformSystem).create()
        this.controller = new CameraController(this.camera)
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
        if(!camera.uniform) camera.uniform = new UniformBlock(this.context.gl, { byteSize: 4*(16+16+16+4) })

        if(!camera.frame){
            camera.aspectRatio = this.context.gl.drawingBufferWidth / this.context.gl.drawingBufferHeight
            mat4.perspective(camera.fieldOfView, camera.aspectRatio, camera.zNear, camera.zFar, camera.projectionMatrix)
        }
        camera.culling.updateCamera(camera)

        const modelMatrix = camera.transform ? camera.transform.matrix : mat4.IDENTITY
        mat4.invert(modelMatrix, camera.viewMatrix)
        mat4.multiply(camera.projectionMatrix, camera.viewMatrix, camera.viewProjectionMatrix)
        camera.uniform.data.set(camera.viewProjectionMatrix, 0)
        camera.uniform.data.set(camera.projectionMatrix, 16)
        camera.uniform.data.set(camera.viewMatrix, 16+16)
        camera.uniform.data[16+16+16] = camera.position[0] = modelMatrix[12]
        camera.uniform.data[16+16+17] = camera.position[1] = modelMatrix[13]
        camera.uniform.data[16+16+18] = camera.position[2] = modelMatrix[14]

        camera.frame = this.context.frame
    }
}