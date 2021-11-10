#version 300 es
precision highp float;

in vec3 vPosition;
#ifdef INSTANCED
in mat4 vInvModel;
in vec4 vUV;
in vec4 vColor;
in float vThreshold;
#else
uniform ModelUniforms {
    mat4 uModelMatrix;
    mat4 uInvModelMatrix;
    vec4 uColor;
    float uLayer;
};
#endif

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
#ifdef INSTANCED
uniform float uLayer;
uniform float uDissolveEdge;
#endif
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;
uniform sampler2D uPositionBuffer;

#define TAU 6.283185307179586