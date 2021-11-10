#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
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
#if defined(WRAP)
    float f0 = smoothstep(0.2,1.0,fbm(vec2(0.0, uv.x), 4, vec2(1e3,12),0.0));
    float f1 = smoothstep(0.2,1.0,fbm(vec2(0.1, uv.x), 4, vec2(1e3,8),0.0));
    float alpha = 0.5 * smoothstep(0.0, 1.0, 1.5*f0 + uv.y);
    alpha += 0.5 * smoothstep(0.0, 1.0,f1*f1 + uv.y);
#elif defined(GROUND)
    float f0 = fbm(uv,8,vec2(3,6),0.0);
    float f1 = fbm(uv + 0.3*f0,4,vec2(4,8),0.0);
    float alpha = smoothstep(1.0,mix(0.0,-4.0,f1),uv.x -f0 + 2.0*pow(abs(uv.y),2.0));
    float angle = abs(atan(uv.y,uv.x+1.5)/TAU);
    alpha *= smoothstep(0.2,0.0,angle) * smoothstep(-1.0,-0.5,uv.x);
#else
    float f0 = fbm(vec2(0.0, uv.y), 8, vec2(4.0), 0.0);
    float f1 = fbm(vec2(0.0, uv.y), 4, vec2(16.0), 0.0);
    float alpha = smoothstep(1.0,mix(0.9,-2.0,f0),uv.x - 0.2*f1 + 2.0*pow(abs(uv.y),2.0)) * pow(1.0-abs(uv.y),2.0);
#endif
    
    fragColor = uColor * alpha;
}