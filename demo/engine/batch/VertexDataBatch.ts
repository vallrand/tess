import { GL, IVertexAttribute } from '../webgl'

export abstract class VertexDataBatch {
    protected readonly indexArray: Uint16Array
    protected readonly uint32View: Uint32Array
    protected readonly float32View: Float32Array
    private readonly vao: WebGLVertexArrayObject
    private readonly indexBuffer: WebGLBuffer
    private readonly vertexBuffer: WebGLBuffer
    public indexOffset: number = 0
    protected vertexOffset: number = 0
    constructor(
        protected readonly gl: WebGL2RenderingContext,
        protected readonly format: IVertexAttribute[],
        readonly maxVertices: number,
        readonly maxIndices: number,
        readonly fixedIndices: number[]
    ){
        this.indexArray = new Uint16Array(maxIndices)
        if(fixedIndices) for(let i = 0; i < this.indexArray.length; i++)
            this.indexArray[i] = fixedIndices[i % fixedIndices.length] + 4 * Math.floor(i / fixedIndices.length)
        const arraybuffer = new ArrayBuffer(maxVertices * format[1].stride)
        this.float32View = new Float32Array(arraybuffer)
        this.uint32View = new Uint32Array(arraybuffer)

        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)

        this.indexBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, this.indexArray, fixedIndices ? GL.STATIC_DRAW : GL.DYNAMIC_DRAW)

        this.vertexBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer)
        gl.bufferData(GL.ARRAY_BUFFER, arraybuffer.byteLength, GL.DYNAMIC_DRAW)

        for(let index = 1; index < format.length; index++){
            const { size, type, normalized, stride, offset } = format[index]
            gl.enableVertexAttribArray(index - 1)
            gl.vertexAttribPointer(index - 1, size, type, normalized, stride, offset)
        }
        gl.bindVertexArray(null)
    }
    bind(){
        const gl = this.gl
        gl.bindVertexArray(this.vao)
        if(!this.indexOffset) return
        if(!this.fixedIndices){
            gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
            gl.bufferSubData(GL.ELEMENT_ARRAY_BUFFER, 0, this.indexArray.subarray(0, this.indexOffset))
        }
        gl.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer)
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, this.float32View.subarray(0, this.vertexOffset * (this.format[1].stride >>> 2)))

        this.indexOffset = 0
        this.vertexOffset = 0
    }
    delete(){
        this.gl.deleteBuffer(this.indexBuffer)
        this.gl.deleteBuffer(this.vertexBuffer)
        this.gl.deleteVertexArray(this.vao)
    }
}