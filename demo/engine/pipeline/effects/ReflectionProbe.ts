import { Application } from '../../framework'
import { clamp, mod, vec3, vec4, mat4 } from '../../math'
import { GL, UniformBlock, ShaderProgram, OpaqueLayer, UniformBlockBindings, UniformSamplerBindings } from '../../webgl'
import { MeshSystem } from '../../components'
import { FrustumCulling } from '../../scene'
import { DeferredGeometryPass } from '../GeometryPass'
import { MaterialSystem } from '../../materials'
import { shaders } from '../../shaders'

class CubeMapFace {
    static readonly matrices = [
        mat4.lookAt(vec3.ZERO, vec3(1,0,0), vec3(0,-1,0), mat4()),
        mat4.lookAt(vec3.ZERO, vec3(-1,0,0), vec3(0,-1,0), mat4()),
        mat4.lookAt(vec3.ZERO, vec3(0,1,0), vec3(0,0,1), mat4()),
        mat4.lookAt(vec3.ZERO, vec3(0,-1,0), vec3(0,0,-1), mat4()),
        mat4.lookAt(vec3.ZERO, vec3(0,0,1), vec3(0,-1,0), mat4()),
        mat4.lookAt(vec3.ZERO, vec3(0,0,-1), vec3(0,-1,0), mat4())
    ]
    static readonly targets = [
        GL.TEXTURE_CUBE_MAP_POSITIVE_X,
        GL.TEXTURE_CUBE_MAP_NEGATIVE_X,
        GL.TEXTURE_CUBE_MAP_POSITIVE_Y,
        GL.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        GL.TEXTURE_CUBE_MAP_POSITIVE_Z,
        GL.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ]

    private readonly viewMatrix: mat4
    public readonly projectionMatrix: mat4
    private readonly viewProjectionMatrix: mat4
    private readonly position: vec4 & vec3
    private readonly ubo: WebGLBuffer
    private readonly dataView: Float32Array
    culling: FrustumCulling = new FrustumCulling
    constructor(private readonly gl: WebGL2RenderingContext, private readonly index: number){
        this.ubo = gl.createBuffer()
        this.dataView = new Float32Array(16 + 16 + 16 + 4)
        this.viewProjectionMatrix = this.dataView.subarray(0, 16) as any
        this.projectionMatrix = this.dataView.subarray(16, 16 + 16) as any
        this.viewMatrix = this.dataView.subarray(16 + 16, 16 + 16 + 16) as any
        this.position = this.dataView.subarray(16 + 16 + 16, 16 + 16 + 16 + 4) as any

        gl.bindBufferBase(GL.UNIFORM_BUFFER, UniformBlockBindings.CameraUniforms, this.ubo)
        gl.bufferData(GL.UNIFORM_BUFFER, this.dataView.byteLength, GL.DYNAMIC_DRAW)

        this.culling.layerMask = OpaqueLayer.Skybox | OpaqueLayer.Terrain | OpaqueLayer.Static
    }
    update(position: vec3){
        vec3.scale(position, -1, this.position)
        mat4.copy(CubeMapFace.matrices[this.index], this.viewMatrix)
        mat4.translate(this.viewMatrix, this.position, this.viewMatrix)
        mat4.multiply(this.projectionMatrix, this.viewMatrix, this.viewProjectionMatrix)
        vec3.copy(position, this.position)

        this.culling.update(this.viewMatrix, this.projectionMatrix)
    }
    bind(gl: WebGL2RenderingContext, location: number){
        gl.bindBufferBase(GL.UNIFORM_BUFFER, location, this.ubo)
        gl.bufferSubData(GL.UNIFORM_BUFFER, 0, this.dataView)
    }
    delete(){
        this.gl.deleteBuffer(this.ubo)
    }
}

export class ReflectionProbe {
    static readonly resolution: number = 256
    static readonly near: number = 0.1
    static readonly far: number = 100
    static readonly mipmaps: boolean = true

