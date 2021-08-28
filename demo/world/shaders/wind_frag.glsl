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
    vec2 uv = vUV;

    float fade = smoothstep(1.0,0.5,abs(uv.y*2.-1.));
    vec2 uv0 = vec2(uv.x+uv.y,uv.x-uv.y);

    uv0 += 0.2*(1.-2.*fbm(uv * vec2(4.0,2.0), 4, vec2(4.0,2.0)));
    uv.x += 0.6*(1.-2.*fbm(uv0 * vec2(4.0,16.0), 4, vec2(4.0,16.0)));
    
    float offset = sin(uv.x*TAU);
    offset -= sin(uv0.y * TAU * 2.0);
    offset += cos(uv0.x * TAU * 1.0);
    float l = .5+.5*cos(uv0.y*TAU*4.0 + offset);
    l = mix(l, pow(l, 8.0), smoothstep(0.5,1.0,abs(uv.y*2.-1.)));

    vec3 color = smoothstep(0.1,1.0,l) * fade * vec3(0.14,0.08,0.2) / (.08+1.0-l);
    color *= color.r;
    float alpha = color.r;

    fragColor = vec4(color,alpha);
}