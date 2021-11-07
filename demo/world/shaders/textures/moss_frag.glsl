#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec2 uv, int octaves){	
	float a=.5,v=0.;
    const mat2 r = mat2(1.6,1.2,-1.2,1.6);
	for(int i=0;i<octaves;i++){
		v+=a*noise2D(uv);
		a*=.5; uv*=r;
	}
	return v;
}

uniform vec2 uTiles;
uniform vec4 uColor;

void main(){
    float seed = floor(vUV.x * uTiles.x) + floor(vUV.y * uTiles.y) * uTiles.x;
    vec2 uv = fract(vUV * uTiles)*2.-1.;
    
    float d0 = length(uv);
    float f0 = fbm(uv * 8.0+seed*184.32, 6);
    float f1 = fbm(uv * 16.0 + 4.0*(f0*2.-1.)+seed*928.19, 4);
    vec4 color = vec4(0);
    color += vec4(0.4,0.4,0.3,0.8) * smoothstep(-1.0,1.0,f0*f0-d0);
    color += vec4(0.5,0.4,0.2,0.8) * smoothstep(-0.5,0.8, f0 * f1 - d0);
    color -= vec4(0.3,0.3,0.2,0.0) * smoothstep(0.0,0.4,f0-d0);

    fragColor = uColor * color;
}