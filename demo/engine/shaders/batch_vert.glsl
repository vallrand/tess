#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aColor;
layout(location=3) in vec4 aMaterial;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

out vec2 vUV;
out vec4 vColor;
out vec4 vMaterial;

void main(){
    vUV = aUV;
    vColor = aColor;
    vMaterial = aMaterial + vec4(0,0,0,.5);
    gl_Position = uViewProjectionMatrix * vec4(aPosition, 1.0);
}