// import { Application } from '../../engine/framework'
// import { vec2, vec4 } from '../../engine/math'
// import { GL, ShaderProgram, UniformBlock, UniformBlockBindings } from '../../engine/webgl'
// import { MeshBuffer } from '../../engine/Mesh'
// import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
// import { ParticleSystem } from '../../engine/particles'

// const shader = {
//     vert:
// `#version 300 es
// precision highp float;
// layout(std140, column_major) uniform;

// layout(location=0) in vec3 aPosition;
// layout(location=1) in vec2 aUV;

// layout(location=2) in vec4 aTransform;
// layout(location=3) in vec4 aVelocity;
// layout(location=4) in vec4 aAcceleration;
// layout(location=5) in vec2 aLifetime;

// out vec2 vUV;

// uniform GlobalUniforms {
//     vec4 uTime;
// };
// uniform CameraUniforms {
//     mat4 uViewProjectionMatrix;
//     mat4 uViewMatrix;
//     vec3 uEyePosition;
// };

// void main(){
//     vec3 translate = aTransform.xyz;
//     float rotate = aTransform.w;

//     float life = aLifetime.x / aLifetime.y; //gl_InstanceID; gl_VertexID
//     //gl_PointSize = 10.0
//     float size = 1.0;

// #if defined(CYLINDRICAL)
//     vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
//     vec3 up = vec3(0,1,0);
//     vec3 position = (right * aPosition.x) + (up * aPosition.y);
// #elif defined(SPHERICAL)
//     vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
//     vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
//     vec3 position = right * aPosition.x + up * aPosition.y;
// #else
//     vec3 position = aPosition;
// #endif

//     position = position * size + translate;
//     vUV = aUV;
//     gl_Position = uViewProjectionMatrix * vec4(position, 1.0);
// }
// `,
//     frag:
// `#version 300 es
// precision highp float;

// in vec2 vUV;
// in vec4 vColor;
// in vec4 vMaterial;

// out vec4 fragColor;

// uniform sampler2D uSampler;
// uniform sampler2D uGradient;

// void main(void){
// #ifdef POINT
//     vec4 color = texture(uSampler, gl_PointCoord);
// #else
//     vec4 color = texture(uSampler, vUV);
// #endif
//     fragColor = vec4(1.0,0.0,0.0,1.0);
// }
// `,
//     update:
// `#version 300 es
// precision highp float;
// layout(std140, column_major) uniform;

// layout(location=0) in vec4 aTransform;
// layout(location=1) in vec4 aVelocity;
// layout(location=2) in vec4 aAcceleration;
// layout(location=3) in vec2 aLifetime;

// layout(xfb_offset=0) out vec4 vTransform;
// layout(xfb_offset=0) out vec4 vVelocity;
// layout(xfb_offset=0) out vec4 vAcceleration;
// layout(xfb_offset=0) out vec2 vLifetime;

// uniform GlobalUniforms {
//     vec4 uTime;
// };
// uniform EmitterUniforms {
//     vec4 uOrigin;
//     vec4 uGravity;
//     vec2 uRadius;
//     int uLastID;
// };

// #define TAU 6.283185307179586
// float hash(uvec2 x){
//     uvec2 q = 1103515245U * ( (x>>1U) ^ (x.yx   ) );
//     uint  n = 1103515245U * ( (q.x  ) ^ (q.y>>3U) );
//     return float(n) * (1.0/float(0xffffffffU));
// }

// void main(){
//     uvec2 seed = uvec2(gl_VertexID,1000.*uTime.x);

