#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
#ifdef INSTANCING
layout(location=1) in vec4 aColor;
layout(location=2) in mat4 aModelMatrix;
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
out vec4 vColor;
out mat4 vInvModel;

void main(){
    vPosition = (aModelMatrix * vec4(aPosition, 1.0)).xyz;
    vColor = aColor;
    vInvModel = inverse(aModelMatrix);
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}