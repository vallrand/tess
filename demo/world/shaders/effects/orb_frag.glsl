#pragma import(../../../engine/shaders/template/model_frag.glsl)

vec3 hash(vec3 p){
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise3D(in vec3 p){
    vec3 i = floor( p );
    vec3 f = fract( p );
	vec3 u = f*f*(3.0-2.0*f);
    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}
float fbm(in vec3 uv, in float period, in int layers){
    float f = 0.0, scale = 1.0;
    for(int i=0;i<layers;i++){
        f += scale * abs(noise3D(uv * period));
        scale *= 0.5;
        period *= 2.0;
        uv += f;
    }
    return f;
}

void main(){
    vec2 uv = vUV;
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - vPosition);
    float NdV = dot(normal, view);

    float n0 = fbm(vPosition + vec3(0,uTime.x,0), 1.6, 2);
    float n1 = fbm(vPosition - normal*n0*2.0 - 0.2*vec3(0,uTime.x,0), 2.6, 3);
    n0 = 2.0 * n0 * n0;
    n0 *= smoothstep(0.0,1.6,abs(NdV));
    n1 *= smoothstep(0.2,0.8,abs(NdV));

    vec4 color = vec4(0.01,0,0.02,0);
    color = mix(color, vec4(0.6,0.4,0.8,0.0), n1 * n1);
    color = mix(color, vec4(0.4,0.8,0.8,0.0), 2.0 * (1.0-n1) * n0);
    color = mix(color, vec4(0.08,0.32,0.22,0.2), min(8.0,0.04/n0-1.0));
    color.rgb = mix(color.grb, color.rgb, uColor.r);

    color *= 0.2+0.8*max(0.,dot(vec3(0,1,0),normal));

#ifdef TRANSPARENT
    fragColor = color * vColor;
#else
    float alpha = n1;
    const float uThresholdEdge = 0.25;
    float threshold = mix(1.0,-uThresholdEdge,uColor.a);
    color.rgb = mix(color.rgb, vec3(0.3,0.1,0.5), smoothstep(-uThresholdEdge,0.0,threshold - alpha));
    if(alpha <= threshold) discard; 
    const float metallic = 0.0;
    fragPosition = vec4(vPosition, uLayer);
    fragNormal = vec4(0,0,0, metallic);
    fragAlbedo = vec4(color.rgb,.5+.5*color.a);
#endif
}