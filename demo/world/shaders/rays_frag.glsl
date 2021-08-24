#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
float hash12(in vec2 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    uvec2 v = floatBitsToUint(src);    
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float noise2D(in vec2 p, in vec2 period){
    vec4 i = floor(p).xyxy + vec4(0,0,1,1);
    vec2 f = fract(p);
	vec2 u = f*f*(3.0-2.0*f);
    i = mod(i, period.xyxy);
    return mix( mix( hash12(i.xy), 
                     hash12(i.zy), u.x),
                mix( hash12(i.xw), 
                     hash12(i.zw), u.x), u.y);
}
float fbm(in vec2 x, in int octaves, in vec2 period) {
	float v = 0.0, a = 1.0;
	vec2 shift = vec2(100);
    const mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for(int i = 0; i < octaves; ++i){
		v += 0.5 * a * noise2D(x / a, period * a);
        x += shift;
        shift = rot * shift;
		a *= 0.5;
	}
	return v;
}

void main(){
    vec2 uv = 2.*vUV-1.;

    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    vec2 period = vec2(1000,36);
    
    float f0 = 2.0*fbm(vec2(0.0, period.y*polar.y), 4, period);
    f0 += smoothstep(1.0, -1.0, polar.x - max(0.0,0.5-f0));
    float alpha = smoothstep(0.0, 1.0, f0 - 1.5*polar.x);
    
    fragColor = vec4(1) * alpha;
}