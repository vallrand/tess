#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
float hash21(in vec2 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    uvec2 v = floatBitsToUint(src);    
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float noise2D(in vec2 uv, in vec2 period, float seed){
    //uv *= period;
    vec4 i = mod(floor(uv).xyxy+vec2(0,1).xxyy,period.xyxy)+seed;
    vec2 f = fract(uv); f = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i.xy), 
                   hash21(i.zy), f.x),
               mix(hash21(i.xw), 
                   hash21(i.zw), f.x), f.y);
}
float fbm(in vec2 x, in int octaves, in vec2 period, float seed) {
	float v = 0.0, a = 1.0;
	vec2 shift = vec2(100);
    const mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for(int i = 0; i < octaves; ++i){
		v += 0.5 * a * noise2D(x * period, period,seed);
        x += shift;
        shift = rot * shift;
		a *= 0.5;
        period *= 2.0;
	}
	return v;
}
float fbmRidge(in vec2 p, in vec2 period, int octaves, float seed){	
	float z=.5;
	float rz= 0.;
	for(int i=1;i<octaves;i++){
		rz += z * abs(noise2D(p * period, period,seed)*2.-1.);
		z*=.5;
        period*=2.;
	}
	return rz;
}
vec2 polar(in vec2 uv){return vec2(atan(uv.y,uv.x)/TAU+0.5,length(uv));}
vec2 cartesian(in vec2 uv){float a=(uv.x-0.5)*TAU;return vec2(cos(a),sin(a))*uv.y;}
mat2 rotate(in float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}

uniform vec2 uTiles;

void main(){
#ifdef TILED
    float seed = floor(vUV.x * uTiles.x) + floor(vUV.y * uTiles.y) * uTiles.x;
    vec2 uv = fract(vUV * uTiles)*2.-1.;
#else
    float seed = 0.0;
    vec2 uv = 2.*vUV-1.;
#endif
    
#if defined(RING)
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    float f0 = fbm(vec2(0.0, polar.y), 4, vec2(1e3,36), seed);
    float y0 = mix(0.5,0.75,f0);
    float alpha = smoothstep(1.0-y0,0.0,abs(polar.x-y0)) * f0 * 1.5;
#elif defined(INNER)
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    float f0 = 3.0 * fbm(vec2(0.0, polar.y), 4, vec2(1e3,48), seed);
    f0 = max(0.,mix(polar.x - f0*f0, 1.2, polar.x));
    float alpha = smoothstep(1.0,0.9,polar.x) * f0;
    alpha = pow(alpha, 1.6);
#elif defined(BEAM)
    float f0 = fbm(vec2(0.0, uv.y), 8, vec2(4.0), seed);
    float f1 = fbm(vec2(0.0, uv.y), 4, vec2(16.0), seed);
    float alpha = smoothstep(1.0,mix(0.9,-2.0,f0),uv.x - 0.2*f1 + 2.0*pow(abs(uv.y),2.0)) * pow(1.0-abs(uv.y),2.0);
#elif defined(CONE)
    float angle = abs(atan(uv.y,uv.x+1.0)/TAU);
    alpha += 0.5 * smoothstep(0.3,0.2,angle) * smoothstep(1.0,0.0,uv.x+2.0*abs(uv.y));
#elif defined(SWIRL)
    vec2 uvp = polar(uv);
    
    float r0 = fbmRidge(uvp,vec2(1,2),4,seed);
    uvp.x += 1.0 * r0;
    uv = cartesian(uvp);

    vec2 basis = vec2(fbmRidge(uv-0.1,vec2(2),4,seed), fbmRidge(uv+0.1,vec2(2),4,seed));
    uv += (basis-.5);
    float f0 = fbmRidge(uv*rotate(basis.x - basis.y), vec2(2),4,seed);
    
    f0 *= abs(uvp.y-0.5)*2.;
    f0 = mix(0.01 / f0, 0.1 / f0, f0);
    f0 *= smoothstep(1.0,0.5,uvp.y);
    float alpha = f0;
#elif defined(CRACKS)
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    polar.y += 0.08*(1.-2.*noise2D(polar*vec2(4,8)+12.4, vec2(4,8),seed));
    float width = pow(mix(1.2,0.0,polar.x),4.0);
    float f0 = smoothstep(1.0-width,1.0,.5+.5*cos(polar.y*TAU*12.0));
    f0 = max(1.2*f0, 1.4*fbm(vec2(64.0, polar.y), 4, vec2(1e3,48),seed));
    float alpha = smoothstep(0.0, 1.0, f0 - polar.x);
#elif defined(GROUND)
    float f0 = fbm(uv,8,vec2(3,6),seed);
    float f1 = fbm(uv + 0.3*f0,4,vec2(4,8),seed);
    float alpha = smoothstep(1.0,mix(0.0,-4.0,f1),uv.x -f0 + 2.0*pow(abs(uv.y),2.0));
    float angle = abs(atan(uv.y,uv.x+1.5)/TAU);
    alpha *= smoothstep(0.2,0.0,angle) * smoothstep(-1.0,-0.5,uv.x);
#elif defined(SPIKE)
    uv.x = pow(.5+.5*uv.x,0.5)*2.-1.; uv.y *= 0.8;
    float f0 = fbm(uv,4,vec2(2,4),seed);
    float f1 = fbm(uv + 0.5*f0,2,vec2(2,6),seed);
    float alpha = smoothstep(0.0,-4.*f1,1.2*uv.x+f0-2.0*(1.0-abs(uv.y)));
    alpha *= smoothstep(1.6,0.8,-uv.x + f1 + 2.0*abs(uv.y));
#elif defined(WRAP)
    float f0 = smoothstep(0.2,1.0,fbm(vec2(0.0, uv.x), 4, vec2(1e3,12),seed));
    float f1 = smoothstep(0.2,1.0,fbm(vec2(0.1, uv.x), 4, vec2(1e3,8),seed));
    float alpha = 0.5 * smoothstep(0.0, 1.0, 1.5*f0 + uv.y);
    alpha += 0.5 * smoothstep(0.0, 1.0,f1*f1 + uv.y);
#else
    vec2 polar = vec2(length(uv), 0.5 + atan(uv.y, uv.x) / TAU);
    float f0 = 2.0*fbm(vec2(0.0, polar.y), 4, vec2(1e3,36),seed);
    f0 += smoothstep(1.0, -1.0, polar.x - max(0.0,0.5-f0));
    float alpha = smoothstep(0.0, 1.0, f0 - 1.5*polar.x);
#endif
    
    fragColor = vec4(1) * alpha;
}