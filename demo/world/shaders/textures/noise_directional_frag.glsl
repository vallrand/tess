#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/murmur.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec3 uv, in int octaves, in vec3 period){
    float total = 0.0, amplitude = 1.0;
    for(int i = 0; i < octaves; i++){
        total += .5*amplitude*noise3D(uv, period,0.);
        uv = uv*2.0 + 100.0 + uv.x;
        period *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

void main(){
    vec2 uv = vUV;
    vec3 scale = vec3(16.0, 4.0, 36.0);
    float f2 = fbm(uv.xyx*scale, 6, scale);
    scale = vec3(12.0, 8.0, 24.0);
    float f1 = fbm(uv.xyx*scale, 7, scale);

	fragColor = vec4(f1,f2,f1,f2);
}