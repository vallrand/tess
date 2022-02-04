#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/murmur.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec2 uv, in int octaves, in vec2 period, float seed) {
	float v = 0.0, a = 1.0;
	vec2 shift = vec2(100);
    const mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for(int i = 0; i < octaves; ++i){
		v += 0.5 * a * noise2D(uv * period, period, seed);
        uv += shift;
        shift = rot * shift;
		a *= 0.5;
        period *= 2.0;
	}
	return v;
}

uniform vec2 uTiles;
uniform vec4 uColor;

void main(){
    float seed = floor(vUV.x * uTiles.x) + floor(vUV.y * uTiles.y) * uTiles.x;
    vec2 uv = fract(vUV * uTiles)*2.-1.;
    
    uv.x = pow(.5+.5*uv.x,0.5)*2.-1.; uv.y *= 0.8;
    float f0 = fbm(uv,4,vec2(2,4),seed);
    float f1 = fbm(uv + 0.5*f0,2,vec2(2,6),seed);
    float alpha = smoothstep(0.0,-4.*f1,1.2*uv.x+f0-2.0*(1.0-abs(uv.y)));
    alpha *= smoothstep(1.6,0.8,-uv.x + f1 + 2.0*abs(uv.y));

    fragColor = uColor * alpha;
}