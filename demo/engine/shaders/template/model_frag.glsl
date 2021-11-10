#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;

in vec2 vUV;
in vec3 vPosition;
in vec3 vNormal;
#ifdef VERTEX_COLOR
in vec4 vColor;
#endif
#ifdef TRANSPARENT
in vec4 vColor;
in float vMaterial;
layout(location=0) out vec4 fragColor;
#else
layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragPosition;
#endif

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
#ifndef TRANSPARENT
uniform ModelUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uLayer;
    float uStartTime;
};
#endif

#define TAU 6.283185307179586