#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
#ifdef INSTANCED
layout(location=1) in mat4 aModelMatrix;
layout(location=5) in vec4 aColor;
layout(location=6) in vec4 aMaterial;
#else
uniform vec4 uColor;
uniform mat4 uModelMatrix;
#endif 

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

out vec3 vPosition;
out mat4 vInvModel;
out vec4 vColor;
out vec4 vMaterial;

void main(){
    vPosition = (aModelMatrix * vec4(aPosition, 1.0)).xyz;
    vInvModel = inverse(aModelMatrix);
    vColor = aColor;
    vMaterial = aMaterial;
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}