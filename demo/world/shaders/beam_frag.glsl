#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vDomain;
in float vMaterial;
out vec4 fragColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform sampler2D uSampler;

#define TAU 6.283185307179586
float hash13(in vec3 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    uvec3 v = floatBitsToUint(src);
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y; h *= M; h ^= v.z;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float noise3D(in vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix( hash13(i+vec3(0,0,0)), 
                        hash13(i+vec3(1,0,0)),f.x),
                   mix( hash13(i+vec3(0,1,0)), 
                        hash13(i+vec3(1,1,0)),f.x),f.y),
               mix(mix( hash13(i+vec3(0,0,1)), 
                        hash13(i+vec3(1,0,1)),f.x),
                   mix( hash13(i+vec3(0,1,1)), 
                        hash13(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float noise3D(in vec3 uv, in vec3 period){
    vec3 i0 = floor(mod(uv, period));
    vec3 i1 = floor(mod(uv+vec3(1), period));
    vec3 f = fract(uv); f = f*f*(3.0-2.0*f);
    return mix(mix(mix( hash13(vec3(i0.x,i0.y,i0.z)), 
                        hash13(vec3(i1.x,i0.y,i0.z)),f.x),
                   mix( hash13(vec3(i0.x,i1.y,i0.z)), 
                        hash13(vec3(i1.x,i1.y,i0.z)),f.x),f.y),
               mix(mix( hash13(vec3(i0.x,i0.y,i1.z)), 
                        hash13(vec3(i1.x,i0.y,i1.z)),f.x),
                   mix( hash13(vec3(i0.x,i1.y,i1.z)), 
                        hash13(vec3(i1.x,i1.y,i1.z)),f.x),f.y),f.z);
}
float fbm(in vec3 uv, in int octaves){
    float total = 0.0, amplitude = 1.0;
    const mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
    for(int i = 0; i < octaves; i++){
        total += .5*amplitude*noise3D(uv);
        uv.xy = r * uv.xy + 100.0;
        amplitude *= 0.5;
    }
    return total;
}
float fbm(in vec3 uv, in int octaves, in vec3 period){
    float total = 0.0, amplitude = 1.0;
    for(int i = 0; i < octaves; i++){
        total += .5*amplitude*noise3D(uv, period);
        uv = 2.0 * uv + 100.0;
        period *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

void main(){
    vec2 uv = 2.*vUV-1.;
    float time = 4.0*uTime.x;
#ifndef RADIAL
    float fade = smoothstep(1.0, 0.8, abs(uv.x));
    float f0 = 1.-2.*fbm(vec3(vDomain.xy * uv + vec2(time,0), -.5*time), 4);
    f0 *= 1.-2.*noise3D(vec3(vDomain.xy * uv,f0)*vec3(2,0.25,3)+vec3(time,0,time));
    float d0 = abs(uv.y+0.5*f0);
#else
    float fade = 1.0;
    uv = vec2(atan(uv.y,uv.x)/TAU+.5, length(uv));
    float f0 = 1.-2.*fbm(vec3(vDomain.xy * uv.xy + vec2(0,-time),-.5*time), 4, vec3(vDomain.xy,10));
    float d0 = abs(uv.y+0.5*f0)-0.5*smoothstep(0.1,.0,uv.y);
#endif

    vec4 color = texture(uSampler, vec2(smoothstep(1.0,-0.25,d0), 0.0));
    fragColor = vColor * color * fade;
}