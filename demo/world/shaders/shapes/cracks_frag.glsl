#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)
#pragma import(../../../engine/shaders/common/normalmap.glsl)
#pragma import(../../../engine/shaders/common/murmur.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

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

void main(){
    vec2 uv = 2.*vUV-1.;
    
    vec2 uvp = polar(uv);
    uvp.x += 0.08*(1.-2.*noise2D(uvp.yx*vec2(4,8)+12.4, vec2(4,8),0.0));
    float width = pow(mix(1.2,0.0,uvp.y),4.0);
    float f0 = smoothstep(1.0-width,1.0,.5+.5*cos(uvp.x*TAU*12.0));
    f0 = max(1.2*f0, 1.4*fbm(vec2(64.0, uvp.x), 4, vec2(1e3,48),0.0));
    float alpha = smoothstep(0.0, 1.0, f0 - uvp.y);
#ifdef NORMAL_MAP
    float height = alpha * -12.8;
    fragColor = vec4(encodeNormal(height, smoothstep(0.0,0.8,alpha)), alpha);
#else
    fragColor = vec4(1) * alpha;
#endif
}