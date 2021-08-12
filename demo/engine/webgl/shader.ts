import { GL } from './constants'
import { UniformBlockBindings, UniformSamplerBindings } from './shared'

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
        fragment = fragment.replace(/\n/, shaderDefine)
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
    for(let i = gl.getProgramParameter(program, GL.ACTIVE_UNIFORM_BLOCKS) - 1; i >= 0; i--){
        const size = gl.getActiveUniformBlockParameter(program, i, GL.UNIFORM_BLOCK_DATA_SIZE)
        const indices = gl.getActiveUniformBlockParameter(program, i, GL.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES)
        const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET)
        const name = gl.getActiveUniformBlockName(program, i)
    }

    const group: Record<string, any> = Object.create(null)
    for(let i = gl.getProgramParameter(program, GL.ACTIVE_UNIFORMS) - 1; i >= 0; i--){
        const uniform: WebGLActiveInfo = gl.getActiveUniform(program, i)
        const location: WebGLUniformLocation = gl.getUniformLocation(program, uniform.name)
        if(!location) continue
        let upload: <T>(value: T) => void
        switch(uniform.type){
            case GL.INT:
            case GL.SAMPLER_2D:
            case GL.SAMPLER_2D_ARRAY:
                //value = uniform.size > 1 ? new Int32Array(uniform.size) : 0
                upload = uniform.size > 1 ? gl.uniform1iv.bind(gl, location) : gl.uniform1i.bind(gl, location)
                break
            case GL.FLOAT:
                //value = uniform.size > 1 ? new Float32Array(uniform.size) : 0
                upload = uniform.size > 1 ? gl.uniform1fv.bind(gl, location) : gl.uniform1f.bind(gl, location)
                break
            case GL.FLOAT_VEC2:
                //value = new Float32Array(uniform.size * 2)
                upload = gl.uniform2fv.bind(gl, location)
                break
            case GL.FLOAT_VEC3:
                //value = new Float32Array(uniform.size * 3)
                upload = gl.uniform3fv.bind(gl, location)
                break
            case GL.FLOAT_VEC4:
                //value = new Float32Array(uniform.size * 4)
                upload = gl.uniform4fv.bind(gl, location)
                break
            case GL.FLOAT_MAT2:
                //value = new Float32Array(uniform.size * 4)
                upload = gl.uniformMatrix2fv.bind(gl, location, false)
                break
            case GL.FLOAT_MAT3:
                //value = new Float32Array(uniform.size * 9)
                upload = gl.uniformMatrix3fv.bind(gl, location, false)
                break
            case GL.FLOAT_MAT4:
                //value = new Float32Array(uniform.size * 16)
                upload = gl.uniformMatrix4fv.bind(gl, location, false)
                break
        }
        Object.defineProperty(group, uniform.name.replace(/\[0\]$/,''), { set: upload })
    }
    for(let key in UniformSamplerBindings)
        if(key in group) group[key] = UniformSamplerBindings[key]
    return group
}

export class UniformBlock {
    frame: number = 0
    data: Float32Array
    buffer: WebGLBuffer
    constructor(gl: WebGL2RenderingContext, size: number, location: number = 0){
        this.buffer = gl.createBuffer()
        this.data = new Float32Array(size)
        gl.bindBufferBase(GL.UNIFORM_BUFFER, location, this.buffer)
        gl.bufferData(GL.UNIFORM_BUFFER, this.data.byteLength, GL.DYNAMIC_DRAW)
    }
    bind(gl: WebGL2RenderingContext, location: number){
        gl.bindBufferBase(GL.UNIFORM_BUFFER, location, this.buffer)
        gl.bufferSubData(GL.UNIFORM_BUFFER, 0, this.data)
    }
}





// export function UniformGroup(gl: WebGL2RenderingContext, program: WebGLProgram){
    //getActiveUniformBlockName
//     for(let i = gl.getProgramParameter(program, GL.ACTIVE_UNIFORM_BLOCKS) - 1; i >= 0; i--){
//         const size = gl.getActiveUniformBlockParameter(program, i, GL.UNIFORM_BLOCK_DATA_SIZE)
//         const indices = gl.getActiveUniformBlockParameter(program, i, GL.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES)
//         const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET)

// // const blockIndices = gl.getActiveUniforms(program, indices, gl.UNIFORM_BLOCK_INDEX);
// //   const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

//         console.log(size, indices, offsets)
//     }

//     for(let i = gl.getProgramParameter(program, GL.ACTIVE_UNIFORMS) - 1; i >= 0; i--){
//         const uniform = gl.getActiveUniform(program, i)
//         const location = gl.getUniformLocation(program, uniform.name)
//         console.log(uniform, location)
//         if(!location) continue

//     }

//     return function update(values){
//         //var matrixUniformLocation = gl.getUniformBlockIndex(geoProgram, "Matrices");
//         //gl.uniformBlockBinding(geoProgram, matrixUniformLocation, 0);
//     }
// }

// // const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
// //   const indices = [...Array(numUniforms).keys()];
// //   const blockIndices = gl.getActiveUniforms(program, indices, gl.UNIFORM_BLOCK_INDEX);
// //     const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

// //   for (let ii = 0; ii < numUniforms; ++ii) {
// //     const uniformInfo = gl.getActiveUniform(program, ii);
// //     if (isBuiltIn(uniformInfo)) {
// //         continue;
// //     }
// //     const {name, type, size} = uniformInfo;
// //     const blockIndex = blockIndices[ii];
// //     const offset = offsets[ii];
// //     console.log(
// //        name, size, glEnumToString(gl, type),
// //        blockIndex, offset);
// //   }
// // }

// // gl.uniform3fv(eyePositionLocation, eyePosition);
// // gl.uniform1i(positionBufferLocation, 0);
// // gl.uniform1i(normalBufferLocation, 1);
// // gl.uniform1i(uVBufferLocation, 2);
// // gl.uniform1i(textureMapLocation, 3);

// // matrixUniformData.set(boxes[i].modelMatrix);
// // matrixUniformData.set(boxes[i].mvpMatrix, 16);

// // gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
// // gl.bufferSubData(gl.UNIFORM_BUFFER, 0, matrixUniformData);


// // var matrixUniformData = new Float32Array(32);
// //         var matrixUniformBuffer = gl.createBuffer();
// //         gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
// //         gl.bufferData(gl.UNIFORM_BUFFER, 128, gl.DYNAMIC_DRAW);

// //         matrixUniformData.set(boxes[i].modelMatrix);
// //                     matrixUniformData.set(boxes[i].mvpMatrix, 16);

// //                     gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
// //                     gl.bufferSubData(gl.UNIFORM_BUFFER, 0, matrixUniformData);


// // const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
// // const indices = [...Array(numUniforms).keys()];
// // const blockIndices = gl.getActiveUniforms(program, indices, gl.UNIFORM_BLOCK_INDEX);
// //   const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

// // for (let ii = 0; ii < numUniforms; ++ii) {
// //   const uniformInfo = gl.getActiveUniform(program, ii);
// //   if (isBuiltIn(uniformInfo)) {
// //       continue;
// //   }
// //   const {name, type, size} = uniformInfo;
// //   const blockIndex = blockIndices[ii];
// //   const offset = offsets[ii];
// //   console.log(
// //      name, size, glEnumToString(gl, type),
// //      blockIndex, offset);
// // }
// // }