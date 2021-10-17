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

out vec3 vPosition;
out vec2 vLife;
out vec2 vUV;
out vec4 vUVClamp;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

#ifdef LUT
uniform sampler2D uAttributes;
vec4 lerpLUT(sampler2D texture, float u, int v){
    float width = float(textureSize(texture,0).x);
    ivec2 uv = ivec2(u * width, v);
    vec4 a = texelFetchOffset(texture,uv,0,ivec2(0,0));
    vec4 b = texelFetchOffset(texture,uv,0,ivec2(1,0));
    float f = fract(u * width);
    return mix(a, b, f);
}
#endif
uniform sampler2D uDisplacementMap;

float hash11(uint n){
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float(n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
#pragma import(./common/math.glsl)

void main(){
    float time = max(0.,uTime.x - aLifetime.x);
    float duration = aLifetime.w > 0. ? aLifetime.w : time+1.;
    float seed = aLifetime.z + 0.1 * floor(time / duration);
    time = min(mod(time, duration), aLifetime.y);
    vLife = vec2(time / aLifetime.y, seed);

    float size = mix(aSize.x, aSize.y, vLife.x);
#ifdef LUT
    float f = hash11(floatBitsToUint(seed));
    vec4 s0 = lerpLUT(uAttributes, vLife.x, 0);
    size *= mix(s0.x, s0.y, f);
#endif
    vec4 transform = aTransform + time * aVelocity + 0.5 * time * time * aAcceleration;
#ifdef VECTOR_FIELD
    transform.xyz += mix(s0.z,s0.w,f)*(-1.+2.*texture(uDisplacementMap, vec2(seed, vLife.x * 0.4)).rgb);
#endif
    vec3 position = vec3(rotate(transform.w) * aPosition.xy, aPosition.z);
    
#ifdef VIEWPLANE
    vec3 forward = -vec3(uViewMatrix[0][2], uViewMatrix[1][2], uViewMatrix[2][2]);
#else
    vec3 forward = normalize(transform.xyz - uEyePosition);
#endif

#if defined(SPHERICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
    position = size * (right * position.x + up * position.y);
#elif defined(ALIGNED)
    vec3 velocity = aVelocity.xyz + time * aAcceleration.xyz;

    vec3 direction = -normalize(velocity);
    vec3 up = cross(forward, direction);
    vec3 right = cross(forward, up);
    forward = cross(right, up);
    mat3 matrix = mat3(right, up, forward);
    position = size * matrix * position;
#endif
    vPosition = position + transform.xyz;

    vUVClamp = vec4(0,0,1,1);
    vUV = aUV;
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}