import { GL, ShaderProgram } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { vec3 } from '../../engine/math'
import { IEffect } from '../../engine/pipeline'
import { Line, GeometryBatch } from '../../engine/batch'
import { CameraSystem } from '../../engine/Camera'
import { SpriteMaterial } from '../../engine/Sprite'

export class BeamEffect implements IEffect {
    public enabled: boolean = true
    private readonly program: ShaderProgram
    private readonly lines: Line[] = []
    private readonly batch: GeometryBatch
    constructor(private readonly context: Application, limit: number){
        const { gl } = this.context
        this.program = ShaderProgram(gl, require('../../engine/shaders/batch_vert.glsl'), require('../shaders/beam_frag.glsl'))
        this.batch = new GeometryBatch(gl, limit * 2, limit * 6)
    }
    public apply(): void {
        if(!this.lines.length || !this.enabled) return
        const { gl } = this.context
        const camera = this.context.get(CameraSystem).camera
        for(let i = this.lines.length - 1; i >= 0; i--){
            const line = this.lines[i]
            line.recalculate(this.context.frame, camera)
            this.batch.render(line)
        }
        const indexCount = this.batch.indexOffset
        this.batch.bind()
        gl.useProgram(this.program.target)
        gl.blendFunc(GL.ONE, GL.ONE)
        gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
    }
    add(origin: vec3, target: vec3): Line {
        const line = new Line()
        line.path = [origin, target]
        line.width = 2
        line.material = new SpriteMaterial()
        line.material.tint[0] = Math.sqrt(vec3.distanceSquared(origin, target)) / line.width
        this.lines.push(line)
        return line
    }
}