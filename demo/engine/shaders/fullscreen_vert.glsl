#version 300 es

layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;

out vec2 vUV;

void main(){
    gl_Position = vec4(aPosition.xzy, 1.0);
    vUV = 0.5 + 0.5 * aPosition.xz;
}