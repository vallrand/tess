#define TAU 6.283185307179586
float hash11(in float v){
    uint q = floatBitsToUint(v);
	uvec2 n = q * uvec2(1597334673U, 3812015801U);
	q = (n.x ^ n.y) * 1597334673U;
	return float(q) * (1.0 / float(0xffffffffU));
}
float hash21(in vec2 v){
    uvec2 q = floatBitsToUint(v);
	q *= uvec2(1597334673U, 3812015801U);
	uint n = (q.x ^ q.y) * 1597334673U;
	return float(n) * (1.0 / float(0xffffffffU));
}
float hash31(in vec3 v){
    uvec3 q = floatBitsToUint(v);
	q *= uvec3(1597334673U, 3812015801U, 2798796415U);
	uint n = (q.x ^ q.y ^ q.z) * 1597334673U;
	return float(n) * (1.0 / float(0xffffffffU));
}
vec2 hash12(in float v){
    uint q = floatBitsToUint(v);
	uvec2 n = q * uvec2(1597334673U, 3812015801U);
	n = (n.x ^ n.y) * uvec2(1597334673U, 3812015801U);
	return vec2(n) * (1.0 / float(0xffffffffU));
}
vec2 hash22(in vec2 v){
    uvec2 q = floatBitsToUint(v);
	q *= uvec2(1597334673U, 3812015801U);
	q = (q.x ^ q.y) * uvec2(1597334673U, 3812015801U);
	return vec2(q) * (1.0 / float(0xffffffffU));
}
vec2 hash32(in vec3 v){
    uvec3 q = floatBitsToUint(v);
	q *= uvec3(1597334673U, 3812015801U, 2798796415U);
	uvec2 n = (q.x ^ q.y ^ q.z) * uvec2(1597334673U, 3812015801U);
	return vec2(n) * (1.0 / float(0xffffffffU));
}
vec3 hash13(in float v){
    uint q = floatBitsToUint(v);
	uvec3 n = q * uvec3(1597334673U, 3812015801U, 2798796415U);
	n = (n.x ^ n.y ^ n.z) * uvec3(1597334673U, 3812015801U, 2798796415U);
	return vec3(n) * (1.0 / float(0xffffffffU));
}
vec3 hash23(in vec2 v){
    uvec2 q = floatBitsToUint(v);
	uvec3 n = q.xyx * uvec3(1597334673U, 3812015801U, 2798796415U);
	n = (n.x ^ n.y ^n.z) * uvec3(1597334673U, 3812015801U, 2798796415U);
	return vec3(n) * (1.0 / float(0xffffffffU));
}
vec3 hash33(in vec3 v){
    uvec3 q = floatBitsToUint(v);
	q *= uvec3(1597334673U, 3812015801U, 2798796415U);
	q = (q.x ^ q.y ^ q.z)*uvec3(1597334673U, 3812015801U, 2798796415U);
	return vec3(q) * (1.0 / float(0xffffffffU));
}

float hash11(uint n){
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float(n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
vec2 hash22(uvec2 x){
    x = 1103515245U*((x >> 1U)^(x.yx));
    uint h32 = 1103515245U*((x.x)^(x.y>>3U));
    h32 = h32^(h32 >> 16);
    uvec2 rz = uvec2(h32, h32*48271U);
    return vec2((rz.xy >> 1) & uvec2(0x7fffffffU))/float(0x7fffffff);
}

float noise1D(in float v, in float period){
    float i = floor(v);
    float f = fract(v); f = f*f*(3.0-2.0*f);
    return mix(hash11(mod(i,period)), hash11(mod(i+1.,period)), f);
}
float noise2D(in vec2 v){
    vec4 i = floor(v).xyxy + vec2(0,1).xxyy;
    vec2 f = fract(v); f = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i.xy), hash21(i.zy), f.x),
            mix(hash21(i.xw), hash21(i.zw), f.x), f.y);
}
float noise2D(in vec2 v, in vec2 period){
    vec4 i = floor(v).xyxy + vec2(0,1).xxyy;
    vec2 f = fract(v); f = f*f*(3.0-2.0*f);
    i = mod(i, period.xyxy);
    return mix(mix(hash21(i.xy), hash21(i.zy), f.x),
            mix(hash21(i.xw), hash21(i.zw), f.x), f.y);
}
float noise3D(in vec3 v){
    vec3 i = floor(v);
    vec3 f = fract(v); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash31(i+vec3(0,0,0)), hash31(i+vec3(1,0,0)),f.x),
            mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)),f.x),
                mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float noise3D(in vec3 uv, in vec3 period){
    vec3 i0 = floor(mod(uv, period));
    vec3 i1 = floor(mod(uv+vec3(1), period));
    vec3 f = fract(uv); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash31(vec3(i0.x,i0.y,i0.z)), hash31(vec3(i1.x,i0.y,i0.z)),f.x),
                mix(hash31(vec3(i0.x,i1.y,i0.z)), hash31(vec3(i1.x,i1.y,i0.z)),f.x),f.y),
            mix(mix(hash31(vec3(i0.x,i0.y,i1.z)), hash31(vec3(i1.x,i0.y,i1.z)),f.x),
                mix(hash31(vec3(i0.x,i1.y,i1.z)), hash31(vec3(i1.x,i1.y,i1.z)),f.x),f.y),f.z);
}