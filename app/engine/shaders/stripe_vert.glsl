#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aLifetime;
layout(location=1) in vec4 aSize;
layout(location=2) in vec4 aTransform;
layout(location=3) in vec4 aVelocity;
layout(location=4) in vec4 aAcceleration;

layout(location=5) in vec3 aPosition;
layout(location=6) in vec2 aUV;

out vec2 vUV;
out vec2 vLife;
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
    float time = uTime.x - aLifetime.x + aPosition.y * aTransform.w;
    time = (time - aTransform.w) * (aLifetime.y + aTransform.w) / aLifetime.y;
    time = clamp(time, 0.0, aLifetime.y);
    vLife = vec2(time / aLifetime.y, aLifetime.z);

    float size = mix(aSize.x, aSize.y, vLife.x);

    vec3 position = aTransform.xyz + time * aVelocity.xyz + 0.5 * time * time * aAcceleration.xyz;
    vec3 direction = normalize(aVelocity.xyz + time * aAcceleration.xyz);
    vec3 front = -vec3(uViewMatrix[0][2], uViewMatrix[1][2], uViewMatrix[2][2]);
    position = position + size * cross(front, direction) * aPosition.x;

    vUV = aUV;
    vPosition = position;
    gl_Position = uViewProjectionMatrix * vec4(position, 1.0);
}