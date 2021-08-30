import { range, vec2, aabb2, mat3x2, mat3 } from '../../engine/math'
import { GL, ShaderProgram } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { Batch2D } from '../../engine/pipeline/batch'
import { OverlayPass } from '../../engine/pipeline/OverlayPass'
import { Sprite2D, Sprite2DMaterial } from '../../engine/Sprite2D'
import { Transform2D } from '../../engine/scene/Transform'
import { MaterialSystem, MeshMaterial } from '../../engine/materials'
import { Direction, CubeOrientation } from './CubeOrientation'
import { Cube } from './Cube'

export class CubeTileMap {
    private tileFaces: number[][]
    private readonly batch: Batch2D
    private readonly program: ShaderProgram
    private readonly batchRanges: [number,number][] = []
    private readonly tiles: Sprite2DMaterial[] = []
    private readonly materials: {
        fbo: WebGLFramebuffer
        size: vec2
    }[] = []
    private readonly projectionMatrix: mat3 = mat3()
    public side: number = -1
    public hash: number = -1
    constructor(private readonly context: Application){
        this.batch = new Batch2D(this.context.gl, 6 * 6 * 4, 6 * 6 * 6, Batch2D.quadIndices)
        this.program = ShaderProgram(this.context.gl,
            require('../../engine/shaders/batch2d_vert.glsl'),
            require('../shaders/batch2d_rg_frag.glsl'))
    }
    private renderTexture(texture: { fbo: WebGLFramebuffer, size: vec2 }, indexCount: number, offset: number, program: ShaderProgram){
        const gl = this.context.gl

        gl.bindFramebuffer(GL.FRAMEBUFFER, texture.fbo)
        gl.viewport(0, 0, texture.size[0], texture.size[1])

        gl.useProgram(program.target)
        program.uniforms['uProjectionMatrix'] = this.projectionMatrix
        program.uniforms['uScale'] = MaterialSystem.heightmapScale
        program.uniforms['uScreenSize'] = texture.size
        this.batch.bind()
        gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 2 * offset)
    }
    public extractTileMap(materials: MeshMaterial[], tileSize: number, gridSize: number){
        const gl = this.context.gl, materialSystem = this.context.get(MaterialSystem)
        const tileMap = materialSystem.createRenderTexture(tileSize * materials.length, tileSize, 1, {
            filter: GL.NEAREST, wrap: GL.CLAMP_TO_EDGE
        })
        const sourceSize = vec2(tileSize * gridSize, tileSize * gridSize)
        const sprite = new Sprite2D()
        sprite.transform = new Transform2D()
        sprite.material = new Sprite2DMaterial()
    
        vec2.set(tileSize, tileSize, sprite.material.size)
        Sprite2DMaterial.calculateUVMatrix(aabb2(5*tileSize,0,6*tileSize,tileSize), sourceSize, sprite.material.uvMatrix)
        
        for(let i = 0; i < materials.length; i++){
            const material = materials[i]
            const fbo = gl.createFramebuffer()
            gl.bindFramebuffer(GL.FRAMEBUFFER, fbo)
            gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, material.diffuse, 0)
            gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT1, GL.TEXTURE_2D, material.normal, 0)
            gl.drawBuffers([ GL.COLOR_ATTACHMENT0, GL.COLOR_ATTACHMENT1 ])
            this.materials[material.index] = { size: sourceSize, fbo }
            sprite.material.diffuse = material.diffuse
            vec2.set(i * tileSize, 0, sprite.transform.position)
    
            sprite.transform.recalculate(0)
            sprite.frame = 0
            sprite.update(this.context)
    
            this.batch.render(sprite)

            const tileMaterial = this.tiles[material.index] = new Sprite2DMaterial()
            tileMaterial.diffuse = tileMap.target
            vec2.set(tileSize, tileSize, tileMaterial.size)
            Sprite2DMaterial.calculateUVMatrix(
                aabb2(i * tileSize,0,(i+1)*tileSize,tileSize),
                vec2(tileSize * materials.length, tileSize),
                tileMaterial.uvMatrix
            )
        }
        const indexOffset = this.batch.indexOffset
        const projection = mat3x2.orthogonal(0, tileMap.width, 0, tileMap.height, mat3x2())
        mat3.fromMat3x2(projection, this.projectionMatrix)
        this.renderTexture({
            fbo: tileMap.fbo[0], size: vec2(tileMap.width, tileMap.height)
        }, indexOffset, 0, this.context.get(OverlayPass).program)
        this.batch.bindTextures(Array(materials.length).fill(null))

        mat3x2.orthogonal(0, tileSize*gridSize, 0, tileSize*gridSize, projection)
        mat3.fromMat3x2(projection, this.projectionMatrix)
    }
    private precomputeTileFaces(cube: Cube): number[][] {
        return range(6).map(side => {
            let top = CubeOrientation(side, (4 + Direction.Up - cube.state.sides[side].direction) % 4)
            let front = CubeOrientation.roll(top, Direction.Up)
            let back = CubeOrientation.roll(top, Direction.Down)
            let bottom = CubeOrientation.roll(front, Direction.Up)
            let left = CubeOrientation.roll(top, Direction.Right)
            let right = CubeOrientation.roll(top, Direction.Left)
            right = CubeOrientation.rotate(right, Direction.Right)
            left = CubeOrientation.rotate(left, Direction.Left)
            back = CubeOrientation.rotate(back, Direction.Down)
            return [bottom,front,right,left,back,top]
        })
    }
    private prepareBatch(cube: Cube){
        this.tileFaces = this.precomputeTileFaces(cube)
        const sprite = new Sprite2D()
        vec2.set(0.5,0.5,sprite.origin)
        sprite.transform = new Transform2D()
        for(let offset = 0, side = 0; side < 6; side++){
            const faces = this.tileFaces[side]
            for(let i = 0; i < faces.length; i++){
                const face = faces[i] >>> 2
                const direction = ((faces[i] & 0x3) + cube.state.sides[face].direction) % 4
                const tileIndex = cube.meshes[face].material.index
                sprite.material = this.tiles[tileIndex]
                sprite.transform.rotation = -direction * 0.5 * Math.PI
                vec2.set(i * sprite.material.size[0] + 0.5 * sprite.material.size[0], 0.5 * sprite.material.size[0], sprite.transform.position)

                sprite.transform.recalculate(0)
                sprite.frame = 0
                sprite.update(this.context)

                this.batch.render(sprite)
            }
            this.batchRanges[side] = [offset, this.batch.indexOffset - offset]
            offset = this.batch.indexOffset
        }
    }
    renderFaceTiles(cube: Cube){
        if(this.side == cube.state.side && this.hash == cube.hash) return
        if(this.hash != cube.hash) this.prepareBatch(cube)
        this.hash = cube.hash
        this.side = cube.state.side

        const materialIndex = cube.meshes[this.side].material.index
        const range = this.batchRanges[this.side]
        this.renderTexture(this.materials[materialIndex], range[1], range[0], this.program)
    }
}