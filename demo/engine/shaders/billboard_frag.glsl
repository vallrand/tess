#version 300 es
precision highp float;

#ifndef POINT
in vec2 vUV;
#endif
in float vLife;
in vec3 vPosition;

out vec4 fragColor;

uniform sampler2D uSampler;
uniform sampler2D uGradient;

#ifdef SOFT
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform sampler2D uPositionBuffer;
#endif

void main(void){
#ifdef POINT
    vec2 uv = gl_PointCoord;
#else
    vec2 uv = vUV;
#endif
    vec4 mask = texture(uSampler, uv);
    vec4 color = texture(uGradient, vec2(vLife, mask.a));
#ifdef MASK
    color.a *= smoothstep(1.0,0.5,length(2.*uv-1.));
#endif

#ifdef SOFT
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);
    float difference = length(position.xyz - uEyePosition) - length(vPosition - uEyePosition);
    color.a *= smoothstep(0.0, 0.5, difference);
#endif
    fragColor = color;
}