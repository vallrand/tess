#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aTransform;
layout(location=1) in vec4 aVelocity;
layout(location=2) in vec4 aAcceleration;
layout(location=3) in vec3 aLifetime;
layout(location=4) in vec2 aSize;
#ifndef POINT
layout(location=5) in vec3 aPosition;
layout(location=6) in vec2 aUV;
out vec2 vUV;
#endif

out vec2 vLife;
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
    vLife = vec2(clamp(aLifetime.x * aLifetime.y, 0.0, 1.0), aLifetime.z);
    float size = aSize.y * step(0.,aLifetime.x)*step(aLifetime.x*aLifetime.y,1.);

#ifdef POINT
    gl_PointSize = size;
    vPosition = aTransform.xyz;
#else
    vec3 position = vec3(rotate(aTransform.w) * aPosition.xy, aPosition.z);
#if defined(ALIGNED)
    vec3 view = normalize(aTransform.xyz - uEyePosition);
    vec3 direction = -normalize(aVelocity.xyz);
    vec3 up = cross(view, direction);
    vec3 right = cross(view, up);
    view = cross(right, up);
    mat3 matrix = mat3(right, up, view);
    position = size * matrix * position;
#ifdef STRETCH
    position += dot(position, aVelocity.xyz) * aVelocity.xyz * STRETCH;
#endif

#elif defined(CYLINDRICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(0,1,0);
    position = size * (right * position.x + up * position.y);
#elif defined(SPHERICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
    position = size * (right * position.x + up * position.y);
#ifdef STRETCH
    vec3 viewVelocity = (uViewMatrix * vec4(aVelocity.xyz,0.0)).xyz;
    position += dot(position, aVelocity.xyz) * aVelocity.xyz * STRETCH;
#endif

#endif
    vPosition = position + aTransform.xyz;
    vUV = aUV;
#endif
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}