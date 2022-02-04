#pragma import(../../../engine/shaders/template/decal_frag.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float fbm(in vec2 x, in int octaves, in vec2 period) {
	float v = 0.0, a = 0.5, m = 0.0;
	vec2 shift = vec2(100);
    const mat2 rot = mat2(cos(0.4), sin(0.4), -sin(0.4), cos(0.4));
	for(int i = 0; i < octaves; ++i){
        m += a;
		v += a * noise2D(x * period, period, 0.0);
        x += shift;
        shift = rot * shift;
		a *= 0.5;
        period *= 2.0;
	}
	return v/m;
}

void main(){
#pragma import(../../../engine/shaders/template/decal_uv_frag.glsl)

    uv = uv*2.-1.;
    uv = vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
    
    float f0 = fbm(uv - .01*vec2(uTime.x,uTime.x), 2, vec2(10,4));
    f0 += smoothstep(0.4,.0,uv.y);
    f0 -= vThreshold;
    float f1 = fbm(uv + 0.5*f0 - vec2(uv.y - .1*uTime.x,0), 2, vec2(8,4));
    float f2 = fbm(uv + vec2(f1,f0), 2, vec2(12,6));
    f2 += smoothstep(0.4,.0,uv.y) + max(0.,f1-f0);
    
    f2 *= smoothstep(1.0,0.8,uv.y*(0.6+f1));

    vec4 color = vec4(0);
    color.rgb = mix(vec3(1.3,1.2,1.6), color.rgb, pow(smoothstep(.0,.9,f2),2.0));
    color.rgb += vec3(0.42,0.4,0.36) * pow(smoothstep(0., 1., f0*f2+f1*f0),2.0);
    color.rgb = mix(color.rgb, vec3(0.6,0,0.2)*f0, vThreshold);
    color.rgb *= pow(f1*f2*f0+f2, 2.0);    
    color.a = smoothstep(0.0,0.2,color.r);
    color *= smoothstep(1.0,0.5,uv.y);

#ifdef ALPHA_CUTOFF
    if(color.a < ALPHA_CUTOFF) discard;
#endif
    fragAlbedo = color;
    fragNormal = vec4(0,0,0, smoothstep(0.2,0.8,f2*f0));
}