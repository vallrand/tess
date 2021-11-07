#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

uniform vec2 uScale;
uniform vec4 uColor;

void main(){
    vec2 uv = vUV * uScale;

    float l3 = noise2D(512.0 * uv, 512. * uScale, 0.0);
    float l2 = noise2D(128.0 * uv, 128. * uScale, 0.0);
    float l1 = noise2D(32.0 * uv, 32. * uScale, 0.0);
    uv += 0.4*noise2D(16.0*uv.yx - l1 + 128.0, 16. * uScale, 0.0);
    float l0 = noise2D(8.0*uv,8. * uScale, 0.0);
    
    vec3 color = vec3(0.04,0.04,0.12)
    + vec3(0.63,0.55,0.42) * l0
    + vec3(0.2,0.1,0.1) * (1.0-l0*l1)
    + vec3(0.42,0.42,0.44) * l1
    + vec3(0.16,0.30,0.27) * l2
    + vec3(0.12,0.16,0.22) * (l3-1.0);
    color = 0.25 + 0.5 * color;

    float roughness = mix(0.8,1.0,color.g);
    fragColor = uColor * vec4(color,.5*roughness);
}