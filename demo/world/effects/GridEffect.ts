import { ShaderProgram, UniformBlock, UniformBlockBindings } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { Transform, TransformSystem } from '../../engine/scene/Transform'
import { DecalPass } from '../../engine/pipeline/DecalPass'
import { DecalBatch } from '../../engine/pipeline/batch'
import { GL } from '../../engine/webgl'
import { vec3 } from '../../engine/math'

export class GridEffect {
    private readonly program: ShaderProgram
    private readonly vao: WebGLVertexArrayObject
    public transform: Transform
    private uniform: UniformBlock
    public enabled: boolean = !true
    constructor(private readonly context: Application, readonly gridSize: number){
        const { gl } = this.context
        this.program = ShaderProgram(gl, require('../../engine/shaders/volume_vert.glsl'), require('../shaders/grid_frag.glsl'))
        this.program.uniforms['uGridSize'] = 1 / gridSize
        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.context.get(DecalPass).batch.indexBuffer)
        gl.bindBuffer(GL.ARRAY_BUFFER, this.context.get(DecalPass).batch.vertexBuffer)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, GL.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)

        this.transform = this.context.get(TransformSystem).create()
        vec3.set(2*gridSize, 10, 2*gridSize, this.transform.scale)


        this.uniform = new UniformBlock(gl, { byteSize: 4*(16+4+1) }, UniformBlockBindings.ModelUniforms)
    }
    apply(){
        if(!this.enabled) return
        const { gl } = this.context
        gl.useProgram(this.program.target)

        this.uniform.data.set(this.transform.matrix, 0)
        this.uniform.bind(gl, UniformBlockBindings.ModelUniforms)
        gl.bindVertexArray(this.vao)

        gl.enable(GL.BLEND)
        gl.blendEquation(GL.FUNC_ADD)
        gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        gl.drawElements(GL.TRIANGLES, DecalBatch.unitCubeIndices.length, GL.UNSIGNED_SHORT, 0)
    }
}