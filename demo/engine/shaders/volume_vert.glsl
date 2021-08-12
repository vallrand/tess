#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform mat4 uModelMatrix;

void main(){
    gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(aPosition, 1.0);
}