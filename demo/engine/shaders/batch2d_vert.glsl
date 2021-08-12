#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec2 aPosition;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aColor;
layout(location=3) in vec4 aMaterial;

uniform mat3 uProjectionMatrix;

out vec2 vUV;
out vec4 vColor;
out vec4 vMaterial;

void main(){
    gl_Position = vec4((uProjectionMatrix * vec3(aPosition,1.)).xy,0.,1.);
    vUV = aUV;
    vColor = aColor;
    vMaterial = aMaterial + vec4(0,0,0,.5);
}