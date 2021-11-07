#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)
#pragma import(../../../engine/shaders/common/murmur.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec2 p, in vec2 period, int octaves, float seed){	
	float a=.5,v=0.;
	for(int i=1;i<octaves;i++){
		v += a*abs(noise2D(p * period, period, seed)*2.-1.);
		a*=.5; period*=2.;
	}
	return v;
}

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;
    vec2 uvp = polar(uv);
    
    float r0 = fbm(uvp,vec2(1,2),4,0.0);
    uvp.x += 1.0 * r0;
    uv = cartesian(uvp);

    vec2 basis = vec2(fbm(uv-0.1,vec2(2),4,0.0), fbm(uv+0.1,vec2(2),4,0.0));
    uv += (basis-.5);
    float f0 = fbm(uv*rotate(basis.x - basis.y), vec2(2),4,0.0);
    
    f0 *= abs(uvp.y-0.5)*2.;
    f0 = mix(0.01 / f0, 0.1 / f0, f0);
    f0 *= smoothstep(1.0,0.5,uvp.y);
    float alpha = f0;
    
    fragColor = uColor * alpha;
}