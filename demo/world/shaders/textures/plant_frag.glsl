#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec2 uv, int octaves){	
	float a=.5,v=0.;
	for(int i=0;i<octaves;i++){
        float r = noise2D(uv);
		v+=a*abs(r*2.-1.);
		a*=.5;uv=uv*2.+r+100.;
	}
	return v;
}

uniform vec2 uTiles;
uniform vec4 uColor;

void main(){
#ifdef TILED
    float seed = floor(vUV.x * uTiles.x) + floor(vUV.y * uTiles.y) * uTiles.x;
    vec2 uv = fract(vUV * uTiles)*2.-1.;
#else
    float seed = 0.0;
    vec2 uv = 2.*vUV-1.;
#endif
    
    uv = uv*.5+.5;
    float f0 = .5-fbm(uv*vec2(4,8)+seed*184.32, 4);
    float f1 = .5-fbm(uv*vec2(6,12)+f0+seed*928.19, 2);
    float alpha = smoothstep(-0.8,0.4, f0-abs(uv.y*2.-1.));
    alpha *= smoothstep(0.2,1.0,f1+1.0-uv.x);
    alpha *= smoothstep(0.0,0.2,pow(uv.x,0.6)-abs(uv.y-.5));
    vec4 color = vec4(1.4*alpha,1.0*alpha*alpha,2.0*alpha*f0,alpha);
    color.rgb = .2+saturation(color.rgb, f1);

    fragColor = uColor * color;
}