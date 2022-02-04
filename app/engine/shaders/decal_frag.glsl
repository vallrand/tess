#pragma import(./template/decal_frag.glsl)

void main(){
#pragma import(./template/decal_uv_frag.glsl)
    vec4 color = vColor * texture(uDiffuseMap, uv);
#ifdef ALPHA_CUTOFF
    if(color.a < ALPHA_CUTOFF) discard;
#endif
    fragAlbedo = color;
#ifdef NORMAL_MAPPING
    vec3 dpdx = dFdx(worldPosition.xyz);
    vec3 dpdy = dFdy(worldPosition.xyz);
    vec3 normal = normalize(cross(dpdx, dpdy));
    vec3 binormal = normalize(dpdx);
    vec3 tangent = normalize(dpdy);
    mat3 TBN = mat3(tangent, binormal, normal);

    vec3 mappedNormal = texture(uNormalMap, uv).xyz*2.-1.;
    float blend = dot(mappedNormal, mappedNormal);
    mappedNormal = normalize(TBN * mappedNormal);
    fragNormal = blend * vec4(mappedNormal, 1.0);

#ifdef ALPHA_CUTOFF
    fragNormal.a=0.0;
#endif

#else
    fragNormal = vec4(0);
#endif

#ifdef MASK
    float alpha = texture(uNormalMap, uv).a;
    float threshold = smoothstep(1.0+uDissolveEdge,1.0,abs(alpha*2.-1.+vThreshold));
#ifdef ALPHA_CUTOFF
    if(color.a * threshold < ALPHA_CUTOFF) discard;
#endif
    fragAlbedo *= threshold;
    fragNormal *= threshold;
#endif
}


















//In any case, here are the shader snippets for when I construct the tangent space based on the depth buffer:

// These ones are hard-edges, but orientated to the scene geometry.
//float3 pixelNormal = normalize(cross(ddy(worldPosition), ddx(worldPosition)));
//float3x3 tbn = cotangent_frame(pixelNormal, worldPosition, decalTexCoord);

// So now we can sample from the normal map, and turn it into a world normal, which we then encode.
//float3 normal = mul(normalMap.xyz, tbn);
//normal = normalize(normal); // this is the worldspace normal

//and then:

// N is the vertex normal.
// uv is the texcoord for the decal.
// p is the worldspace position.
//float3x3 cotangent_frame(float3 N, float3 p, float2 uv)
//{
// get edge vectors of the pixel triangle
//float3 dp1 = ddx(p);
//float3 dp2 = ddy(p);
//float2 duv1 = ddx(uv);
//float2 duv2 = ddy(uv);

// solve the linear system
//float3 dp2perp = cross(dp2, N);
//float3 dp1perp = cross(N, dp1);
//float3 T = dp2perp * duv1.x + dp1perp * duv2.x;
//float3 B = dp2perp * duv1.y + dp1perp * duv2.y;

// construct a scale-invariant frame
//float invmax = rsqrt(max(dot(T,T), dot(B,B)));
//return float3x3(T * invmax, B * invmax, N);
//}