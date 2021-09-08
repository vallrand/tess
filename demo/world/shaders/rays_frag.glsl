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
float fbmRidge(in vec2 p, in vec2 period, int octaves){	
	float z=.5;
	float rz= 0.;
	for(int i=1;i<octaves;i++){
		rz += z * abs(noise2D(p * period, period)*2.-1.);
		z*=.5;
        period*=2.;
	}
	return rz;
}
vec2 polar(in vec2 uv){return vec2(atan(uv.y,uv.x)/TAU+0.5,length(uv));}
vec2 cartesian(in vec2 uv){float a=(uv.x-0.5)*TAU;return vec2(cos(a),sin(a))*uv.y;}
mat2 rotate(in float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}

void main(){
    vec2 uv = 2.*vUV-1.;
    
#if defined(RING)
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    vec2 period = vec2(1000,36);
    float f0 = fbm(vec2(0.0, period.y*polar.y), 4, period);
    float y0 = mix(0.5,0.75,f0);
    float alpha = smoothstep(1.0-y0,0.0,abs(polar.x-y0)) * f0 * 1.5;
#elif defined(BEAM)
    float f0 = fbm(vec2(0.0, uv.y*4.0), 8, vec2(4.0));
    float f1 = fbm(vec2(0.0, uv.y*16.0), 4, vec2(32.0));
    float alpha = smoothstep(1.0,mix(0.9,-2.0,f0),uv.x - 0.2*f1 + 2.0*pow(abs(uv.y),2.0)) * pow(1.0-abs(uv.y),2.0);
#elif defined(CONE)
    float angle = abs(atan(uv.y,uv.x+1.0)/TAU);
    alpha += 0.5 * smoothstep(0.3,0.2,angle) * smoothstep(1.0,0.0,uv.x+2.0*abs(uv.y));
#elif defined(SWIRL)
    vec2 uvp = polar(uv);
    
    float r0 = fbmRidge(uvp,vec2(1,2),4);
    uvp.x += 1.0 * r0;
    uv = cartesian(uvp);

    vec2 basis = vec2(fbmRidge(uv-0.1,vec2(2),4), fbmRidge(uv+0.1,vec2(2),4));
    uv += (basis-.5);
    float f0 = fbmRidge(uv*rotate(basis.x - basis.y), vec2(2),4);
    
    f0 *= abs(uvp.y-0.5)*2.;
    f0 = mix(0.01 / f0, 0.1 / f0, f0);
    f0 *= smoothstep(1.0,0.5,uvp.y);
    float alpha = f0;
#elif defined(CRACKS)
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    polar.y += 0.08*(1.-2.*noise2D(polar*vec2(4,8)+12.4, vec2(4,8)));
    float width = pow(mix(1.2,0.0,polar.x),4.0);
    float f0 = smoothstep(1.0-width,1.0,.5+.5*cos(polar.y*TAU*12.0));
    f0 = max(1.2*f0, 1.4*fbm(vec2(64.0, 48.*polar.y), 4, vec2(1e3,48)));
    float alpha = smoothstep(0.0, 1.0, f0 - polar.x);
#else
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    vec2 period = vec2(1000,36);
    float f0 = 2.0*fbm(vec2(0.0, period.y*polar.y), 4, period);
    f0 += smoothstep(1.0, -1.0, polar.x - max(0.0,0.5-f0));
    float alpha = smoothstep(0.0, 1.0, f0 - 1.5*polar.x);
#endif
    
    fragColor = vec4(1) * alpha;
}