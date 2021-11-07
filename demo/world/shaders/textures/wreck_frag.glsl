#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec2 uv, in int octaves, in vec2 period){
    float value=0.0,amplitude=0.5;
    for(int i=0;i<octaves;i++){
        value += amplitude * noise2D(uv * period, period, 0.0);
        amplitude*=0.5;
        period*=2.0;
    }
    return value;
}

uniform vec2 uScale;
uniform vec4 uColor;

void main(){
    vec2 uv = vUV;
	float f0 = fbm(uv, 4, 18.0*uScale);
    float f1 = fbm(uv + vec2(f0*2.-1.,0), 4, 12.0*uScale);
    
    vec3 color = vec3(0.7,0.65,0.6);
    color = mix(color, vec3(0.2,0.1,0.1), f0);
    color = mix(2.0 * color * color, vec3(0), f1);
    float roughness = min(1.0,.5+f0*f1);

    fragColor = uColor * vec4(color,.5*roughness);
}