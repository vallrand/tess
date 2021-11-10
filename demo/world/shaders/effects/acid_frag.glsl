#pragma import(../../../engine/shaders/template/decal_frag.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

void main(){
#pragma import(../../../engine/shaders/template/decal_uv_frag.glsl)

    float f0 = noise3D(worldPosition.xyz-uTime.x*vec3(0,2,0));
    float f1 = noise3D(worldPosition.xyz * 1.6 + (f0*2.-1.) - uTime.x*vec3(0,1,0));

    vec4 color = vec4(0.1,0,0.1,0.8);
    color += vec4(0.4,0.8,0.6,0.8) * smoothstep(0.0,1.0,f0);
    color += vec4(0.5,1.0,1.0,1.0) * smoothstep(0.5,1.0,f1);
    color *= smoothstep(0.5,0.2,length(objectPosition.xyz));
    color.rgb = mix(color.grb, color.rgb, vColor.r);
    color *= vColor.a;

#ifdef ALPHA_CUTOFF
    if(color.a < ALPHA_CUTOFF) discard;
#endif
    fragAlbedo = color;
    fragNormal = vec4(0,0,0, smoothstep(0.5,1.0,color.a));
}