//     if(gl_VertexID > uLastID){
// #if defined(SPHERE)
//         vec3 random = vec3(hash(seed), hash(seed*16807U), hash(seed*48271U));
//         float theta = TAU * random.x;
//         float phi = acos(2. * random.y - 1.);
//         float radius = mix(uRadius.x, uRadius.y, random.z);
//         vec3 normal = vec3(
//             sin(phi) * cos(theta),
//             sin(phi) * sin(theta),
//             cos(phi)
//         );
//         vTransform = vec4(uOrigin.xyz + radius * normal,uOrigin.w);
// #endif
//         vAcceleration = vec4(0.0, 0.0, 0.0, 0.0);
//         vVelocity = vec4(0.0, 0.0, 0.0, 0.0);
//         vLifetime = vec2(0.0, 1.0);
//     }else{
//         //TODO skip if life < 0
//         vAcceleration = aAcceleration;
//         vVelocity = aVelocity + vAcceleration * uTime.y;
//         vTransform = aTransform + vVelocity * uTime.y;
//         vLifetime = vec2(aLifetime.x + uTime.y, aLifetime.y);
//     }
// }`
// }

// export class SparkParticleEmitter extends ParticleSystem {
//     private static stripeMesh(gl: WebGL2RenderingContext, length: number): MeshBuffer {
//         const vbo = gl.createBuffer()
//         gl.bindBuffer(GL.ARRAY_BUFFER, vbo)
//         const vertexData = new Float32Array(length * 2 * (3+2))
//         for(let i = 0; i < length; i++){
//             const l = i / (length - 1)
//             vertexData[i * 2 * 5 + 0] = -0.5
//             vertexData[i * 2 * 5 + 1] = l
//             vertexData[i * 2 * 5 + 2] = 0

//             vertexData[i * 2 * 5 + 3] = 0
//             vertexData[i * 2 * 5 + 4] = l
            
//             vertexData[i * 2 * 5 + 5] = 0.5
//             vertexData[i * 2 * 5 + 6] = l
//             vertexData[i * 2 * 5 + 7] = 0

//             vertexData[i * 2 * 5 + 8] = 1
//             vertexData[i * 2 * 5 + 9] = l
//         }
//         gl.bufferData(GL.ARRAY_BUFFER, vertexData, GL.STATIC_DRAW)
//         return {
//             drawMode: GL.TRIANGLE_STRIP, vbo, frame: 0, indexOffset: 0, indexCount: 2 * length,
//             vao: null, aabb: null, radius: 0,
//             format: [
//                 {name:'aPosition',size:3,type:GL.FLOAT,stride:20,offset:0},
//                 {name:'aUV',size:2,type:GL.FLOAT,stride:20,offset:12}
//             ]
//         }
//     }
//     constructor(context: Application){
//         super(
//             context,
//             SparkParticleEmitter.stripeMesh(context.gl, 10), 
//             ShaderProgram(context.gl, shader.vert, shader.frag, {  }),
//             [
//                 {name:'aTransform',size:4,type:GL.FLOAT,normalized:false,stride:56,offset:0},
//                 {name:'aVelocity',size:4,type:GL.FLOAT,normalized:false,stride:56,offset:16},
//                 {name:'aAcceleration',size:4,type:GL.FLOAT,normalized:false,stride:56,offset:32},
//                 {name:'aLifetime',size:2,type:GL.FLOAT,normalized:false,stride:56,offset:48}
//             ], 1024, ShaderProgram(context.gl, shader.update, null, {
//                 SPHERE: true
//             })
//         )
//     }
//     update(){
//         const { gl } = this.context
//         this.instances = 0
//         for(let i = 0; i < this.emitters.length; i++){
//             const emitter = this.emitters[i]

//             emitter.uniform.bind(gl, UniformBlockBindings.EmitterUniforms)
//             const added = emitter.count - emitter.uniform.uniforms['uLastID'][0]
//             const lifespan = emitter.uniform.uniforms['uLifespan'][1]
//             //emitter.push()

//             gl.drawArrays(GL.POINTS, emitter.offset, emitter.count)
//             emitter.uniform.uniforms['uLastID'][0] = emitter.count
//             this.instances += emitter.count
//         }
//     }
//     private emitters: any[] = []
//     addEmitter(){
//         const { gl } = this.context
//         const uniform: UniformBlock = new UniformBlock(gl, this.transform.uniforms['EmitterUniforms'], UniformBlockBindings.EmitterUniforms)
//         const emitter = {
//             uniform, offset: 0, count: 0, queue: []
//         }
//         this.emitters.push(emitter)
//         return emitter
//     }
// }