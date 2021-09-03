#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aLifetime;
layout(location=1) in vec4 aSize;
layout(location=2) in vec4 aTransform;
layout(location=3) in vec4 aVelocity;
layout(location=4) in vec4 aAcceleration;
#ifndef POINT
layout(location=5) in vec3 aPosition;
layout(location=6) in vec2 aUV;
out vec2 vUV;
out vec4 vUVClamp;
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
#ifdef VIEWPLANE
    vec3 forward = -vec3(uViewMatrix[0][2], uViewMatrix[1][2], uViewMatrix[2][2]);
#else
    vec3 forward = normalize(aTransform.xyz - uEyePosition);
#endif

#if defined(ALIGNED)
    vec3 direction = -normalize(aVelocity.xyz);
    vec3 up = cross(forward, direction);
    vec3 right = cross(forward, up);
    forward = cross(right, up);
    mat3 matrix = mat3(right, up, forward);
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

#else
    position = size * position.xzy * vec3(1,1,-1);
#endif
    vPosition = position + aTransform.xyz;
#ifdef FRAMES
    float uvSize = 1.0/aSize.w; float uvFrame = mod(floor(aSize.z),aSize.w*aSize.w);
    vec2 uvTile = vec2(mod(uvFrame, aSize.w), floor(uvFrame * uvSize)) * uvSize;
    vUVClamp = vec4(uvTile, uvTile + uvSize);
    vUV = uvTile + uvSize * aUV;
#else
    vUV = aUV;
    vUVClamp = vec4(0,0,1,1);
#endif
#endif
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}