#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aTransform;
layout(location=1) in vec4 aVelocity;
layout(location=2) in vec4 aAcceleration;
layout(location=3) in vec2 aLifetime;
layout(location=4) in vec2 aSize;
#ifndef POINT
layout(location=5) in vec3 aPosition;
layout(location=6) in vec2 aUV;
out vec2 vUV;
#endif

out float vLife;
out vec3 vPosition;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

mat2 rotate(in float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}

void main(){
    vLife = clamp(aLifetime.x / aLifetime.y, 0.0, 1.0);
    float size = mix(aSize.x, aSize.y, vLife);
    size *= step(0.,aLifetime.x)*step(aLifetime.x,aLifetime.y);

#ifdef POINT
    gl_PointSize = size;
    vec3 position = aTransform.xyz;
#else
    vec3 position = vec3(rotate(aTransform.w) * aPosition.xy, aPosition.z);
#if defined(CYLINDRICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(0,1,0);
    position = right * position.x + up * position.y;
#elif defined(SPHERICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
    position = right * position.x + up * position.y;
#endif
    position = position * size + aTransform.xyz;
    vUV = aUV;
#endif
    vPosition = position;
    gl_Position = uViewProjectionMatrix * vec4(position, 1.0);
}