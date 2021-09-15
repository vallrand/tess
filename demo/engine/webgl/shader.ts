import { GL } from './constants'
import { GLSLTypeSize, GLSLDataType, UniformBlockBindings, UniformSamplerBindings } from './shared'

export interface ShaderProgram {
    target: WebGLProgram
    uniforms: Record<string, any>
}

export function ShaderProgram(
    gl: WebGL2RenderingContext, vertex: string, fragment: string, define?: {[key:string]: number | boolean}
): ShaderProgram {
    if(define) for(let key in define){
        if(define[key] == false) continue
        const shaderDefine = `\n#define ${key.toUpperCase()}${define[key] == true ? '' : ' '+define[key]}\n`
        vertex = vertex.replace(/\n/, shaderDefine)
        fragment = fragment?.replace(/\n/, shaderDefine)
    }
    const transformFeedback: string[] = []
    vertex = vertex.replace(/^layout\([^\)]*\) (out \S+ (\S+);)$/igm, (match, line, name) => {
        transformFeedback.push(name)
        return line
    })
    const program = compileProgram(gl, vertex, fragment || '#version 300 es\nvoid main(){}', transformFeedback.length ? transformFeedback : null)
    return { target: program, uniforms: locateUniforms(gl, program) }
}

export function compileProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string, transformFeedback?: string[]): WebGLProgram {
    const vertex = gl.createShader(GL.VERTEX_SHADER)
    gl.shaderSource(vertex, vertexSource)
    gl.compileShader(vertex)
    if(!gl.getShaderParameter(vertex, GL.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vertex))

    const fragment = gl.createShader(GL.FRAGMENT_SHADER)
    gl.shaderSource(fragment, fragmentSource)
    gl.compileShader(fragment)
    if(!gl.getShaderParameter(fragment, GL.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fragment))

    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)

    if(transformFeedback) gl.transformFeedbackVaryings(program, transformFeedback, GL.INTERLEAVED_ATTRIBS)

    gl.linkProgram(program)

    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if(!gl.getProgramParameter(program, GL.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    return program
}

export function locateUniforms(gl: WebGL2RenderingContext, program: WebGLProgram){
    gl.useProgram(program)
    for(let key in UniformBlockBindings){
        const index = gl.getUniformBlockIndex(program, key)
        if(index != GL.INVALID_INDEX) gl.uniformBlockBinding(program, index, UniformBlockBindings[key])
    }
    const group: Record<string, any> = Object.create(null)
    for(let i = gl.getProgramParameter(program, GL.ACTIVE_UNIFORM_BLOCKS) - 1; i >= 0; i--){
        const byteSize = gl.getActiveUniformBlockParameter(program, i, GL.UNIFORM_BLOCK_DATA_SIZE)
        const indices = gl.getActiveUniformBlockParameter(program, i, GL.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES)
        const offsets = gl.getActiveUniforms(program, indices, GL.UNIFORM_OFFSET)
        const name = gl.getActiveUniformBlockName(program, i)
        const blockIndices = gl.getActiveUniforms(program, indices, GL.UNIFORM_BLOCK_INDEX)
        const uniforms: WebGLActiveInfo[] = Array(indices.length)
        for(let i = 0; i < indices.length; i++) uniforms[i] = gl.getActiveUniform(program, indices[i])
        group[name] = { byteSize, offsets, uniforms }
    }

    for(let i = gl.getProgramParameter(program, GL.ACTIVE_UNIFORMS) - 1; i >= 0; i--){
        const uniform: WebGLActiveInfo = gl.getActiveUniform(program, i)
        const location: WebGLUniformLocation = gl.getUniformLocation(program, uniform.name)
        if(!location) continue
        let upload: <T>(value: T) => void
        switch(uniform.type){
            case GL.INT:
            case GL.SAMPLER_2D:
            case GL.SAMPLER_2D_ARRAY:
            case GL.SAMPLER_CUBE:
                upload = uniform.size > 1 ? gl.uniform1iv.bind(gl, location) : gl.uniform1i.bind(gl, location)
                break
            case GL.FLOAT:
                upload = uniform.size > 1 ? gl.uniform1fv.bind(gl, location) : gl.uniform1f.bind(gl, location)
                break
            case GL.FLOAT_VEC2:
                upload = gl.uniform2fv.bind(gl, location)
                break
            case GL.FLOAT_VEC3:
                upload = gl.uniform3fv.bind(gl, location)
                break
            case GL.FLOAT_VEC4:
                upload = gl.uniform4fv.bind(gl, location)
                break
            case GL.FLOAT_MAT2:
                upload = gl.uniformMatrix2fv.bind(gl, location, false)
                break
            case GL.FLOAT_MAT3:
                upload = gl.uniformMatrix3fv.bind(gl, location, false)
                break
            case GL.FLOAT_MAT4:
                upload = gl.uniformMatrix4fv.bind(gl, location, false)
                break
        }
        //value = new GLSLDataType[uniform.type](GLSLTypeSize[uniform.type] * uniform.size)
        Object.defineProperty(group, uniform.name.replace(/\[0\]$/,''), { set: upload })
    }
    for(let key in UniformSamplerBindings)
        if(key in group) group[key] = UniformSamplerBindings[key]
    return group
}

export class UniformBlock<T = {[key: string]: Float32Array | Int32Array}> {
    frame: number = 0
    data: Float32Array
    buffer: WebGLBuffer
    uniforms: T = Object.create(null)
    constructor(gl: WebGL2RenderingContext, info: {
        byteSize: number
        offsets?: number[]
        uniforms?: WebGLActiveInfo[]
    }, location: number = 0){
        this.buffer = gl.createBuffer()
        this.data = new Float32Array(info.byteSize / Float32Array.BYTES_PER_ELEMENT)
        for(let i = info.uniforms?.length - 1; i >= 0; i--){
            const offset = info.offsets[i]
            const { type, size, name } = info.uniforms[i]
            const length = GLSLTypeSize[type] * size
            const view = new GLSLDataType[type](this.data.buffer, offset, length)
            this.uniforms[name] = view
        }
        gl.bindBufferBase(GL.UNIFORM_BUFFER, location, this.buffer)
        gl.bufferData(GL.UNIFORM_BUFFER, this.data.byteLength, GL.DYNAMIC_DRAW)
    }
    bind(gl: WebGL2RenderingContext, location: number, frame?: number){
        gl.bindBufferBase(GL.UNIFORM_BUFFER, location, this.buffer)
        //TODO check if dirty?
        gl.bufferSubData(GL.UNIFORM_BUFFER, 0, this.data)
    }
}