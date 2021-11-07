#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)
#pragma import(../../../engine/shaders/common/voronoi.glsl)

void main(){
    vec2 uv = 2.*vUV-1.;
    vec2 uvp = polar(uv);

    vec2 uv0 = vec2(max(0.5,pow(uvp.y,0.1)), uvp.x);
    uv0.x += 0.01 * abs(noise1D(uvp.x*40.0, 40.0, 0.0));
    vec4 w = voronoi(uv0, vec2(24,16), 0.6, 0.1, 0.0);
    float e0 = mix(.1, .0, pow(uvp.y, .1));
    float edge = smoothstep(e0+0.18, e0, w.x) * smoothstep(1.0,0.8,uvp.y);
#ifdef NORMAL_MAP
    float alpha = smoothstep(-0.5,2.0,2.0*uvp.y-edge*noise1D(uvp.x*32.0, 32.0, 0.0));
    float height = 1.0 - pow(edge, 4.0);
    float dhdx = dFdx(height);
    float dhdy = dFdy(height);
    vec3 normal = smoothstep(0.0,0.5,edge) * normalize(vec3(-dhdx, -dhdy, 1));
    fragColor = vec4(0.5+0.5*normal, alpha);
#else
    vec3 color = vec3(0.0);
    color = mix(color, vec3(0.15,0.10,0.20), edge);
    color = mix(color, vec3(0.30,0.20,0.40), smoothstep(0.7,1.0,edge));
    color = mix(color, vec3(1.00,0.20,0.50), smoothstep(0.9,1.0,edge));
    color = mix(color, vec3(1.20,0.80,1.00), smoothstep(0.99,1.0,edge));

    float alpha = mix(edge * edge, 0.0, smoothstep(0.95,1.0,edge));

    fragColor = vec4(color, alpha);
#endif
}