    public readonly cubemap: WebGLTexture
    private readonly width: number = ReflectionProbe.resolution
    private readonly height: number = ReflectionProbe.resolution
    private readonly depth: WebGLRenderbuffer
    readonly position: vec3 = vec3(0,0,0)
    frame: number = 0
    private readonly fbo: WebGLFramebuffer[] = []
    private readonly faces: CubeMapFace[] = []
    constructor(private readonly context: Application){
        const { gl } = this.context

        this.cubemap = gl.createTexture()
        gl.bindTexture(GL.TEXTURE_CUBE_MAP, this.cubemap)
        gl.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE)
        gl.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)
        gl.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_MIN_FILTER, ReflectionProbe.mipmaps ? GL.LINEAR_MIPMAP_LINEAR : GL.LINEAR)
        gl.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_MAG_FILTER, GL.LINEAR)

        this.depth = gl.createRenderbuffer()
        gl.bindRenderbuffer(GL.RENDERBUFFER, this.depth)
        gl.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, this.width, this.height)

        for(let i = 0; i < CubeMapFace.targets.length; i++){
            const target = CubeMapFace.targets[i]
            gl.texImage2D(target, 0, GL.RGBA, this.width, this.height, 0, GL.RGBA, GL.UNSIGNED_BYTE, null)

            const fbo = this.fbo[i] = gl.createFramebuffer()
            gl.bindFramebuffer(GL.FRAMEBUFFER, fbo)
            gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.depth)
            gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, target, this.cubemap, 0)
            gl.drawBuffers([ GL.COLOR_ATTACHMENT0, GL.NONE, GL.NONE ])

            this.faces[i] = new CubeMapFace(gl, i)
            mat4.perspective(0.5 * Math.PI, 1, ReflectionProbe.near, ReflectionProbe.far, this.faces[i].projectionMatrix)
        }
    }
    public update(target: vec3): void {
        if(this.frame >= this.faces.length) return

        if(this.frame == 0){
            vec3.copy(target, this.position)
            for(let i = this.faces.length - 1; i >= 0; i--)
                this.faces[i].update(this.position)
            
            console.log(`%cenv cubemap ${this.width}x${this.height} - [${this.position}]`,'color:#a0d050')
        }

        const { gl } = this.context
        for(let i = this.faces.length - 1; i >= 0; i--){
            const face = this.faces[i]
            if(i !== this.frame) continue

            gl.viewport(0,0,this.width,this.height)
            gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo[i])
            gl.depthMask(true)
            gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT)

            face.bind(gl, UniformBlockBindings.CameraUniforms)
            this.context.get(DeferredGeometryPass).render(this.context.get(MeshSystem).list, face.culling)
        }
        this.frame++
        if(ReflectionProbe.mipmaps && this.frame === this.faces.length){
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uEnvironmentMap)
            gl.bindTexture(GL.TEXTURE_CUBE_MAP, this.cubemap)
            gl.generateMipmap(GL.TEXTURE_CUBE_MAP)
        }
    }
    delete(){
        const { gl } = this.context
        this.fbo.forEach(fbo => gl.deleteFramebuffer(fbo))
        this.faces.forEach(face => face.delete())
        gl.deleteTexture(this.cubemap)
        gl.deleteRenderbuffer(this.depth)
    }
}

export class LightField {
    private static readonly target: vec3 = vec3()
    public readonly probes: ReflectionProbe[] = []
    private readonly gridSize = 2
    private innerSize: number = 18
    private outerSize: number = 22
    public readonly brdfLUT: WebGLTexture
    constructor(private readonly context: Application){
        for(let i = this.gridSize * this.gridSize - 1; i >= 0; i--)
            this.probes[i] = new ReflectionProbe(this.context)

        const materials = this.context.get(MaterialSystem)
        this.brdfLUT = materials.addRenderTexture(
            materials.createRenderTexture(64, 64, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RG16F }), 0,
            ShaderProgram(context.gl, shaders.fullscreen_vert, shaders.brdflut_frag), {  }, 0
        ).target
    }
    public relocateProbes(target: vec3): void {
        if(this.context.frame == 1) return
        const size = 0.5 * (this.innerSize + this.outerSize)
        const ix = Math.floor(target[0] / size)
        const iy = Math.floor(target[1] / size)
        const iz = Math.floor(target[2] / size)

        for(let x = 0; x < this.gridSize; x++)
        for(let z = 0; z < this.gridSize; z++){
            const probe = this.probes[x + z * this.gridSize]

            const mx = ix + mod(x - ix, this.gridSize)
            const mz = iz + mod(z - iz, this.gridSize)

            const position = vec3.set(mx * size, iy * size + 2, mz * size, LightField.target)
            if(position[0] !== probe.position[0] || position[2] !== probe.position[2]) probe.frame = 0
            const skip = probe.frame < 6
            probe.update(position)
            if(skip) return
        }
    }
    public calculateWeight(target: vec3, probe: ReflectionProbe): number {
        const dx = 2 * Math.abs(target[0] - probe.position[0])
        const dz = 2 * Math.abs(target[2] - probe.position[2])
        const invSize = 1 / (this.outerSize - this.innerSize)
        const wx = 1 - clamp((dx - this.innerSize) * invSize, 0, 1)
        const wz = 1 - clamp((dz - this.innerSize) * invSize, 0, 1)
        return wx * wz
    }
}