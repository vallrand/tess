// import { Application } from '../framework'
// import { GL, ShaderProgram, IVertexAttribute, ImageData, UniformBlock, UniformBlockBindings } from '../webgl'
// import { MeshBuffer } from '../Mesh'
// import { ParticleSystem } from './ParticleSystem'

// interface ParticleSystemOptions {
//     drawMode: number
//     mesh: any
//     texture: WebGLTexture
//     colorRamp: WebGLTexture
//     blend: [number,number]
    
// }

// class BillboardParticleEmitter {
//     update(){
        
//     }
// }

export class BillboardParticleSystem {}

// export class BillboardParticleSystem extends ParticleSystem {
//     private static quadMesh(context: Application): MeshBuffer {
//         const { gl } = context
//         const vbo = gl.createBuffer()
//         gl.bindBuffer(GL.ARRAY_BUFFER, vbo)
//         gl.bufferData(GL.ARRAY_BUFFER, new Float32Array([
//             -0.5,0.5,0, 0,0,
//             -0.5,-0.5,0, 0,1,
//             0.5,-0.5,0, 1,1,
//             0.5,0.5,0, 1,0
//         ]), GL.STATIC_DRAW)
//         return {
//             drawMode: GL.TRIANGLE_FAN, vbo, frame: 0, indexOffset: 0, indexCount: 4,
//             vao: null, aabb: null, radius: 0.5,
//             format: [
//                 {name:'aPosition',size:3,type:GL.FLOAT,stride:20,offset:0},
//                 {name:'aUV',size:2,type:GL.FLOAT,stride:20,offset:12}
//             ]
//         }
//     }
//     constructor(context: Application){super(
//         context,
//         BillboardParticleSystem.quadMesh(context),
//         ShaderProgram(context.gl,require('../shaders/billboard_vert.glsl'),require('../shaders/billboard_frag.glsl'),{}),
//         [
//             {name:'aTransform',size:4,type:GL.FLOAT,normalized:false,stride:56,offset:0},
//             {name:'aVelocity',size:4,type:GL.FLOAT,normalized:false,stride:56,offset:16},
//             {name:'aAcceleration',size:4,type:GL.FLOAT,normalized:false,stride:56,offset:32},
//             {name:'aLifetime',size:2,type:GL.FLOAT,normalized:false,stride:56,offset:48}
//         ],
//         1024,ShaderProgram(context.gl,require('../shaders/particle_vert.glsl'),undefined)
//     )}
//     update(){

//     }
// }