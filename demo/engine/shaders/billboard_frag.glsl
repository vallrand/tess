#version 300 es
precision highp float;

#ifndef POINT
in vec2 vUV;
in vec4 vUVClamp;
#endif
in vec2 vLife;
in vec3 vPosition;

out vec4 fragColor;

uniform sampler2D uSampler;
uniform sampler2D uGradient;

uniform GlobalUniforms {
    vec4 uTime;
};
#ifdef SOFT
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform sampler2D uPositionBuffer;
#endif

void main(void){
#ifdef POINT
    vec2 uv = gl_PointCoord;
    const vec4 vUVClamp = vec4(0,0,1,1);
#else
    vec2 uv = vUV;
#endif

#ifdef UV_OFFSET
    float offsetScale = UV_OFFSET;
    vec4 color = texture(uSampler, uv - offsetScale * uTime.x + vLife.y);
    color *= 4.0 * texture(uSampler, 2.0 * uv + 2.0 * offsetScale * uTime.x + vLife.y);
#else
    vec4 color = texture(uSampler, uv);
#endif

#if defined(GRADIENT)
    color = texture(uGradient, vec2(vLife.x, color.a));
#elif defined(SWIPE)
    vec2 uv0 = (uv - vUVClamp.xy) / (vUVClamp.zw - vUVClamp.xy);
    color *= smoothstep(0.5+SWIPE,0.5,abs(uv0.x-.5 + mix(-1.0,1.0,vLife.x)));
#else
    color *= 4.*vLife.x*(1.-vLife.x);
#endif
#ifdef MASK
    color *= smoothstep(1.0,0.5,length(2.*uv-1.));
#endif

#ifdef SOFT
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);
    float difference = length(position.xyz) - length(vPosition - uEyePosition);
    color.a *= smoothstep(0.0, 0.5, difference);
#endif
    fragColor = color;
}