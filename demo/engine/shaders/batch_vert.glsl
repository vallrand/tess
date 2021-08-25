#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aColor;
layout(location=3) in vec3 aDomain;
layout(location=4) in float aMaterial;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

out vec2 vUV;
out vec3 vPosition;
out vec4 vColor;
out vec3 vDomain;
out float vMaterial;

void main(){
    vUV = aUV;
    vPosition = aPosition;
    vColor = aColor;
    vDomain = aDomain;
    vMaterial = aMaterial + .5;
    gl_Position = uViewProjectionMatrix * vec4(aPosition, 1.0);
}