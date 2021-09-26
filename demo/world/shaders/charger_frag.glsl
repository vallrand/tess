#version 300 es
precision highp float;

in vec3 vPosition;
in mat4 vInvModel;
in vec4 vUV;
in vec4 vColor;
in float vThreshold;

uniform float uLayer;
uniform float uDissolveEdge;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;
uniform sampler2D uPositionBuffer;

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;

float hash21(in vec2 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    uvec2 v = floatBitsToUint(src);    
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float sdfBox(in vec2 p, in vec2 size){
    vec2 d = abs(p)-size;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float glow(in float distance){return pow(max(0.,0.02/abs(distance)-0.1),0.8);}

#define TAU 6.283185307179586
vec4 calcColor(in vec2 uv){
#ifdef POLAR
    uv = uv*2.-1.;
    uv = vec2(.5+atan(uv.y,uv.x)/TAU,length(uv));
    uv = vec2(uv.x + 0.06*uTime.x, uv.y);
#endif
    vec2 uv0 = uv*2.-1.;
    vec2 uv1 = vec2(round(uv0.x*4.)/4.,0);
    vec2 uv2 = round(uv0*8.)/8.;
#ifdef POLAR
    float t0 = smoothstep(1.0+uDissolveEdge, 1.0, abs(uv0.y-vThreshold));
    float t1 = smoothstep(1.0+uDissolveEdge, 1.0, abs(uv0.y-vThreshold));
    float t2 = smoothstep(1.0+uDissolveEdge, 1.0, abs(uv0.y-vThreshold));
#else
    float t0 = smoothstep(1.0+uDissolveEdge, 1.0, abs(abs(uv0.x)*2.-1.-vThreshold));
    float t1 = smoothstep(1.0+uDissolveEdge, 1.0, abs(abs(uv1.x)*2.-1.-vThreshold));
    float t2 = smoothstep(1.0+uDissolveEdge, 1.0, abs(abs(uv2.x)*2.-1.-vThreshold));
#endif

    uv0.y -= 0.4*(1.0-t2)*(1.-2.*hash21(round(uv0 * 8.0)));

    float d0 = sdfBox(uv1-uv0, vec2(0.3/4.,0.4)*t1);
    float d1 = abs(uv0.y)-0.6;
    float d2 = sdfBox(uv1-uv0, vec2(0.1/4.,0.2) * t1);

    vec4 color = vec4(0);
    color.rgb += vec3(0.4,0.1,0.16) * t0 * glow(d0);
    color.rgb += vec3(0.4,0.1,0.16) * t0 * glow(d1);
    color.rgb += vec3(0.4,0.1,0.16) * t0 * glow(d2);
    color.a = smoothstep(0.0,1.0,color.r);
    color.rgb = mix(color.rgb,color.gbr*2.,1.-t0);
#ifndef POLAR
    color *= smoothstep(1.,1.-0.25,abs(uv0.x));
#endif
    return min(color,vec4(1));
}

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 viewRay = vPosition.xyz - uEyePosition;
    vec4 worldPosition = texelFetch(uPositionBuffer, fragCoord, 0);
    if(worldPosition.a > uLayer) discard;
    vec4 objectPosition = vInvModel * vec4(worldPosition.xyz, 1.0);
    if(0.5 < abs(objectPosition.x) || 0.5 < abs(objectPosition.y) || 0.5 < abs(objectPosition.z)) discard;
    vec2 uv = mix(vUV.xy, vUV.zw, objectPosition.xz + 0.5);

    vec4 color = vColor * calcColor(uv);
    fragAlbedo = color;
    fragNormal = vec4(0,0,0,smoothstep(0.75,1.0,color.a));
}