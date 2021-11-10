#pragma import(../../../engine/shaders/template/decal_frag.glsl)

float hash11(in float u){
    uint n = floatBitsToUint(u);
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & 0x7fffffffU)/float(0x7fffffff);
}

void main(){
#pragma import(../../../engine/shaders/template/decal_uv_frag.glsl)

    uv = uv*2.-1.;
    const float rings = 6.0;
    vec2 polar = vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
    polar.y = pow(polar.y,0.8);
    
    float radius = floor(polar.y * rings)/rings;
    float r0 = hash11(floor(polar.y * rings));
    polar.x = fract(polar.x + uTime.x * mix(-0.2,0.2,r0));
    float r1 = hash11(floor(polar.x * (2.+8.*r0*radius)));
    polar.x = fract(polar.x - uTime.x * mix(-0.1,0.1,r1));
    float r2 = hash11(floor(polar.x * (2.+32.*r1*radius)));
    
    float l = fract(polar.y * rings);
    
    float alpha = smoothstep(1.0,0.8,l+.6*r1);
    alpha *= smoothstep(0.0,0.2,l-.2*r2);
    alpha *= step(1.0 / rings, radius) * step(polar.y,1.0);
    alpha *= step(.5+.5*sin(polar.x*TAU*(2.0+r1*8.0)),0.9);
    alpha = alpha + 4.0 * alpha * (1.0-alpha);
    
    vec3 color = alpha * mix(vec3(0.4,0.2,1), vec3(1,0.2,0.4), r0);
    
    fragAlbedo = vColor * vec4(color, alpha);
    fragNormal = vec4(0,0,0,smoothstep(0.8,1.6,fragAlbedo.a));
}