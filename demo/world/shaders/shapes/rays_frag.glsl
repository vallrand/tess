#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)
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

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;
    vec2 uvp = polar(uv);

#if defined(OUTER)
    float f0 = fbm(vec2(0.0, uvp.x), 4, vec2(1e3,36), 0.0);
    float y0 = mix(0.5,0.75,f0);
    float alpha = smoothstep(1.0-y0,0.0,abs(uvp.y-y0)) * f0 * 1.5;
#elif defined(INNER)
    float f0 = 3.0 * fbm(vec2(0.0, uvp.x), 4, vec2(1e3,48), 0.0);
    f0 = max(0.,mix(uvp.y - f0*f0, 1.2, uvp.y));
    float alpha = smoothstep(1.0,0.9,uvp.y) * f0;
    alpha = pow(alpha, 1.6);
#else
    float f0 = 2.0*fbm(vec2(0.0, uvp.x), 4, vec2(1e3,36), 0.0);
    f0 += smoothstep(1.0, -1.0, uvp.y - max(0.0,0.5-f0));
    float alpha = smoothstep(0.0, 1.0, f0 - 1.5*uvp.y);
#endif

    fragColor = uColor * alpha;
}