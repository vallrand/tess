#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aLifetime;
layout(location=1) in vec4 aSize;
layout(location=2) in vec4 aTransform;
#ifndef POINT
layout(location=3) in vec3 aPosition;
layout(location=4) in vec2 aUV;
#endif

out vec2 vUV;
out vec3 vNormal;
out vec3 vPosition;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

void main(){
#ifdef VIEWPLANE
    vec3 forward = -vec3(uViewMatrix[0][2], uViewMatrix[1][2], uViewMatrix[2][2]);
#else
    vec3 forward = normalize(aTransform.xyz - uEyePosition);
#endif
    const vec3 up = vec3(0,1,0);
    const vec3 wind = normalize(vec3(1,0,0.4));
    vec3 right = cross(forward, up);

    vec3 position = aSize.x * (right * aPosition.y + up * aPosition.x);
    position += wind * aUV.x * 0.2*sin(2.0*uTime.x + dot(aTransform.xyz, wind));

#ifdef FRAMES
    float uvSize = 1.0/aSize.w; float uvFrame = mod(floor(aLifetime.z * aSize.w * aSize.w),aSize.w*aSize.w);
    vec2 uvTile = vec2(mod(uvFrame, aSize.w), floor(uvFrame * uvSize)) * uvSize;
    vUV = uvTile + uvSize * aUV;
#else
    vUV = aUV;
#endif
    vPosition = position + aTransform.xyz;
    vNormal = normalize(-cross(up, right));
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}