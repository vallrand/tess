#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define LOG2 1.4426950408889634

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform sampler2D uSampler;
uniform sampler2D uBloomMap;
uniform sampler2D uPositionBuffer;
uniform vec4 uBloomMask;
#if defined(LINEAR_FOG)
uniform vec4 uFogColor;
uniform vec2 uFogRange;
#elif defined(EXPONENTIAL_FOG)
uniform vec4 uFogColor;
uniform float uFogDensity;
#endif

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(uSampler, fragCoord, 0);

    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);
    color = mix(color, uFogColor, step(position.a,.5));
    float distance = length(position.xyz - uEyePosition);
#if defined(LINEAR_FOG)
    float fogAmount = smoothstep(uFogRange.x, uFogRange.y, distance);
    color = mix(color, uFogColor, fogAmount);
#elif defined(EXPONENTIAL_FOG)
    float fogAmount = clamp(1. - exp2(-uFogDensity*uFogDensity * distance*distance * LOG2)),0.,1.);
    color = mix(color, uFogColor, fogAmount);
#endif

    vec4 bloom = uBloomMask * texture(uBloomMap, vUV);
    color += bloom;

    fragColor = color;
}