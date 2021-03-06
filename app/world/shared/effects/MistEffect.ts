import { Application } from '../../../engine/framework'
import { vec3, aabb3, randomFloat, mulberry32 } from '../../../engine/math'
import { GL, ShaderProgram } from '../../../engine/webgl'
import * as shaders from '../../../engine/shaders'
import * as localShaders from '../../shaders'
import { CameraSystem } from '../../../engine/scene/Camera'
import { ParticleSystem } from '../../../engine/particles'
import { MaterialSystem, EmitterMaterial, ShaderMaterial } from '../../../engine/materials'

function intersectPlane(origin: vec3, ray: vec3, planeNormal: vec3, planePosition: vec3, out: vec3): vec3 {
    const d = -vec3.dot(planePosition, planeNormal)
    const v = vec3.dot(ray, planeNormal)
    const t = -(vec3.dot(origin, planeNormal) + d) / v
    vec3.scale(ray, t, out)
    return vec3.add(out, origin, out)
}

export class MistEffect extends ParticleSystem<void> {
    private readonly center: vec3 = vec3(0, 0, 0)
    private readonly ray: vec3 = vec3(0, 0, 0)
    private frame: number = 0
    constructor(context: Application, amount: number, bounds: aabb3){
        super(
            context, { limit: amount, format: [
                { name: 'aTransform', size: 3, type: GL.FLOAT, normalized: false, stride: 12, offset: 0 }
            ] }, null,
            ShaderProgram(context.gl, localShaders.mist_vert, shaders.billboard_frag, { POINT: true }), null
        )
        this.material = new EmitterMaterial()
        this.material.blendMode = ShaderMaterial.Blend

        this.program.uniforms['uArea'] = vec3(bounds[3] - bounds[0], bounds[4] - bounds[1], bounds[5] - bounds[2])

        this.instances = amount
        const { gl } = this.context
        const random = mulberry32()
        const vertexArray = new Float32Array(this.instances * 3)
        for(let i = 0; i < this.instances; i++){
            vertexArray[i * 3 + 0] = randomFloat(bounds[0], bounds[3], random())
            vertexArray[i * 3 + 1] = randomFloat(bounds[1], bounds[4], random())
            vertexArray[i * 3 + 2] = randomFloat(bounds[2], bounds[5], random())
        }
        gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[0])
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, vertexArray)

        const materials = this.context.get(MaterialSystem)
        this.material.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.circle), { uColor: [0.5,0.5,0.5,1] }, 0
        ).target
    }
    public apply(): void {
        update:{
            const camera = this.context.get(CameraSystem).camera
            if(this.frame >= camera.frame && this.frame) break update
            this.frame = this.context.frame
            vec3.set(camera.viewMatrix[2], camera.viewMatrix[6], camera.viewMatrix[10], this.ray)
            intersectPlane(camera.transform.position, this.ray, vec3.AXIS_Y, vec3.ZERO, this.center)
            this.context.gl.useProgram(this.program.target)
            this.program.uniforms['uCenter'] = this.center
            this.program.uniforms['uSize'] = 0.2 * this.context.gl.drawingBufferHeight * 0.5 * camera.projectionMatrix[5]
        }
        super.apply()
    }
}