#version 300 es

layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform LightUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uRadius;
    float uIntensity;
};

void main(){
    gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(aPosition * uRadius, 1.0);
}