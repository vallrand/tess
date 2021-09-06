#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
#ifdef INSTANCED
layout(location=1) in mat4 aModelMatrix;
layout(location=5) in vec4 aUV;
layout(location=6) in vec4 aColor;

out vec3 vPosition;
#ifdef WORLD
out mat4 vModel;
#else
out mat4 vInvModel;
#endif
out vec4 vUV;
out vec4 vColor;
out float vThreshold;
#else
uniform ModelUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uLayer;
};
#endif

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

void main(){
    mat4 modelMatrix = aModelMatrix;
    modelMatrix[0][3]=0.0;modelMatrix[1][3]=0.0;modelMatrix[2][3]=0.0;modelMatrix[3][3]=1.0;
    vPosition = (modelMatrix * vec4(aPosition, 1.0)).xyz;
#ifdef WORLD
    vModel = modelMatrix;
#else
    vInvModel = inverse(modelMatrix);
#endif
    vThreshold = aModelMatrix[0][3];
    vUV = aUV;
    vColor = aColor;
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}