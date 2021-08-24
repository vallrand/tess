#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

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
float fbm(in vec3 uv, in int octaves, in vec3 period){
    float total = 0.0, amplitude = 1.0;
    for(int i = 0; i < octaves; i++){
        total += .5*amplitude*noise3D(uv, period);
        uv = uv*2.0 + 100.0 + uv.x;
        period *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

void main(){
    vec2 uv = vUV;
    vec3 scale = vec3(16.0, 4.0, 36.0);
    float f2 = fbm(uv.xyx*scale, 6, scale);
    scale = vec3(12.0, 8.0, 24.0);
    float f1 = fbm(uv.xyx*scale, 7, scale);

    float f0 = smoothstep(0.0,0.9,uv.y)*smoothstep(1.0,0.9,uv.y);

	fragColor = vec4(f0,f1,f2,1);
}