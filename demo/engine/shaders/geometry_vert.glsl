#version 300 es
precision highp float;
precision highp int;

layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
#ifdef SKINNING
layout(location=3) in vec4 aJoint;
layout(location=4) in vec4 aWeight;

uniform vec4 uBoneMatrix[64];

mat4 boneMatrix(uint joint){
    vec4 col0 = uBoneMatrix[joint*3U+0U];
    vec4 col1 = uBoneMatrix[joint*3U+1U];
    vec4 col2 = uBoneMatrix[joint*3U+2U];
    return mat4(col0[0], col1[0], col2[0], 0.0,
        col0[1], col1[1], col2[1], 0.0,
        col0[2], col1[2], col2[2], 0.0,
        col0[3], col1[3], col2[3], 1.0);
}
#endif

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform ModelUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uLayer;
    float uStartTime;
};

out vec3 vPosition;
out vec3 vNormal;
out vec2 vUV;

void main(){
#ifdef SKINNING
    mat4 skinMatrix =
        aWeight.x * boneMatrix(uint(aJoint.x)) +
        aWeight.y * boneMatrix(uint(aJoint.y)) +
        aWeight.z * boneMatrix(uint(aJoint.z)) +
        aWeight.w * boneMatrix(uint(aJoint.w));
    mat4 modelTransform = uModelMatrix * skinMatrix;
#else
    mat4 modelTransform = uModelMatrix;
#endif
    vPosition = (modelTransform * vec4(aPosition, 1.0)).xyz;
    vNormal = (modelTransform * vec4(aNormal, 0.0)).xyz;
    vUV = aUV;
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}